window.BroadcastConnections = (() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const XLINK_NS = "http://www.w3.org/1999/xlink";

  function renderConnections({
    activeDrag,
    cableLayer,
    connections,
    deviceLayer,
    getAudioMarkers,
    getClassName,
    getLabel,
    signalColors,
    selectedConnectionIndex,
    workspace,
    worldHeight,
    worldWidth,
    zoom
  }) {
    const workspaceRect = workspace.getBoundingClientRect();
    cableLayer.setAttribute("viewBox", `0 0 ${worldWidth} ${worldHeight}`);
    cableLayer.innerHTML = "";

    connections.forEach((connection, index) => {
      const fromSocket = getSocketElement(deviceLayer, connection.from);
      const toSocket = getSocketElement(deviceLayer, connection.to);

      if (!fromSocket || !toSocket) {
        return;
      }

      addCable({
        audioMarkers: getAudioMarkers(connection),
        cableLayer,
        className: getClassName(connection),
        connectionIndex: index,
        end: getSocketAnchor(toSocket, workspaceRect, zoom),
        label: getLabel(connection),
        pathId: `cable-path-${index}`,
        selected: selectedConnectionIndex === index,
        signal: connection.signal,
        signalColors,
        start: getSocketAnchor(fromSocket, workspaceRect, zoom)
      });
    });

    if (activeDrag?.type === "cable") {
      addCable({
        audioMarkers: [],
        cableLayer,
        className: "is-preview",
        end: activeDrag.current,
        label: "",
        pathId: "cable-path-preview",
        signal: activeDrag.from.signal,
        signalColors,
        start: activeDrag.start
      });
    }
  }

  function getSocketElement(deviceLayer, socket) {
    return deviceLayer.querySelector(`[data-node-id="${socket.nodeId}"][data-port-id="${socket.portId}"]`);
  }

  function getSocketCenter(socket, workspaceRect, zoom) {
    const rect = socket.getBoundingClientRect();

    return {
      x: (rect.left - workspaceRect.left + rect.width / 2) / zoom,
      y: (rect.top - workspaceRect.top + rect.height / 2) / zoom
    };
  }

  function getSocketAnchor(socket, workspaceRect, zoom) {
    return {
      ...getSocketCenter(socket, workspaceRect, zoom),
      side: socket.dataset.direction === "output" ? 1 : -1
    };
  }

  function getCablePath(start, end, clampValue) {
    const clamp = clampValue ?? ((value, min, max) => Math.min(Math.max(value, min), max));
    const midX = start.x + (end.x - start.x) / 2;
    const midY = start.y + (end.y - start.y) / 2;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const verticalDistance = Math.abs(dy);
    const startSide = start.side ?? (dx >= 0 ? 1 : -1);
    const endSide = end.side ?? (dx >= 0 ? -1 : 1);
    const isForwardConnection = dx * startSide > 0;
    const isSimpleConnection = isForwardConnection && verticalDistance < 240;

    if (isSimpleConnection) {
      return {
        d: `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`,
        labelX: midX - 22,
        labelY: midY - 8
      };
    }

    const exitLength = clamp(Math.abs(dx) * 0.18, 44, 120);
    const startExitX = start.x + startSide * exitLength;
    const endEntryX = end.x + endSide * exitLength;

    return {
      d: [
        `M ${start.x} ${start.y}`,
        `C ${start.x + startSide * exitLength * 0.55} ${start.y}, ${startExitX} ${start.y + dy * 0.08}, ${startExitX} ${start.y + dy * 0.22}`,
        `C ${startExitX} ${midY}, ${endEntryX} ${midY}, ${endEntryX} ${end.y - dy * 0.22}`,
        `C ${endEntryX} ${end.y - dy * 0.08}, ${end.x + endSide * exitLength * 0.55} ${end.y}, ${end.x} ${end.y}`
      ].join(" "),
      labelX: midX - 22,
      labelY: midY - 8
    };
  }

  function addCable({
    audioMarkers = [],
    cableLayer,
    className,
    connectionIndex = null,
    end,
    label,
    pathId = "cable-path",
    selected = false,
    signal,
    signalColors,
    start
  }) {
    const cablePath = getCablePath(start, end);
    const hitPath = document.createElementNS(SVG_NS, "path");
    const path = document.createElementNS(SVG_NS, "path");
    const text = document.createElementNS(SVG_NS, "text");

    path.setAttribute("id", pathId);
    path.setAttribute("d", cablePath.d);
    path.style.stroke = signalColors[signal] ?? signalColors.SDI;
    if (className) {
      path.classList.add(className);
    }
    if (selected) {
      path.classList.add("is-selected");
    }

    if (connectionIndex !== null) {
      hitPath.setAttribute("d", cablePath.d);
      hitPath.classList.add("cable-hit-area");
      if (selected) {
        hitPath.classList.add("is-selected");
      }
      hitPath.dataset.connectionIndex = String(connectionIndex);
    }

    text.setAttribute("x", String(cablePath.labelX));
    text.setAttribute("y", String(cablePath.labelY));
    text.textContent = label;

    if (connectionIndex !== null) {
      cableLayer.append(hitPath);
    }
    cableLayer.append(path, text);

    audioMarkers.forEach((marker, index) => {
      addAudioNote(cableLayer, pathId, marker, index, audioMarkers.length);
    });
  }

  function addAudioNote(cableLayer, pathId, marker, index, markerCount) {
    const note = document.createElementNS(SVG_NS, "text");
    const motion = document.createElementNS(SVG_NS, "animateMotion");
    const mpath = document.createElementNS(SVG_NS, "mpath");
    const duration = markerCount > 1 ? 3.8 + index * 0.25 : 3.2;
    const begin = `${-index * 0.55}s`;

    note.classList.add("audio-note");
    if (marker.fading) {
      note.classList.add("is-fading");
    }
    note.style.color = marker.color;
    note.style.fill = marker.color;
    note.setAttribute("aria-label", marker.label);
    note.textContent = "♪";

    motion.setAttribute("dur", `${duration}s`);
    motion.setAttribute("begin", begin);
    motion.setAttribute("repeatCount", "indefinite");
    motion.setAttribute("rotate", "auto");
    mpath.setAttribute("href", `#${pathId}`);
    mpath.setAttributeNS(XLINK_NS, "xlink:href", `#${pathId}`);
    motion.append(mpath);
    note.append(motion);
    cableLayer.append(note);
  }

  function getSnapTarget({ deviceLayer, event, fromSocket, isValidConnection, snapDistance, workspace, zoom }) {
    const workspaceRect = workspace.getBoundingClientRect();
    const pointer = { x: event.clientX, y: event.clientY };
    const candidates = [...deviceLayer.querySelectorAll(`[data-action='socket']`)];
    let nearest = null;

    candidates.forEach((socketElement) => {
      const socket = getSocketData(socketElement);

      if (!isValidConnection(fromSocket, socket) && !isValidConnection(socket, fromSocket)) {
        return;
      }

      const rect = socketElement.getBoundingClientRect();
      const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      const distance = Math.hypot(pointer.x - center.x, pointer.y - center.y);

      if (distance > snapDistance || (nearest && distance >= nearest.distance)) {
        return;
      }

      nearest = {
        distance,
        socket: socketElement,
        anchor: getSocketAnchor(socketElement, workspaceRect, zoom)
      };
    });

    return nearest;
  }

  function getSocketData(socketButton) {
    return {
      nodeId: socketButton.dataset.nodeId,
      portId: socketButton.dataset.portId,
      direction: socketButton.dataset.direction,
      signal: socketButton.dataset.signal
    };
  }

  function createConnection({ connections, firstSocket, isValidConnection, recordUndoSnapshot, secondSocket }) {
    const from = firstSocket.direction === "output" ? firstSocket : secondSocket;
    const to = firstSocket.direction === "input" ? firstSocket : secondSocket;

    if (!isValidConnection(from, to)) {
      return false;
    }

    recordUndoSnapshot();
    connections.splice(0, connections.length, ...connections.filter((connection) => !(
      (connection.from.nodeId === from.nodeId && connection.from.portId === from.portId)
      || (connection.to.nodeId === to.nodeId && connection.to.portId === to.portId)
      || (connection.from.nodeId === to.nodeId && connection.from.portId === to.portId)
      || (connection.to.nodeId === from.nodeId && connection.to.portId === from.portId)
    )));
    connections.push({
      signal: from.signal,
      from: { nodeId: from.nodeId, portId: from.portId },
      to: { nodeId: to.nodeId, portId: to.portId }
    });

    return true;
  }

  function connectSockets({ firstSocket, isValidConnection, recordUndoSnapshot, render, secondSocket, state }) {
    const connected = createConnection({
      connections: state.connections,
      firstSocket,
      isValidConnection,
      recordUndoSnapshot,
      secondSocket
    });

    state.selectedSocket = null;

    if (connected) {
      state.selectedConnectionIndex = null;
    }

    render();
    return connected;
  }

  function selectConnection({ connectionIndex, render, state }) {
    if (!Number.isInteger(connectionIndex) || !state.connections[connectionIndex]) {
      return false;
    }

    state.selectedNodeId = null;
    state.selectedNodeIds = [];
    state.selectedSocket = null;
    state.selectedConnectionIndex = connectionIndex;
    render();
    return true;
  }

  function removeConnection({ connectionIndex, recordUndoSnapshot, render, state }) {
    if (!Number.isInteger(connectionIndex) || !state.connections[connectionIndex]) {
      return false;
    }

    recordUndoSnapshot();
    state.connections.splice(connectionIndex, 1);
    state.selectedConnectionIndex = null;
    render();
    return true;
  }

  function startCableDrag({ event, renderLines, setActiveDrag, socketButton, state, workspace, zoom }) {
    const workspaceRect = workspace.getBoundingClientRect();
    const start = getSocketAnchor(socketButton, workspaceRect, zoom);

    socketButton.setPointerCapture(event.pointerId);
    state.selectedSocket = null;
    state.selectedConnectionIndex = null;
    setActiveDrag({
      type: "cable",
      pointerId: event.pointerId,
      socketButton,
      from: getSocketData(socketButton),
      start,
      current: start
    });
    renderLines();
  }

  function updateCableDrag({
    activeDrag,
    deviceLayer,
    event,
    getWorkspacePoint,
    isValidConnection,
    renderLines,
    snapDistance,
    workspace,
    zoom
  }) {
    const snapTarget = getSnapTarget({
      deviceLayer,
      event,
      fromSocket: activeDrag.from,
      isValidConnection,
      snapDistance,
      workspace,
      zoom
    });

    activeDrag.snapTarget = snapTarget?.socket ?? null;
    activeDrag.current = snapTarget?.anchor ?? getWorkspacePoint(event);
    renderLines();
  }

  function endCableDrag({
    activeDrag,
    connectSockets,
    event,
    render,
    setActiveDrag,
    setSuppressNextSocketClick
  }) {
    const cableDrag = activeDrag;
    const dropTarget = cableDrag.snapTarget
      ?? document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-action='socket']");

    setActiveDrag(null);
    setSuppressNextSocketClick(true);

    if (dropTarget?.dataset.direction) {
      connectSockets(cableDrag.from, getSocketData(dropTarget));
    } else {
      render();
    }

    if (cableDrag.socketButton.hasPointerCapture(event.pointerId)) {
      cableDrag.socketButton.releasePointerCapture(event.pointerId);
    }
  }

  class ConnectionController {
    constructor({ callbacks, config, elements, state }) {
      this.callbacks = callbacks;
      this.config = config;
      this.elements = elements;
      this.state = state;
    }

    get activeDrag() {
      return this.callbacks.getActiveDrag();
    }

    get zoom() {
      return this.callbacks.getZoom();
    }

    render() {
      renderConnections({
        activeDrag: this.activeDrag,
        cableLayer: this.elements.cableLayer,
        connections: this.state.connections,
        deviceLayer: this.elements.deviceLayer,
        getAudioMarkers: this.callbacks.getAudioMarkers,
        getClassName: this.callbacks.getClassName,
        getLabel: this.callbacks.getLabel,
        signalColors: this.config.signalColors,
        selectedConnectionIndex: this.state.selectedConnectionIndex,
        workspace: this.elements.workspace,
        worldHeight: this.config.worldHeight,
        worldWidth: this.config.worldWidth,
        zoom: this.zoom
      });
    }

    getSocketData(socketButton) {
      return getSocketData(socketButton);
    }

    connectSockets(firstSocket, secondSocket) {
      return connectSockets({
        firstSocket,
        isValidConnection: this.callbacks.isValidConnection,
        recordUndoSnapshot: this.callbacks.recordUndoSnapshot,
        render: this.callbacks.render,
        secondSocket,
        state: this.state
      });
    }

    selectConnection(connectionIndex) {
      return selectConnection({
        connectionIndex,
        render: this.callbacks.render,
        state: this.state
      });
    }

    removeConnection(connectionIndex) {
      return removeConnection({
        connectionIndex,
        recordUndoSnapshot: this.callbacks.recordUndoSnapshot,
        render: this.callbacks.render,
        state: this.state
      });
    }

    startCableDrag(event, socketButton) {
      startCableDrag({
        event,
        renderLines: this.callbacks.renderLines,
        setActiveDrag: this.callbacks.setActiveDrag,
        socketButton,
        state: this.state,
        workspace: this.elements.workspace,
        zoom: this.zoom
      });
    }

    updateCableDrag(event) {
      updateCableDrag({
        activeDrag: this.activeDrag,
        deviceLayer: this.elements.deviceLayer,
        event,
        getWorkspacePoint: this.callbacks.getWorkspacePoint,
        isValidConnection: this.callbacks.isValidConnection,
        renderLines: this.callbacks.renderLines,
        snapDistance: this.config.snapDistance,
        workspace: this.elements.workspace,
        zoom: this.zoom
      });
    }

    endCableDrag(event) {
      endCableDrag({
        activeDrag: this.activeDrag,
        connectSockets: (firstSocket, secondSocket) => this.connectSockets(firstSocket, secondSocket),
        event,
        render: this.callbacks.render,
        setActiveDrag: this.callbacks.setActiveDrag,
        setSuppressNextSocketClick: this.callbacks.setSuppressNextSocketClick
      });
    }
  }

  return {
    ConnectionController,
    connectSockets,
    createConnection,
    endCableDrag,
    getSnapTarget,
    getSocketAnchor,
    getSocketData,
    removeConnection,
    renderConnections,
    selectConnection,
    startCableDrag,
    updateCableDrag
  };
})();
