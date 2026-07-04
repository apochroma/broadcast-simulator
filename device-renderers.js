(function () {
  class DeviceRenderer {
    constructor({ callbacks, config, state }) {
      this.callbacks = callbacks;
      this.config = config;
      this.state = state;
    }

    renderNode(node) {
      this.callbacks.ensureMonitorLoopOutputs(node);
      this.callbacks.ensureSourceIdentity(node);
      if (node.type === "switcher") {
        this.callbacks.ensureSwitcherMediaPools(node);
      }

      const activeSwitcher = this.callbacks.getActiveSwitcher();
      const programSource = this.callbacks.getSwitcherProgramSource(activeSwitcher);
      const previewSource = this.callbacks.getSwitcherPreviewSource(activeSwitcher);
      const classes = [
        "node",
        node.type,
        node.isTransitioning ? "is-transitioning" : "",
        node.isFadingToBlack ? "is-fading-to-black" : "",
        node.isFadeToBlackActive ? "is-fade-to-black-active" : "",
        node.cutFlashing ? "is-cut-flashing" : "",
        this.callbacks.isNodeSelected(node.id) ? "is-selected" : "",
        programSource?.id === node.id ? "is-program" : "",
        previewSource?.id === node.id ? "is-preview" : ""
      ].filter(Boolean).join(" ");

      return `
        <article class="${classes}"
          data-node-id="${node.id}"
          style="width: ${node.width}px; transform: translate(${node.position.x}px, ${node.position.y}px); --transition-duration: ${this.callbacks.getSwitcherTransitionDurationMs(node)}ms">
          ${this.renderSockets(node, "input")}
          ${this.renderSockets(node, "output")}
          <div class="node-header drag-handle">
            <div>
              <p class="node-kicker">${node.kicker}</p>
              <h2>${node.title}</h2>
            </div>
            <div class="node-actions ${this.state.readOnly ? "is-hidden" : ""}">
              ${node.type === "switcher" ? this.renderSwitcherModeButton(node) : ""}
              <button class="small-button" type="button" data-action="edit-node" data-node-id="${node.id}">Bearbeiten</button>
              <button class="small-button danger" type="button" data-action="remove-node" data-node-id="${node.id}">Entfernen</button>
            </div>
          </div>
          <div class="node-body">
            ${this.renderNodeBody(node)}
          </div>
        </article>
      `;
    }

    renderSwitcherModeButton(switcher) {
      const isCutBus = this.callbacks.getSwitcherBusMode(switcher) === "cutBus";
      const label = isCutBus ? "CUT-Bus" : "PGM/PRV";

      return `
        <button class="small-button switcher-mode-button ${isCutBus ? "is-cut-bus" : ""}"
          type="button"
          data-action="toggle-switcher-bus-mode"
          data-node-id="${switcher.id}">
          ${label}
        </button>
      `;
    }

    renderNodeBody(node) {
      if (this.callbacks.isDisplaySourceNode(node)) {
        return `
          <button class="source-visual" type="button" data-action="cycle-source-view" data-node-id="${node.id}">
            ${this.renderSourcePreview(node)}
          </button>
          <div class="node-meta">
            <span>${node.shortName}</span>
            ${node.type === "computer"
              ? `<button class="small-button ${this.state.readOnly ? "is-hidden" : ""}" type="button" data-action="random-media" data-node-id="${node.id}">Random</button>`
              : `<span>${this.getSourceViewLabel(node)}</span>`}
          </div>
        `;
      }

      if (node.type === "switcher") {
        return `
          <div class="simple-device-face switcher-title-face">${node.title}</div>
          <div class="switcher-display">
            <span>Program / Preview</span>
            <strong>${this.callbacks.getSwitcherReadout(node)}</strong>
          </div>
          ${this.callbacks.renderSwitcherPanel(node)}
        `;
      }

      if (node.type === "splitter") {
        const source = this.callbacks.resolveNodeInputSource(node, "input-1");
        return `
          <div class="simple-device-face splitter-face">HDMI<br>1 x 5</div>
          <div class="node-meta">
            <span>${node.inputs.length} In / ${node.outputs.length} Out</span>
            <span>${source ? source.shortName : "No Signal"}</span>
          </div>
        `;
      }

      if (node.type === "monitor") {
        return `
          <div class="monitor-screen">
            ${this.callbacks.renderMonitorPicture(node)}
          </div>
          <div class="monitor-footer">
            <span class="record-dot"></span>
            <span>${this.callbacks.getMonitorLabel(node)}</span>
          </div>
        `;
      }

      return `
        <div class="simple-device-face">${node.title}</div>
        <div class="node-meta">
          <span>${node.inputs.length} In / ${node.outputs.length} Out</span>
          <span>${node.inputs[0]?.signal ?? node.outputs[0]?.signal ?? "Gear"}</span>
        </div>
      `;
    }

    renderSourcePreview(node) {
      const mode = this.callbacks.normalizeSourceViewMode(node);

      if (mode === "media" && node.media && node.media.kind !== "file") {
        return this.callbacks.renderMediaSurface(node);
      }

      if (mode === "product") {
        return this.renderSourceProductPicture(node);
      }

      return this.renderSourceColorPicture(node);
    }

    renderSourceColorPicture(node) {
      return `
        <div class="test-picture source-color-picture" style="background: ${node.pattern ?? this.config.sourceFallbackColor}">
          <span>${node.title}</span>
        </div>
      `;
    }

    renderSourceProductPicture(node) {
      if (node.image) {
        return `<img class="source-product-image" src="${node.image}" alt="${node.title}">`;
      }

      return `
        <div class="source-product-face">
          <strong>${node.title}</strong>
          <span>${node.kicker}</span>
        </div>
      `;
    }

    getSourceViewLabel(node) {
      const mode = this.callbacks.normalizeSourceViewMode(node);

      if (mode === "media") {
        return node.media?.name ?? "Medium";
      }

      if (mode === "product") {
        return node.type === "camera" ? "Kamerabild" : "Gerätebild";
      }

      return "Farbe";
    }

    renderSockets(node, direction) {
      const ports = node[`${direction}s`] ?? [];

      return ports.map((port) => {
        const selected = this.state.selectedSocket
          && this.state.selectedSocket.nodeId === node.id
          && this.state.selectedSocket.portId === port.id;

        return `
          <button class="socket is-${direction} ${selected ? "is-selected" : ""}"
            type="button"
            data-action="socket"
            data-node-id="${node.id}"
            data-port-id="${port.id}"
            data-direction="${direction}"
            data-signal="${port.signal}"
            style="top: ${port.top}%; --socket-color: ${this.config.signalColors[port.signal] ?? this.config.signalColors.SDI}"
            title="${port.label} (${port.signal})">
            <span class="socket-label">${port.label}</span>
          </button>
        `;
      }).join("");
    }
  }

  window.BroadcastDeviceRenderers = {
    DeviceRenderer
  };
})();
