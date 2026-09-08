(function () {
  const STREAM_DECK_EXPOSURE_MODE_LABELS = { fullauto: "Full Auto", manual: "Manual", scene: "Scene" };
  const STREAM_DECK_METERING_MODE_LABELS = { center: "Center", spotlight: "Spotlight", backlight: "Backlight" };
  const STREAM_DECK_TOGGLE_MODE_LABELS = { auto: "Auto", manual: "Manual" };
  const STREAM_DECK_FLICKER_LABELS = { auto: "Auto", off: "Off" };
  const STREAM_DECK_WB_MODE_LABELS = { auto: "Auto", manual: "Manual", kelvin: "Kelvin", daylight: "Daylight", tungsten: "Tungsten", wb_a: "WB A", wb_b: "WB B" };

  const ANNOTATION_COLOR_PALETTE = ["#4cc9f0", "#f72585", "#ffd60a", "#35d07f", "#ff8c42", "#9b5de5", "#e7edf4", "#4a5568"];
  const TEXT_COLOR_PALETTE = ["#f4f6f8", "#4cc9f0", "#f72585", "#ffd60a", "#35d07f", "#ff8c42"];

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

      // No card, no header, no discrete ports — just the cloud shape itself,
      // which cables snap onto anywhere along its outline (see
      // connections.js). Bypasses the whole card/socket machinery below.
      if (node.type === "internetCloud") {
        return this.renderInternetCloudNode(node);
      }

      // Freeform annotation tools (colored group shapes, text notes) skip
      // the whole card/header/socket machinery below — they carry their own
      // width AND height, a resize handle, and no ports at all.
      if (node.type === "shapeAnnotation") {
        return this.renderShapeAnnotationNode(node);
      }

      if (node.type === "textAnnotation") {
        return this.renderTextAnnotationNode(node);
      }

      if (node.type === "strokeAnnotation") {
        return this.renderStrokeAnnotationNode(node);
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

      // The camera's "housing" (title/footer chrome, everything except the
      // physical connector sockets, which must stay put for cable routing)
      // visually flips 180° when the operator has mounted the camera upside
      // down and enabled the erotate correction — see the cameraRotate180
      // action below and renderNodeBody's camera branch, which nests a
      // counter-rotated wrapper around just the video content so the picture
      // itself still reads normally despite the housing being flipped.
      const housingRotationDeg = node.type === "camera" && node.rotated180 ? 180 : 0;

      return `
        <article class="${classes}"
          data-node-id="${node.id}"
          style="width: ${node.width}px; transform: translate(${node.position.x}px, ${node.position.y}px) rotate(${node.rotation ?? 0}deg); --transition-duration: ${this.callbacks.getSwitcherTransitionDurationMs(node)}ms">
          ${this.renderSockets(node, "input")}
          ${this.renderSockets(node, "output")}
          ${this.renderPortActivityLeds(node)}
          <div class="node-housing" style="transform: rotate(${housingRotationDeg}deg);">
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
          </div>
        </article>
      `;
    }

    // Chromeless: no header bar, no bordered card, no visible sockets — the
    // cloud shape itself is the whole node. The gear/remove buttons float
    // over it, revealed on hover/selection only (see CSS), and the shape
    // itself is the drag handle. The path carries the "internet-cloud-
    // contour" class connections.js queries for at drag-snap and render time.
    renderInternetCloudNode(node) {
      const classes = [
        "node",
        "internetCloud",
        "is-chromeless",
        this.callbacks.isNodeSelected(node.id) ? "is-selected" : ""
      ].filter(Boolean).join(" ");

      return `
        <article class="${classes}"
          data-node-id="${node.id}"
          style="width: ${node.width}px; transform: translate(${node.position.x}px, ${node.position.y}px) rotate(${node.rotation ?? 0}deg);">
          <div class="internet-cloud-shape drag-handle">
            <svg viewBox="0 0 24 24" class="internet-cloud-icon" aria-hidden="true">
              <path class="internet-cloud-contour" d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
            </svg>
            <span class="internet-cloud-label">INTERNET</span>
          </div>
          <div class="internet-cloud-actions ${this.state.readOnly ? "is-hidden" : ""}">
            <button class="small-button icon-button" type="button" data-action="edit-node" data-node-id="${node.id}" title="Bearbeiten" aria-label="Bearbeiten">
              ${this.icons.edit}
            </button>
            <button class="small-button icon-button danger" type="button" data-action="remove-node" data-node-id="${node.id}" title="Entfernen" aria-label="Entfernen">
              ${this.icons.remove}
            </button>
          </div>
        </article>
      `;
    }

    renderAnnotationColorSwatches(node, palette) {
      return palette.map((color) => `
        <button class="annotation-color-swatch ${node.color === color ? "is-active" : ""}" type="button"
          style="background: ${color};" data-action="set-annotation-color" data-node-id="${node.id}" data-color="${color}"
          title="${color}" aria-label="Farbe ${color}"></button>
      `).join("");
    }

    // Chromeless colored group shape (rect/circle/triangle): no header, no
    // sockets — just a semi-transparent fill behind whatever devices sit on
    // or inside it (see the low z-index in CSS), a resize handle at the
    // bottom-right corner, and a hover-revealed color palette + remove
    // button. Dragging groups along any device whose center falls inside
    // its bounds (computed at drag-start in app.js, not here).
    renderShapeAnnotationNode(node) {
      const classes = [
        "node",
        "shapeAnnotation",
        "is-chromeless",
        `shape-kind-${node.shapeKind}`,
        this.callbacks.isNodeSelected(node.id) ? "is-selected" : ""
      ].filter(Boolean).join(" ");

      return `
        <article class="${classes}"
          data-node-id="${node.id}"
          style="width: ${node.width}px; height: ${node.height}px; transform: translate(${node.position.x}px, ${node.position.y}px) rotate(${node.rotation ?? 0}deg);">
          <div class="shape-annotation-fill drag-handle" style="--shape-color: ${node.color};"></div>
          <div class="shape-annotation-actions ${this.state.readOnly ? "is-hidden" : ""}">
            <div class="annotation-color-swatches">${this.renderAnnotationColorSwatches(node, ANNOTATION_COLOR_PALETTE)}</div>
            <button class="small-button icon-button danger" type="button" data-action="remove-node" data-node-id="${node.id}" title="Entfernen" aria-label="Entfernen">
              ${this.icons.remove}
            </button>
          </div>
          ${this.state.readOnly ? "" : `<div class="annotation-resize-handle" data-action="resize-annotation" data-node-id="${node.id}" title="Größe ändern"></div>`}
        </article>
      `;
    }

    // Chromeless free text note: a plain textarea (committing on blur/change,
    // like every other text field in this app, so re-renders don't fight
    // the caret mid-keystroke), a small drag handle since the textarea
    // itself needs normal click/drag-to-select behavior, and the same
    // color-palette + resize-handle treatment as the shapes above.
    renderTextAnnotationNode(node) {
      const classes = [
        "node",
        "textAnnotation",
        "is-chromeless",
        this.callbacks.isNodeSelected(node.id) ? "is-selected" : ""
      ].filter(Boolean).join(" ");

      return `
        <article class="${classes}"
          data-node-id="${node.id}"
          style="width: ${node.width}px; transform: translate(${node.position.x}px, ${node.position.y}px) rotate(${node.rotation ?? 0}deg);">
          <div class="text-annotation-handle drag-handle" title="Verschieben" aria-hidden="true">&#10021;</div>
          <textarea class="text-annotation-input" data-action="set-annotation-text" data-node-id="${node.id}"
            style="color: ${node.color};" placeholder="Text eingeben" ${this.state.readOnly ? "disabled" : ""}
            rows="1">${escapeHtml(node.text ?? "")}</textarea>
          <div class="text-annotation-actions ${this.state.readOnly ? "is-hidden" : ""}">
            <div class="annotation-color-swatches">${this.renderAnnotationColorSwatches(node, TEXT_COLOR_PALETTE)}</div>
            <button class="small-button icon-button danger" type="button" data-action="remove-node" data-node-id="${node.id}" title="Entfernen" aria-label="Entfernen">
              ${this.icons.remove}
            </button>
          </div>
          ${this.state.readOnly ? "" : `<div class="annotation-resize-handle" data-action="resize-annotation" data-node-id="${node.id}" title="Breite ändern"></div>`}
        </article>
      `;
    }

    // Chromeless freehand pencil mark, folded into the same node model as
    // the shapes/text above purely so it gets their drag/resize/rotate/
    // delete machinery for free. The transparent hit-area (not the thin
    // path itself) is the drag handle, since grabbing a 2px line precisely
    // would be unusable. The <path>'s own "d" and the inner <svg>'s viewBox
    // are both fixed at the size the stroke was drawn at (node.pointsWidth/
    // pointsHeight) — resizing only changes the OUTER box (node.width/
    // height, via the shared resize handle in app.js), and the SVG's normal
    // viewBox-vs-viewport scaling stretches the fixed drawing to fill it,
    // so no point math is needed here or on every resize step.
    renderStrokeAnnotationNode(node) {
      const classes = [
        "node",
        "strokeAnnotation",
        "is-chromeless",
        this.callbacks.isNodeSelected(node.id) ? "is-selected" : ""
      ].filter(Boolean).join(" ");

      return `
        <article class="${classes}"
          data-node-id="${node.id}"
          style="width: ${node.width}px; height: ${node.height}px; transform: translate(${node.position.x}px, ${node.position.y}px) rotate(${node.rotation ?? 0}deg);">
          <div class="stroke-annotation-hit drag-handle" title="Verschieben"></div>
          <svg class="stroke-annotation-svg" viewBox="0 0 ${node.pointsWidth} ${node.pointsHeight}" preserveAspectRatio="none" aria-hidden="true">
            <path d="${pointsToPathD(node.points)}" stroke="${node.color}" stroke-width="${node.strokeThickness}"></path>
          </svg>
          <div class="shape-annotation-actions ${this.state.readOnly ? "is-hidden" : ""}">
            <div class="annotation-color-swatches">${this.renderAnnotationColorSwatches(node, ANNOTATION_COLOR_PALETTE)}</div>
            <button class="small-button icon-button danger" type="button" data-action="remove-node" data-node-id="${node.id}" title="Entfernen" aria-label="Entfernen">
              ${this.icons.remove}
            </button>
          </div>
          ${this.state.readOnly ? "" : `<div class="annotation-resize-handle" data-action="resize-annotation" data-node-id="${node.id}" title="Größe ändern"></div>`}
          ${this.state.readOnly ? "" : `<div class="annotation-rotate-handle" data-action="rotate-annotation" data-node-id="${node.id}" title="Frei drehen"></div>`}
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
        // Counter-rotates the actual video content relative to the housing
        // flip above: the erotate correction on the real camera means the
        // *signal* looks normal again despite the physical mount being
        // upside down, so this wrapper cancels the housing's 180° out for
        // the picture only — title/footer text stays flipped as the visual
        // "this camera is inverted" tell, the image itself doesn't.
        const compensateDeg = node.rotated180 ? 180 : 0;

        // Network config stays tucked away behind a fold-out toggle rather
        // than always-on fields, so the card is exactly as compact as before
        // for anyone who doesn't need it.
        const networkOpen = Boolean(node.networkPanelOpen);

        return `
          <div class="monitor-screen">
            <button class="camera-preview" type="button" data-action="cycle-source-view" data-node-id="${node.id}">
              <div class="source-rotated-180-compensate" style="transform: rotate(${compensateDeg}deg);">
                ${this.renderSourcePreview(node)}
              </div>
            </button>
          </div>
          <div class="monitor-footer">
            <span class="monitor-footer-info">
              <span class="record-dot"></span>
              <span>${node.shortName} · ${this.getSourceViewLabel(node)}</span>
            </span>
            ${this.renderDeviceNetworkToggle(node)}
          </div>
          ${networkOpen ? this.renderDeviceNetworkPanel(node) : ""}
        `;
      }

      if (this.callbacks.isDisplaySourceNode(node)) {
        const networkOpen = Boolean(node.networkPanelOpen);

        return `
          <button class="source-visual" type="button" data-action="cycle-source-view" data-node-id="${node.id}">
            ${this.renderSourcePreview(node)}
          </button>
          <div class="node-meta">
            <span>${node.shortName}</span>
            <button class="small-button ${this.state.readOnly ? "is-hidden" : ""}" type="button" data-action="random-media" data-node-id="${node.id}">Random</button>
            ${this.renderDeviceNetworkToggle(node)}
          </div>
          ${networkOpen ? this.renderDeviceNetworkPanel(node) : ""}
        `;
      }

      if (node.type === "switcher") {
        const networkOpen = Boolean(node.networkPanelOpen);

        return `
          <div class="simple-device-face switcher-title-face">
            <span>${node.title}</span>
            ${this.renderDeviceNetworkToggle(node)}
          </div>
          <div class="switcher-display">
            <span>Program / Preview</span>
            <strong>${this.callbacks.getSwitcherReadout(node)}</strong>
          </div>
          ${networkOpen ? this.renderDeviceNetworkPanel(node) : ""}
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
        `;
      }

      if (node.type === "poeInjector") {
        return this.renderPoeInjectorPanel(node);
      }

      if (node.type === "networkGateway" || node.type === "router") {
        const isRouter = node.type === "router";

        return `
          <div class="simple-device-face network-gateway-face">
            ${this.renderNetworkGatewayIpRow(node, "ipAddress", "IP")}
            ${this.renderNetworkGatewayIpRow(node, "subnetMask", "Subnet")}
            ${this.renderNetworkGatewayIpRow(node, "gatewayAddress", "Gateway")}
            ${this.renderNetworkGatewayDhcpRow(node)}
          </div>
          <div class="node-meta">
            <span>${isRouter ? "Router" : "Router / Gateway"}</span>
            <span>${isRouter ? "1x WAN &middot; 3x LAN &middot; 1x Internet" : "1x WAN &middot; 4x LAN"}</span>
          </div>
        `;
      }

      if (node.type === "wirelessReceiver") {
        return this.renderRodeReceiver(node);
      }

      if (node.type === "wirelessTransmitter") {
        return this.renderRodeTransmitter(node);
      }

      if (node.type === "videoWirelessTransmitter") {
        const source = this.callbacks.resolveNodeInputSource(node, "hdmi-in");
        return `
          <div class="simple-device-face teradek-face is-transmitter">TERADEK<br>ACE 500 TX</div>
          <div class="node-meta">
            <span>Funksender Video</span>
            <span>${source ? source.shortName : "No Signal"}</span>
          </div>
        `;
      }

      if (node.type === "videoWirelessReceiver") {
        const source = this.callbacks.resolveTeradekReceiverSource(node);
        return `
          <div class="simple-device-face teradek-face is-receiver">TERADEK<br>ACE 500 RX</div>
          <div class="node-meta">
            <span>Funkempfänger Video</span>
            <span>${source ? source.shortName : "No Signal"}</span>
          </div>
        `;
      }

      if (node.type === "converter") {
        return this.renderMicroConverter(node);
      }

      if (node.type === "audioRecorder") {
        return this.renderAudioRecorderPanel(node);
      }

      if (node.type === "microphone") {
        return this.renderMicrophonePanel(node);
      }

      if (node.type === "streamDeckXL") {
        const networkOpen = Boolean(node.networkPanelOpen);

        return `
          ${this.renderStreamDeckXLPanel(node)}
          <div class="node-meta streamdeck-network-row">
            ${this.renderDeviceNetworkToggle(node)}
          </div>
          ${networkOpen ? this.renderDeviceNetworkPanel(node) : ""}
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
      const networkOpen = Boolean(node.networkPanelOpen);

      return `
        <div class="ptz-panel ${isFly ? "is-fly" : "is-pro"}" style="--ptz-joy-x: ${joystick.x ?? 0}; --ptz-joy-y: ${joystick.y ?? 0};">
          <div class="ptz-brand">SKAARHOJ</div>
          <div class="ptz-display">
            <span>${isFly ? "PTZ Fly" : "PTZ Pro"}</span>
            <strong>CAM ${node.selectedCamera ?? 1}</strong>
            <em>LAN</em>
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
              ${presetButtons.map((number) => {
                const camera = this.callbacks.getPtzControlledCamera(node);
                const hasPreset = Boolean(camera?.presets?.[number]);
                return `
                  <button class="ptz-small-key ${hasPreset ? "has-preset" : ""}"
                    type="button"
                    data-action="ptz-preset"
                    data-node-id="${node.id}"
                    data-preset="${number}"
                    title="Kurz: Preset abrufen · Lang halten (1s): Preset speichern">${number}</button>
                `;
              }).join("")}
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
          ${this.renderDeviceNetworkToggle(node)}
        </div>
        ${networkOpen ? this.renderDeviceNetworkPanel(node) : ""}
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

    renderMicroConverter(node) {
      return `
        <div class="bmd-panel">
          <div class="bmd-brand">
            <span>Blackmagicdesign</span>
            <span class="bmd-logo-rings" aria-hidden="true"><i></i><i></i><i></i></span>
          </div>
          <div class="bmd-model">
            <strong>Micro Converter</strong>
            <span>BiDirectional<br>SDI/HDMI 12G</span>
          </div>
        </div>
        <div class="node-meta">
          <span>${node.inputs.length} In / ${node.outputs.length} Out</span>
        </div>
      `;
    }

    renderPoeInjectorPanel(node) {
      return `
        <div class="node-meta">
          <span>PoE Injector</span>
          <span>802.3at &middot; Gigabit</span>
        </div>
      `;
    }

    renderAudioRecorderPanel(node) {
      return `
        <div class="simple-device-face mixpre-face">
          <img class="mixpre-photo" src="${node.image}" alt="${node.title}">
        </div>
        <div class="node-meta">
          <span>${node.inputs.length} In / ${node.outputs.length} Out</span>
          <span>3x XLR Mic/Line</span>
        </div>
      `;
    }

    renderMicrophonePanel(node) {
      const uid = node.id;
      return `
        <div class="mic-panel">
          <svg class="mic-illustration" viewBox="0 0 190 190" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="micMetal-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#6b675e"/>
                <stop offset="20%" stop-color="#c9c3b4"/>
                <stop offset="42%" stop-color="#f2efe8"/>
                <stop offset="60%" stop-color="#cfc9ba"/>
                <stop offset="80%" stop-color="#8f897b"/>
                <stop offset="100%" stop-color="#6b675e"/>
              </linearGradient>
              <linearGradient id="micShade-${uid}" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="rgba(255,255,255,0.28)"/>
                <stop offset="40%" stop-color="rgba(255,255,255,0)"/>
                <stop offset="100%" stop-color="rgba(0,0,0,0.32)"/>
              </linearGradient>
              <radialGradient id="micCapGrad-${uid}" cx="35%" cy="35%" r="75%">
                <stop offset="0%" stop-color="#dedad0"/>
                <stop offset="60%" stop-color="#948e80"/>
                <stop offset="100%" stop-color="#5c584e"/>
              </radialGradient>
              <pattern id="micMesh-${uid}" width="6" height="6" patternUnits="userSpaceOnUse">
                <circle cx="3" cy="3" r="1" fill="rgba(0,0,0,0.55)"/>
              </pattern>
              <clipPath id="micClip-${uid}">
                <rect x="16" y="76" width="158" height="48" rx="12"/>
              </clipPath>
            </defs>

            <g transform="rotate(35 95 100)">
              <rect x="16" y="76" width="158" height="48" rx="12" fill="url(#micMetal-${uid})"/>
              <rect x="16" y="76" width="158" height="48" rx="12" fill="url(#micShade-${uid})"/>

              <g clip-path="url(#micClip-${uid})">
                <rect x="16" y="76" width="52" height="48" fill="#131211"/>
                <g transform="translate(32,82) scale(0.5)">
                  <path d="M20 3 L37 32 L3 32 Z" fill="none" stroke="#eceae4" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>
                  <ellipse cx="19" cy="20" rx="4.4" ry="6.6" transform="rotate(-25 19 20)" fill="#eceae4"/>
                  <path d="M11 17 Q20 8 29 18" stroke="#eceae4" stroke-width="2" stroke-linecap="round" fill="none"/>
                </g>
                <text x="42" y="116" text-anchor="middle" font-size="6" font-style="italic" font-weight="600" fill="#d8d5cc">behringer</text>

                <rect x="134" y="76" width="40" height="48" fill="url(#micCapGrad-${uid})"/>
                <rect x="134" y="76" width="40" height="48" fill="url(#micMesh-${uid})"/>
              </g>

              <rect x="16" y="76" width="158" height="48" rx="12" fill="none" stroke="#4d4a42" stroke-width="1.5"/>
              <line x1="68" y1="76" x2="68" y2="124" stroke="#3f3c36" stroke-width="1.3"/>
              <line x1="134" y1="76" x2="134" y2="124" stroke="#3f3c36" stroke-width="1.3"/>

              <rect x="76" y="84" width="5" height="10" rx="2" fill="#141311"/>
              <path d="M84 83 L90 83 L96 89" fill="none" stroke="#2b2620" stroke-width="1.3" stroke-linecap="round"/>
              <text x="101" y="96" text-anchor="middle" font-size="6" font-weight="700" fill="#2b2620">-10 dB</text>

              <text x="101" y="116" text-anchor="middle" font-size="15" font-weight="900" fill="#1c1a17">C-2</text>

              <path d="M20 79 Q95 71 170 79" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" clip-path="url(#micClip-${uid})"/>
            </g>
          </svg>
        </div>
        <div class="node-meta">
          <span>Kondensator · Niere</span>
          <span>${node.outputs.length} Out</span>
        </div>
      `;
    }

    renderStreamDeckXLPanel(node) {
      if (node.companionSurfaceChoices?.length) {
        return this.renderStreamDeckSurfacePicker(node);
      }

      if (!node.companionImport) {
        return this.renderStreamDeckEmptyState(node);
      }

      if (node.streamDeckMappingOpen) {
        return this.renderStreamDeckMappingPanel(node);
      }

      return this.renderStreamDeckGrid(node);
    }

    renderStreamDeckMappingPanel(node) {
      const relevantModules = { "bmd-atem": "switcher", "canon-ptz": "camera" };
      const instances = Object.entries(node.companionImport.instances)
        .filter(([, instance]) => relevantModules[instance.moduleId]);

      const rows = instances.map(([instanceId, instance]) => {
        const candidateType = relevantModules[instance.moduleId];
        const candidates = this.state.nodes.filter((candidate) => candidate.type === candidateType);
        const currentMappedId = node.instanceMap?.[instanceId] ?? "";
        const options = [`<option value="">— nicht zugeordnet —</option>`]
          .concat(candidates.map((candidate) => `
            <option value="${candidate.id}" ${candidate.id === currentMappedId ? "selected" : ""}>${escapeHtml(candidate.title)}</option>
          `))
          .join("");

        const nameField = instance.moduleId === "canon-ptz"
          ? `<input type="text" class="streamdeck-camera-name-input" data-action="streamdeck-set-camera-name" data-node-id="${node.id}" data-instance-id="${escapeHtml(instanceId)}" value="${escapeHtml(node.instanceNames?.[instanceId] ?? "")}" placeholder="${escapeHtml(this.getDefaultStreamDeckCameraName(instance))}">`
          : "";

        return `
          <div class="streamdeck-mapping-row">
            <span>${escapeHtml(instance.label)} <small>(${escapeHtml(instance.moduleId)})</small></span>
            ${nameField}
            <select data-action="streamdeck-set-mapping" data-node-id="${node.id}" data-instance-id="${escapeHtml(instanceId)}">
              ${options}
            </select>
          </div>
        `;
      }).join("");

      return `
        <div class="streamdeck-panel">
          <div class="streamdeck-toolbar">
            <span class="streamdeck-page-label">Geräte zuordnen</span>
            <button class="small-button" type="button" data-action="streamdeck-close-mapping" data-node-id="${node.id}">Fertig</button>
          </div>
          <div class="streamdeck-mapping-list">
            ${rows || "<p>Keine ATEM- oder PTZ-Instanzen in dieser Konfiguration gefunden.</p>"}
          </div>
        </div>
      `;
    }

    getDefaultStreamDeckCameraName(instance) {
      return instance.label.match(/\d+$/)?.[0] ?? instance.label;
    }

    // Companion resolves these itself from the live camera connection / its
    // own UI — none of that is part of the exported button/page data, so we
    // substitute what we can from our own state wherever the tokens appear:
    // "cameraName" from the mapping panel's name field (or its "101"/"102"/…
    // default), "exposureShootingMode"/"aePhotometry" from the mapped
    // camera's own simulated AE mode/metering state (defaulting to what a
    // freshly-started camera would report if nothing was mapped yet).
    resolveStreamDeckButtonText(node, text) {
      if (!text || !text.includes("$(")) {
        return text;
      }

      return text.replace(
        /\$\(([^:()]+):(cameraName|exposureShootingMode|aePhotometry|gainValue|gainMode|irisValue|irisMode|shutterValue|shutterMode|autoFocusMode|kelvinValue|aeFlickerReduct|whitebalanceMode|panTiltSpeedValue|digitalZoom|date_weekday|date_d|date_m|date_y|time_hms|stream_duration_hm|record_duration_hm)\)/g,
        (match, label, field) => {
          // "internal" is Companion's own reserved pseudo-connection for
          // system values (clock, network info, ...) — not a real module
          // instance, so it never appears in companionImport.instances and
          // must be resolved before the label→instance lookup below.
          if (label === "internal") {
            return this.resolveStreamDeckInternalField(field) ?? match;
          }

          const entry = Object.entries(node.companionImport.instances).find(([, instance]) => instance.label === label);

          if (!entry) {
            return match;
          }

          const [instanceId, instance] = entry;

          if (field === "stream_duration_hm" || field === "record_duration_hm") {
            const switcher = this.state.nodes.find((candidate) => candidate.id === node.instanceMap?.[instanceId]);
            const startedAt = field === "stream_duration_hm" ? switcher?.streamingStartedAt : switcher?.recordingStartedAt;
            return this.formatStreamDeckDurationHm(startedAt);
          }

          if (field === "cameraName") {
            return node.instanceNames?.[instanceId] ?? this.getDefaultStreamDeckCameraName(instance);
          }

          const camera = this.state.nodes.find((candidate) => candidate.id === node.instanceMap?.[instanceId]);

          if (field === "exposureShootingMode") {
            const mode = camera?.exposureMode ?? "fullauto";
            return STREAM_DECK_EXPOSURE_MODE_LABELS[mode] ?? mode;
          }

          if (field === "aePhotometry") {
            const metering = camera?.meteringMode ?? "center";
            return STREAM_DECK_METERING_MODE_LABELS[metering] ?? metering;
          }

          if (field === "gainValue") {
            return `${Number(camera?.gainDb ?? 0).toFixed(1)} dB`;
          }

          if (field === "gainMode") {
            return STREAM_DECK_TOGGLE_MODE_LABELS[camera?.gainMode ?? "auto"] ?? camera?.gainMode;
          }

          if (field === "irisMode") {
            return STREAM_DECK_TOGGLE_MODE_LABELS[camera?.irisMode ?? "auto"] ?? camera?.irisMode;
          }

          if (field === "shutterMode") {
            return STREAM_DECK_TOGGLE_MODE_LABELS[camera?.shutterMode ?? "auto"] ?? camera?.shutterMode;
          }

          if (field === "irisValue") {
            return this.callbacks.getStreamDeckIrisLabel?.(camera) ?? "F5.6";
          }

          if (field === "shutterValue") {
            return this.callbacks.getStreamDeckShutterLabel?.(camera) ?? "1/60";
          }

          if (field === "autoFocusMode") {
            return STREAM_DECK_TOGGLE_MODE_LABELS[camera?.focusMode ?? "auto"] ?? camera?.focusMode;
          }

          if (field === "kelvinValue") {
            return this.callbacks.getStreamDeckKelvinLabel?.(camera) ?? "4760K";
          }

          if (field === "aeFlickerReduct") {
            const flicker = camera?.flickerReduction ?? "auto";
            return STREAM_DECK_FLICKER_LABELS[flicker] ?? flicker;
          }

          if (field === "whitebalanceMode") {
            const wbMode = camera?.whitebalanceMode ?? "auto";
            return STREAM_DECK_WB_MODE_LABELS[wbMode] ?? wbMode;
          }

          if (field === "panTiltSpeedValue") {
            return String(camera?.panTiltSpeedLevel ?? 12);
          }

          return camera?.digitalZoomEnabled ? "ON" : "OFF";
        }
      );
    }

    // Companion's built-in "internal" system variables — resolved from the
    // live clock rather than any node/instance state.
    resolveStreamDeckInternalField(field) {
      const now = new Date();

      if (field === "date_weekday") {
        return ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"][now.getDay()];
      }

      if (field === "date_d") {
        return String(now.getDate()).padStart(2, "0");
      }

      if (field === "date_m") {
        return String(now.getMonth() + 1).padStart(2, "0");
      }

      if (field === "date_y") {
        return String(now.getFullYear());
      }

      if (field === "time_hms") {
        return [now.getHours(), now.getMinutes(), now.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
      }

      return null;
    }

    // "00:00" while not (yet) started, otherwise hours:minutes elapsed since
    // startedAt — matches the "HH:MM" shape of Companion's own *_duration_hm
    // variables.
    formatStreamDeckDurationHm(startedAt) {
      if (!startedAt) {
        return "00:00";
      }

      const totalMinutes = Math.max(0, Math.floor((Date.now() - startedAt) / 60000));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }

    renderStreamDeckEmptyState(node) {
      return `
        <div class="streamdeck-panel streamdeck-empty">
          <p>Noch keine Companion-Konfiguration importiert.</p>
          <button class="library-button ${this.state.readOnly ? "is-hidden" : ""}" type="button" data-action="streamdeck-import" data-node-id="${node.id}">.companionconfig importieren</button>
        </div>
      `;
    }

    renderStreamDeckSurfacePicker(node) {
      const options = node.companionSurfaceChoices.map((surface) => `
        <button class="streamdeck-surface-option" type="button" data-action="streamdeck-pick-surface" data-node-id="${node.id}" data-surface-key="${escapeHtml(surface.key)}">
          <strong>${escapeHtml(surface.name)}</strong>
          <span>${escapeHtml(surface.type)} · ${surface.columns}x${surface.rows}</span>
        </button>
      `).join("");

      return `
        <div class="streamdeck-panel streamdeck-empty">
          <p>Mehrere Stream-Deck-Surfaces gefunden — welche soll importiert werden?</p>
          <div class="streamdeck-surface-list">${options}</div>
        </div>
      `;
    }

    renderStreamDeckGrid(node) {
      const importData = node.companionImport;
      const pageId = node.currentPageId && importData.pages[node.currentPageId] ? node.currentPageId : importData.startupPageId;
      const page = importData.pages[pageId];

      if (!page) {
        return this.renderStreamDeckEmptyState(node);
      }

      const buttons = page.buttons.map((entry) => this.renderStreamDeckButton(node, entry)).join("");
      const pageIndex = importData.pageOrder.indexOf(pageId);
      const pageLabel = `${escapeHtml(page.name)} (${pageIndex + 1}/${importData.pageOrder.length})`;

      return `
        <div class="streamdeck-panel">
          <div class="streamdeck-toolbar">
            <span class="streamdeck-page-label">${pageLabel}</span>
            <div class="streamdeck-toolbar-actions ${this.state.readOnly ? "is-hidden" : ""}">
              <button class="small-button" type="button" data-action="streamdeck-import" data-node-id="${node.id}">Load Configuration</button>
              <button class="small-button" type="button" data-action="streamdeck-map-instances" data-node-id="${node.id}">Geräte zuordnen</button>
            </div>
          </div>
          <div class="streamdeck-grid" style="grid-template-columns: repeat(${importData.columns}, 1fr); grid-template-rows: repeat(${importData.rows}, 1fr);">
            ${buttons}
          </div>
        </div>
      `;
    }

    renderStreamDeckButton(node, entry) {
      const { row, col, cell } = entry;

      if (!cell) {
        return `<div class="streamdeck-btn streamdeck-btn-empty"></div>`;
      }

      if (cell.kind === "pagenav") {
        const arrow = cell.direction === "up" ? "&#9650;" : cell.direction === "down" ? "&#9660;" : "#";
        return `
          <button class="streamdeck-btn streamdeck-btn-pagenav" type="button"
            data-action="streamdeck-page-nav" data-node-id="${node.id}" data-direction="${cell.direction}">
            ${arrow}
          </button>
        `;
      }

      const style = this.callbacks.getStreamDeckButtonStyle
        ? this.callbacks.getStreamDeckButtonStyle(node, cell)
        : { bgcolor: cell.bgcolor, color: cell.color };

      const bg = style.bgcolor ? `background-color: ${style.bgcolor};` : "";
      const fg = style.color ? `color: ${style.color};` : "";
      // Real Companion shows a live camera thumbnail on these buttons (via a
      // "bank_current_step" feedback we don't render); as a stand-in, show
      // the camera product shot (pre-cut to a solid black background so it
      // blends into the button) instead, flipped 180° in lockstep with the
      // mapped camera's current rotated180 state, plus the camera's name
      // resolved the same way any other $(Label:field) button text would be.
      const rotateAction = this.findCameraRotateAction(cell);
      let image = "";
      let cameraNameLabel = "";

      if (rotateAction) {
        const targetNodeId = node.instanceMap?.[rotateAction.instanceId];
        const camera = this.callbacks.getNode?.(targetNodeId);
        const rotated = Boolean(camera?.rotated180);
        image = `<img class="streamdeck-btn-icon streamdeck-btn-icon-fill" src="assets/canon_black.png" alt="" style="transform: rotate(${rotated ? 180 : 0}deg);">`;

        const instanceLabel = node.companionImport.instances?.[rotateAction.instanceId]?.label;
        const resolvedName = instanceLabel
          ? this.resolveStreamDeckButtonText(node, `$(${instanceLabel}:cameraName)`)
          : "";

        // Text itself stays upright (rotating it 180° would make it
        // unreadable) — only its position flips from bottom to top, the
        // same "reads normally, but placement tells you it's inverted" idea
        // as the housing flip elsewhere.
        if (resolvedName) {
          cameraNameLabel = `<span class="streamdeck-btn-camera-name ${rotated ? "is-top" : "is-bottom"}">${escapeHtml(resolvedName)}</span>`;
        }
      } else if (cell.png64) {
        image = `<img class="streamdeck-btn-icon" src="data:image/png;base64,${cell.png64}" alt="">`;
      }
      // Companion authors write literal "\n" (backslash-n) in button text as
      // their own line-break convention, not an actual newline character.
      const resolvedText = this.resolveStreamDeckButtonText(node, cell.text)?.replace(/\\n/g, "\n");
      const text = resolvedText ? `<span class="streamdeck-btn-text">${escapeHtml(resolvedText)}</span>` : "";

      return `
        <button class="streamdeck-btn" type="button" style="${bg}${fg}"
          data-action="streamdeck-button" data-node-id="${node.id}" data-row="${row}" data-col="${col}">
          ${image}${cameraNameLabel}${text}
        </button>
      `;
    }

    findCameraRotateAction(cell) {
      for (const step of cell.actions?.steps ?? []) {
        const found = (step.press ?? []).find((action) => action.definitionId === "cameraRotate180");

        if (found) {
          return found;
        }
      }

      return null;
    }

    renderSourcePreview(node) {
      const mode = this.callbacks.normalizeSourceViewMode(node);

      // Deliberately does NOT look at node.rotated180 here — this is the
      // shared "what does this source's signal look like" renderer, used
      // both for the camera's own card (wrapped in a counter-rotation by
      // renderNodeBody, see above) and for every downstream monitor/switcher
      // showing this camera as its routed source. A downstream monitor has
      // no camera "housing" to compensate for — the erotate-corrected signal
      // already looks normal at the source, so it should just render as-is.
      if (mode === "media" && node.media && node.media.kind !== "file") {
        if (this.callbacks.isPtzPanoramaSource?.(node)) {
          return this.callbacks.renderPtzPanoramaPicture(node);
        }

        return this.callbacks.renderMediaSurface(node);
      }

      if (mode === "product") {
        return this.renderSourceProductPicture(node);
      }

      if (mode === "model3d") {
        return this.renderCamera3DModel(node);
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

    // A hand-built CSS 3D rig (no model file, no library) standing in for the
    // physical camera: a pan ring that carries a tilting head, matching a real
    // PTZ camera's mechanics — pan turns the whole yoke+head, tilt only pitches
    // the head within it. Driven by the camera's own node.ptz (the same
    // pan/tilt/zoom state the joystick and presets already read and write), so
    // it turns live with the joystick and eases smoothly through preset recalls
    // via the same per-frame updates that already repaint the panorama canvas.
    renderCamera3DModel(node) {
      if (node.model3d) {
        return `
          <div class="camera-3d-scene">
            <canvas class="camera-3d-model-canvas" data-ptz-model-canvas="${node.id}" data-model-url="${node.model3d}"></canvas>
          </div>
        `;
      }

      const pan = Number(node.ptz?.pan ?? 0);
      const tilt = Number(node.ptz?.tilt ?? 0);
      const zoom = Number(node.ptz?.zoom ?? 1.7);
      const lensPush = (zoom - 1.7) * 6;

      return `
        <div class="camera-3d-scene">
          <div class="camera-3d-stage">
            <div class="camera-3d-pan-rig" data-ptz-pan-rig="${node.id}" style="transform: rotateY(${pan}deg);">
              <div class="camera-3d-yoke">
                <div class="camera-3d-arm camera-3d-arm-left"></div>
                <div class="camera-3d-arm camera-3d-arm-right"></div>
                <div class="camera-3d-foot"></div>
              </div>
              <div class="camera-3d-head" data-ptz-head="${node.id}" style="transform: rotateX(${-tilt}deg);">
                <div class="camera-3d-face camera-3d-face-front"></div>
                <div class="camera-3d-face camera-3d-face-back"></div>
                <div class="camera-3d-face camera-3d-face-left"></div>
                <div class="camera-3d-face camera-3d-face-right"></div>
                <div class="camera-3d-face camera-3d-face-top"></div>
                <div class="camera-3d-face camera-3d-face-bottom"></div>
                <div class="camera-3d-brand">Canon</div>
                <div class="camera-3d-leds"><span class="is-power"></span><span class="is-status"></span></div>
                <div class="camera-3d-lens-rim" style="transform: translate(-50%, -50%) translateZ(${34 + lensPush}px);"></div>
                <div class="camera-3d-lens-glass" style="transform: translate(-50%, -50%) translateZ(${40 + lensPush}px);"></div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    getSourceViewLabel(node) {
      const mode = this.callbacks.normalizeSourceViewMode(node);

      if (mode === "media") {
        return node.type === "camera" ? "Equirectangular" : (node.media?.name ?? "Medium");
      }

      if (mode === "product") {
        return node.type === "camera" ? "Produktbild" : "Gerätebild";
      }

      if (mode === "model3d") {
        return "3D Model Kamera";
      }

      return "Farbe";
    }

    // Three stacked "xxx.xxx.xxx.xxx" rows (IP/Subnet/Gateway) editable
    // directly on the node face — purely informational bookkeeping (no
    // validation against the actual scene's cabling), stored per-field as a
    // 4-element octet array on the node, defaulting to blank until edited.
    // `overrideValues`/`readOnly` let a DHCP-mode camera show its live
    // computed address without those octets being individually editable —
    // everything else (router/gateway/manual-mode camera) just renders
    // node[field] directly and stays editable, same as before.
    renderNetworkGatewayIpRow(node, field, label, { overrideValues, readOnly = false } = {}) {
      const octets = overrideValues ?? node[field] ?? ["", "", "", ""];
      const inputs = octets
        .map((value, index) => `
          <input type="text" class="network-gateway-octet" inputmode="numeric" maxlength="3"
            data-action="network-gateway-set-octet" data-node-id="${node.id}" data-field="${field}" data-index="${index}"
            value="${escapeHtml(value ?? "")}" placeholder="0" ${readOnly ? "disabled" : ""}>
        `)
        .join('<span class="network-gateway-dot">.</span>');

      return `
        <div class="network-gateway-ip-row">
          <span class="network-gateway-ip-label">${label}</span>
          <span class="network-gateway-octets">${inputs}</span>
        </div>
      `;
    }

    // Just the last-octet start/end of the DHCP pool (e.g. "100 - 199"),
    // not full addresses — two inputs instead of four, dash instead of dots.
    renderNetworkGatewayDhcpRow(node) {
      const range = node.dhcpRange ?? ["", ""];
      const inputs = range
        .map((value, index) => `
          <input type="text" class="network-gateway-octet" inputmode="numeric" maxlength="3"
            data-action="network-gateway-set-dhcp" data-node-id="${node.id}" data-index="${index}"
            value="${escapeHtml(value ?? "")}" placeholder="${index === 0 ? "100" : "199"}">
        `)
        .join('<span class="network-gateway-dot">&ndash;</span>');

      return `
        <div class="network-gateway-ip-row">
          <span class="network-gateway-ip-label">DHCP</span>
          <span class="network-gateway-octets">${inputs}</span>
        </div>
      `;
    }

    // The small chevron button that expands/collapses renderDeviceNetworkPanel
    // below — shared across every leaf device type that carries its own IP
    // identity (camera, computer, ATEM, PTZ controller, Stream Deck) so each
    // face only has to drop it into whatever footer/meta row it already has.
    renderDeviceNetworkToggle(node) {
      const networkOpen = Boolean(node.networkPanelOpen);

      return `
        <button class="device-network-toggle" type="button" data-action="toggle-device-network" data-node-id="${node.id}"
          title="Netzwerk-Einstellungen" aria-label="Netzwerk-Einstellungen" aria-expanded="${networkOpen}">
          ${networkOpen ? "&#9650;" : "&#9660;"}
        </button>
      `;
    }

    // Manual/DHCP toggle above the IP/Subnet/Gateway rows. In DHCP mode the
    // three rows switch to the live-computed address (see
    // computeDeviceNetworkConfig: a free address out of the connected
    // router's DHCP pool, or an APIPA address if no router is reachable)
    // and their inputs go read-only — there's nothing to type when the
    // device is "getting an address automatically".
    renderDeviceNetworkPanel(node) {
      const mode = node.ipMode === "dhcp" ? "dhcp" : "manual";
      const config = this.callbacks.computeDeviceNetworkConfig(node);
      const isDhcp = mode === "dhcp";

      return `
        <div class="device-network-panel">
          <div class="device-network-mode">
            <button class="device-network-mode-btn ${mode === "manual" ? "is-active" : ""}" type="button"
              data-action="set-device-ip-mode" data-node-id="${node.id}" data-mode="manual">Manual</button>
            <button class="device-network-mode-btn ${isDhcp ? "is-active" : ""}" type="button"
              data-action="set-device-ip-mode" data-node-id="${node.id}" data-mode="dhcp">DHCP</button>
          </div>
          ${this.renderNetworkGatewayIpRow(node, "ipAddress", "IP", { overrideValues: config.ip, readOnly: isDhcp })}
          ${this.renderNetworkGatewayIpRow(node, "subnetMask", "Subnet", { overrideValues: config.subnet, readOnly: isDhcp })}
          ${this.renderNetworkGatewayIpRow(node, "gatewayAddress", "Gateway", { overrideValues: config.gateway, readOnly: isDhcp })}
        </div>
      `;
    }

    renderSockets(node, direction) {
      const ports = node[`${direction}s`] ?? [];

      return ports.map((port) => {
        const selected = this.state.selectedSocket
          && this.state.selectedSocket.nodeId === node.id
          && this.state.selectedSocket.portId === port.id;
        const position = port.topPx !== undefined ? `top: ${port.topPx}px;` : `top: ${port.top}%;`;
        // A port's card edge is usually implied by its direction (input=left,
        // output=right), but some devices group jacks by connector type
        // instead - `port.edge` lets a port opt out of that default without
        // touching its actual input/output connection semantics. "free"
        // (used by the internet cloud, whose ports sit anywhere around an
        // organic outline rather than a rectangular edge) additionally
        // supplies its own `port.left` percentage instead of pinning to 0%/100%.
        const edge = port.edge ?? (direction === "input" ? "left" : "right");
        const leftPosition = edge === "free" && port.left !== undefined ? ` left: ${port.left}%;` : "";

        return `
          <button class="socket is-${direction} is-edge-${edge} ${selected ? "is-selected" : ""}"
            type="button"
            data-action="socket"
            data-node-id="${node.id}"
            data-port-id="${port.id}"
            data-direction="${direction}"
            data-signal="${port.signal}"
            style="${position}${leftPosition} --socket-color: ${this.config.signalColors[port.signal] ?? this.config.signalColors.SDI}"
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
