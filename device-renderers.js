(function () {
  class DeviceRenderer {
    constructor({ callbacks, config, state }) {
      this.callbacks = callbacks;
      this.config = config;
      this.state = state;
      this.icons = {
        edit: `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
          </svg>
        `,
        remove: `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        `
      };
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
          ${this.renderPortActivityLeds(node)}
          <div class="node-header drag-handle">
            <div>
              <p class="node-kicker">${node.kicker}</p>
              <h2>${node.title}</h2>
            </div>
            <div class="node-actions ${this.state.readOnly ? "is-hidden" : ""}">
              ${node.type === "switcher" ? this.renderSwitcherModeButton(node) : ""}
              <button class="small-button icon-button" type="button" data-action="edit-node" data-node-id="${node.id}" title="Bearbeiten" aria-label="Bearbeiten">
                ${this.icons.edit}
              </button>
              <button class="small-button icon-button danger" type="button" data-action="remove-node" data-node-id="${node.id}" title="Entfernen" aria-label="Entfernen">
                ${this.icons.remove}
              </button>
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
      if (node.type === "camera") {
        return `
          <div class="monitor-screen">
            <button class="camera-preview" type="button" data-action="cycle-source-view" data-node-id="${node.id}">
              ${this.renderSourcePreview(node)}
            </button>
          </div>
          <div class="monitor-footer">
            <span class="record-dot"></span>
            <span>${node.shortName} · ${this.getSourceViewLabel(node)}</span>
          </div>
        `;
      }

      if (this.callbacks.isDisplaySourceNode(node)) {
        return `
          <button class="source-visual" type="button" data-action="cycle-source-view" data-node-id="${node.id}">
            ${this.renderSourcePreview(node)}
          </button>
          <div class="node-meta">
            <span>${node.shortName}</span>
            <button class="small-button ${this.state.readOnly ? "is-hidden" : ""}" type="button" data-action="random-media" data-node-id="${node.id}">Random</button>
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

      if (node.type === "ptzController") {
        return this.renderPtzController(node);
      }

      if (node.type === "networkSwitch") {
        return `
          <div class="simple-device-face network-switch-face" style="min-height: ${node.portCount * node.portColumnPitch}px">PoE Switch<br>${node.portCount}-Port</div>
          <div class="node-meta">
            <span>${node.portCount}x RJ45 / PoE</span>
            <span>Alle Buchsen frei koppelbar</span>
          </div>
        `;
      }

      if (node.type === "wirelessReceiver") {
        return this.renderRodeReceiver(node);
      }

      if (node.type === "wirelessTransmitter") {
        return this.renderRodeTransmitter(node);
      }

      return `
        <div class="simple-device-face">${node.title}</div>
        <div class="node-meta">
          <span>${node.inputs.length} In / ${node.outputs.length} Out</span>
          <span>${node.inputs[0]?.signal ?? node.outputs[0]?.signal ?? "Gear"}</span>
        </div>
      `;
    }

    renderPtzController(node) {
      const isFly = node.variant === "fly";
      const cameraButtons = Array.from({ length: isFly ? 6 : 9 }, (_, index) => index + 1);
      const topControls = isFly
        ? ["Auto", "Face", "Track", "Speed"]
        : ["Exp", "WB", "Color", "Image", "Select"];
      const presetButtons = isFly
        ? []
        : Array.from({ length: 10 }, (_, index) => index + 1);

      const joystick = node.joystick ?? { x: 0, y: 0 };

      return `
        <div class="ptz-panel ${isFly ? "is-fly" : "is-pro"}" style="--ptz-joy-x: ${joystick.x ?? 0}; --ptz-joy-y: ${joystick.y ?? 0};">
          <div class="ptz-brand">SKAARHOJ</div>
          <div class="ptz-display">
            <span>${isFly ? "PTZ Fly" : "PTZ Pro"}</span>
            <strong>CAM ${node.selectedCamera ?? 1}</strong>
            <em>PoE / LAN</em>
          </div>
          <div class="ptz-joystick"
            data-action="move-ptz-joystick"
            data-node-id="${node.id}"
            role="slider"
            aria-label="Joystick X ${Math.round((joystick.x ?? 0) * 100)} Y ${Math.round((joystick.y ?? 0) * 100)}"
            aria-valuemin="-100"
            aria-valuemax="100"
            aria-valuenow="${Math.round(Math.hypot(joystick.x ?? 0, joystick.y ?? 0) * 100)}"
            tabindex="0">
            <span></span>
          </div>
          <div class="ptz-encoders">
            ${topControls.map((label, index) => `
              <div class="ptz-encoder">
                <span class="ptz-knob ptz-ring-${index + 1}"></span>
                <small>${label}</small>
              </div>
            `).join("")}
          </div>
          ${presetButtons.length ? `
            <div class="ptz-preset-grid">
              ${presetButtons.map((number) => `
                <button class="ptz-small-key" type="button">${number}</button>
              `).join("")}
            </div>
          ` : ""}
          <div class="ptz-camera-row">
            ${cameraButtons.map((number) => {
              const active = Number(node.selectedCamera ?? 1) === number;
              return `
                <button class="ptz-camera-key ${active ? "is-active" : ""}"
                  type="button"
                  data-action="select-ptz-camera"
                  data-node-id="${node.id}"
                  data-camera="${number}">
                  <span>Cam ${number}</span>
                  <strong>${number}</strong>
                </button>
              `;
            }).join("")}
          </div>
        </div>
        <div class="node-meta">
          <span>PoE Controller</span>
          <span>CAM ${node.selectedCamera ?? 1}</span>
        </div>
      `;
    }

    renderRodeReceiver(node) {
      const channels = [
        { num: 1, portId: "wireless-in-1" },
        { num: 2, portId: "wireless-in-2" }
      ];

      const channelBars = channels.map(({ num, portId }) => {
        const active = this.callbacks.isPortConnected(node.id, portId);
        const meter = active ? this.callbacks.getWirelessChannelMeter(num) : null;
        const style = meter
          ? `--level: ${meter.percent}%; --level-low: ${meter.range.low}%; --level-high: ${meter.range.high}%`
          : "";

        return `
          <div class="rode-channel">
            <span class="rode-channel-num">${num}</span>
            <span class="rode-signal-bar ${active ? "is-active" : ""}">
              <i style="${style}"></i>
            </span>
          </div>
        `;
      }).join("");

      return `
        <div class="rode-panel is-receiver">
          <span class="rode-dot"></span>
          <div class="rode-wordmark">RØDE</div>
          <div class="rode-screen">${channelBars}</div>
          <div class="rode-model">WIRELESS <strong>GO</strong> II</div>
        </div>
        <div class="node-meta">
          <span>Funkempfänger</span>
          <span>2x Kanal</span>
        </div>
      `;
    }

    renderRodeTransmitter(node) {
      return `
        <div class="rode-panel is-transmitter">
          <span class="rode-clip"></span>
          <span class="rode-dot"></span>
          <div class="rode-wordmark">RØDE</div>
          <div class="rode-model">WIRELESS <strong>GO</strong> II</div>
        </div>
        <div class="node-meta">
          <span>Funkmikrofon</span>
          <span>Wireless Out</span>
        </div>
      `;
    }

    renderSourcePreview(node) {
      const mode = this.callbacks.normalizeSourceViewMode(node);

      if (mode === "media" && node.media && node.media.kind !== "file") {
        if (this.callbacks.isPtzPanoramaSource?.(node)) {
          return this.callbacks.renderPtzPanoramaPicture(node);
        }

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
        const position = port.topPx !== undefined ? `top: ${port.topPx}px;` : `top: ${port.top}%;`;

        return `
          <button class="socket is-${direction} ${selected ? "is-selected" : ""}"
            type="button"
            data-action="socket"
            data-node-id="${node.id}"
            data-port-id="${port.id}"
            data-direction="${direction}"
            data-signal="${port.signal}"
            style="${position} --socket-color: ${this.config.signalColors[port.signal] ?? this.config.signalColors.SDI}"
            title="${port.label} (${port.signal})">
            <span class="socket-label">${port.label}</span>
          </button>
        `;
      }).join("");
    }

    // PoE switches show a small flickering link/activity LED next to any port
    // that has a cable plugged in, mimicking a real switch's port lights.
    renderPortActivityLeds(node) {
      if (node.type !== "networkSwitch") {
        return "";
      }

      return node.inputs
        .filter((port) => this.callbacks.isPortConnected(node.id, port.id))
        .map((port) => {
          const duration = (0.9 + Math.random() * 1.3).toFixed(2);
          const delay = (Math.random() * 2).toFixed(2);

          return `
            <span class="port-activity-led"
              style="top: ${port.topPx}px; animation-duration: ${duration}s; animation-delay: -${delay}s;"
              aria-hidden="true"></span>
          `;
        }).join("");
    }
  }

  window.BroadcastDeviceRenderers = {
    DeviceRenderer
  };
})();
