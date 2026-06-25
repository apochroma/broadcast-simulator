const signalColors = {
  SDI: "#7f8d99",
  HDMI: "#4cc9f0",
  "USB-C": "#d8dee9",
  RJ45: "#9b7bff",
  "Mic 3.5mm": "#ffcc66",
  "Headphone 3.5mm": "#ff9f43",
  XLR: "#ffcc66",
  Network: "#9b7bff"
};

const gearLibrary = {
  canonCrn100: makeCanonCameraTemplate("Canon CR-N100"),
  canonCrn300: {
    ...makeCanonCameraTemplate("Canon CR-N300"),
    image: "assets/canon-crn300.webp"
  },
  canonCrn500: makeCanonCameraTemplate("Canon CR-N500"),
  canonCrn700: makeCanonCameraTemplate("Canon CR-N700"),
  atemMiniPro: makeAtemMiniTemplate("ATEM Mini Pro", 4, 1, 1, false),
  atemMiniProIso: makeAtemMiniTemplate("ATEM Mini Pro ISO", 4, 1, 1, false),
  atemMiniExtreme: makeAtemMiniTemplate("ATEM Mini Extreme", 8, 2, 2, true),
  atemMiniExtremeIso: makeAtemMiniTemplate("ATEM Mini Extreme ISO", 8, 2, 2, true),
  atemSdiProIso: makeAtemSdiTemplate("ATEM SDI Pro ISO", 4, 1, 1, false),
  atemSdiExtremeIso: {
    ...makeAtemSdiTemplate("ATEM SDI Extreme ISO", 8, 2, 2, true),
    image: "assets/atem-sdi-extreme-iso.jpg"
  },
  computer: {
    type: "computer",
    title: "Computer",
    kicker: "Playback",
    width: 300,
    inputs: [],
    outputs: [
      { id: "hdmi-out", label: "HDMI Out", signal: "HDMI", top: 44 },
      { id: "usb-c-out", label: "USB-C Out", signal: "USB-C", top: 58 },
      { id: "rj45", label: "RJ45", signal: "RJ45", top: 72 }
    ]
  },
  hdmiSplitter: {
    type: "splitter",
    title: "HDMI Splitter 1x5",
    kicker: "Distribution",
    width: 280,
    inputs: [{ id: "input-1", label: "HDMI In", signal: "HDMI", top: 50 }],
    outputs: makeNumberedPorts("output", 5, "HDMI", "HDMI", 24, 13)
  },
  monitor: {
    type: "monitor",
    title: "Program Monitor",
    kicker: "Monitor",
    width: 320,
    inputs: [
      { id: "sdi-in", label: "SDI In", signal: "SDI", top: 42 },
      { id: "hdmi-in", label: "HDMI In", signal: "HDMI", top: 58 }
    ],
    outputs: []
  }
};

const legacyGearAliases = {
  camera: "canonCrn300",
  atemMini: "atemMiniPro",
  atemExtreme: "atemSdiExtremeIso"
};

function makeCanonCameraTemplate(title) {
  return {
    type: "camera",
    title,
    kicker: "Kamera",
    image: "assets/canon-crn300.webp",
    width: 270,
    inputs: [],
    outputs: [
      { id: "hdmi-out", label: "HDMI Out", signal: "HDMI", top: 42 },
      { id: "sdi-out", label: "SDI Out", signal: "SDI", top: 58 },
      { id: "rj45", label: "RJ45", signal: "RJ45", top: 74 }
    ]
  };
}

function makeAtemMiniTemplate(title, inputCount, hdmiOutputs, usbOutputs, hasHeadphones) {
  const template = makeAtemTemplate({
    title,
    inputCount,
    videoSignal: "HDMI",
    videoLabel: "HDMI",
    hdmiOutputs,
    usbOutputs,
    hasHeadphones,
    width: inputCount > 4 ? 1822 : 700
  });

  if (inputCount > 4) {
    template.image = "assets/blackmagic-bm-swatemminicext-atem-mini-extreme.jpg";
  }

  return template;
}

function makeAtemSdiTemplate(title, inputCount, sdiOutputs, usbOutputs, hasHeadphones) {
  return makeAtemTemplate({
    title,
    inputCount,
    videoSignal: "SDI",
    videoLabel: "SDI",
    sdiOutputs,
    usbOutputs,
    hasHeadphones,
    width: inputCount > 4 ? 1822 : 700
  });
}

function makeAtemTemplate({ title, inputCount, videoSignal, videoLabel, hdmiOutputs = 0, sdiOutputs = 0, usbOutputs = 0, hasHeadphones = false, width }) {
  const videoOutputs = makeNumberedPorts("program-out", videoSignal === "HDMI" ? hdmiOutputs : sdiOutputs, videoSignal, `${videoLabel} Out`, 34, 10);
  const usbStart = videoOutputs.length ? videoOutputs.at(-1).top + 10 : 48;
  const usbPorts = makeNumberedPorts("usb-out", usbOutputs, "USB-C", "USB-C", usbStart, 10);
  const audioInputs = makeNumberedPorts("mic-in", 2, "Mic 3.5mm", "Mic", 80, 10);
  const headphone = hasHeadphones ? [{ id: "headphone-out", label: "Phones", signal: "Headphone 3.5mm", top: 88 }] : [];

  if (videoOutputs[0]) {
    videoOutputs[0].id = "program-out";
    videoOutputs[0].label = `${videoLabel} PGM`;
  }

  if (videoOutputs[1]) {
    videoOutputs[1].id = "multiview-out";
    videoOutputs[1].label = `${videoLabel} MV`;
  }

  return {
    type: "switcher",
    title,
    kicker: "Switcher",
    width,
    inputCount,
    signal: videoSignal,
    inputs: [
      ...makeNumberedPorts("input", inputCount, videoSignal, videoLabel, inputCount > 4 ? 20 : 28, inputCount > 4 ? 6 : 10),
      ...audioInputs
    ],
    outputs: [...videoOutputs, ...usbPorts, ...headphone]
  };
}

const cameraPatterns = [
  "linear-gradient(135deg, #2364aa, #3da5d9 48%, #73bfb8)",
  "linear-gradient(135deg, #9b2226, #ee9b00 48%, #e9d8a6)",
  "linear-gradient(135deg, #31572c, #90a955 48%, #ecf39e)",
  "linear-gradient(135deg, #5a189a, #f72585 48%, #4cc9f0)",
  "linear-gradient(135deg, #0f4c5c, #5f0f40 48%, #fb8b24)",
  "linear-gradient(135deg, #293241, #ee6c4d 48%, #98c1d9)"
];

const WORLD_WIDTH = 12000;
const WORLD_HEIGHT = 8000;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;
const VIDEO_PREVIEW_SECONDS = 5;
const VIDEO_PREVIEW_WIDTH = 640;
const VIDEO_PREVIEW_FPS = 15;
const ORIGINAL_VIDEO_EMBED_LIMIT_BYTES = 40 * 1024 * 1024;

const state = {
  nextId: 1,
  zoom: 1,
  activeSwitcherId: null,
  activeTransition: null,
  readOnly: false,
  selectedNodeId: null,
  selectedSocket: null,
  nodes: [],
  connections: []
};

const workspaceViewport = document.querySelector("#workspaceViewport");
const workspaceScaleShell = document.querySelector("#workspaceScaleShell");
const workspace = document.querySelector("#workspace");
const cableLayer = document.querySelector("#cableLayer");
const deviceLayer = document.querySelector("#deviceLayer");
const emptyState = document.querySelector("#emptyState");
const programStatus = document.querySelector("#programStatus");
const zoomReadout = document.querySelector("#zoomReadout");
const gearDialog = document.querySelector("#gearDialog");
const gearList = document.querySelector("#gearList");
const gearSearch = document.querySelector("#gearSearch");
const importSetupFile = document.querySelector("#importSetupFile");
const editGearDialog = document.querySelector("#editGearDialog");
const editGearHeading = document.querySelector("#editGearHeading");
const editGearName = document.querySelector("#editGearName");
const editPortList = document.querySelector("#editPortList");

let activeDrag = null;
let suppressNextSocketClick = false;
let editDraft = null;
let gearFilter = "";
let copiedNodeSnapshot = null;

const gearEntries = [
  ["canonCrn100", "Canon", "Canon CR-N100", "HDMI Out, SDI Out, RJ45"],
  ["canonCrn300", "Canon", "Canon CR-N300", "HDMI Out, SDI Out, RJ45"],
  ["canonCrn500", "Canon", "Canon CR-N500", "HDMI Out, SDI Out, RJ45"],
  ["canonCrn700", "Canon", "Canon CR-N700", "HDMI Out, SDI Out, RJ45"],
  ["atemMiniPro", "Blackmagic ATEM Mini", "ATEM Mini Pro", "4 HDMI Inputs, HDMI Out, USB-C, 2x Mic"],
  ["atemMiniProIso", "Blackmagic ATEM Mini", "ATEM Mini Pro ISO", "4 HDMI Inputs, HDMI Out, USB-C, 2x Mic"],
  ["atemMiniExtreme", "Blackmagic ATEM Mini", "ATEM Mini Extreme", "8 HDMI Inputs, 2x HDMI Out, 2x USB-C, Phones"],
  ["atemMiniExtremeIso", "Blackmagic ATEM Mini", "ATEM Mini Extreme ISO", "8 HDMI Inputs, 2x HDMI Out, 2x USB-C, Phones"],
  ["atemSdiProIso", "Blackmagic ATEM SDI", "ATEM SDI Pro ISO", "4 SDI Inputs, SDI Out, USB-C, 2x Mic"],
  ["atemSdiExtremeIso", "Blackmagic ATEM SDI", "ATEM SDI Extreme ISO", "8 SDI Inputs, 2x SDI Out, 2x USB-C, Phones"],
  ["computer", "Playback", "Computer / Playback", "HDMI, USB-C und RJ45 Output mit Datei-Preview"],
  ["hdmiSplitter", "Distribution", "HDMI Splitter 1x5", "1 HDMI Input, 5 HDMI Outputs"],
  ["monitor", "Monitoring", "Program Monitor", "SDI oder HDMI Input"]
];

function makeNumberedPorts(prefix, count, signal, labelPrefix, firstTop, step) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    label: `${labelPrefix} ${index + 1}`,
    number: index + 1,
    signal,
    top: firstTop + index * step
  }));
}

function addGear(type, customTemplate) {
  const resolvedType = legacyGearAliases[type] ?? type;
  const template = customTemplate ?? gearLibrary[resolvedType];
  const countOfType = state.nodes.filter((node) => node.type === template.type).length + 1;
  const position = getSpawnPosition(template.type, countOfType, template.width);
  const id = `${template.type}-${state.nextId}`;
  const node = {
    ...template,
    id,
    libraryType: resolvedType,
    inputs: (template.inputs ?? []).map((port) => ({ ...port })),
    outputs: (template.outputs ?? []).map((port) => ({ ...port })),
    title: template.type === "camera" ? `${template.title} ${countOfType}` : template.title,
    shortName: template.type === "camera" ? `CAM ${countOfType}` : getShortName(template.title),
    position,
    viewMode: template.type === "camera" ? "photo" : null,
    media: template.type === "computer" ? createPlaceholderMedia("Computer") : null,
    previewInput: template.type === "switcher" ? 1 : null,
    programInput: null,
    audio: template.type === "switcher" ? createSwitcherAudioState(template.inputCount) : null,
    pattern: cameraPatterns[(countOfType - 1) % cameraPatterns.length]
  };

  state.nextId += 1;
  state.nodes.push(node);

  if (node.type === "switcher") {
    state.activeSwitcherId = node.id;
  }

  render();
}

function getSpawnPosition(type, countOfType, width = 280) {
  const viewportOrigin = {
    x: workspaceViewport.scrollLeft / state.zoom,
    y: workspaceViewport.scrollTop / state.zoom
  };
  const visibleWidth = workspaceViewport.clientWidth / state.zoom;
  const centeredX = viewportOrigin.x + Math.max(0, (visibleWidth - width) / 2);

  if (type === "camera") {
    return { x: viewportOrigin.x + 56, y: viewportOrigin.y + 52 + (countOfType - 1) * 350 };
  }

  if (type === "computer") {
    return { x: viewportOrigin.x + 56, y: viewportOrigin.y + 52 + (countOfType - 1) * 280 };
  }

  if (type === "switcher") {
    const preferredX = viewportOrigin.x + 470;
    const maxVisibleX = viewportOrigin.x + visibleWidth - width - 18;
    const x = maxVisibleX > viewportOrigin.x + 56
      ? clamp(preferredX, viewportOrigin.x + 56, maxVisibleX)
      : centeredX;

    return { x, y: viewportOrigin.y + 52 + (countOfType - 1) * 380 };
  }

  if (type === "splitter") {
    return { x: viewportOrigin.x + 470, y: viewportOrigin.y + 360 + (countOfType - 1) * 240 };
  }

  return { x: viewportOrigin.x + 980, y: viewportOrigin.y + 180 + (countOfType - 1) * 300 };
}

function render() {
  document.body.classList.toggle("is-read-only", state.readOnly);
  deviceLayer.innerHTML = state.nodes.map(renderNode).join("");
  emptyState.classList.toggle("is-hidden", state.nodes.length > 0);
  programStatus.textContent = getProgramStatus();
  renderGearList();
  renderZoom();
  requestAnimationFrame(renderLines);
}

function renderGearList() {
  const terms = gearFilter.toLowerCase().split(/\s+/).filter(Boolean);
  const entries = gearEntries.filter((entry) => {
    const haystack = entry.join(" ").toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });

  gearList.innerHTML = entries.map(([type, family, title, description]) => `
    <button class="gear-option" type="button" data-add-gear="${type}">
      <strong>${title}</strong>
      <span>${family} · ${description}</span>
    </button>
  `).join("") || `<div class="empty-search">Keine passenden Devices</div>`;
}

function renderNode(node) {
  const programSource = getSwitcherProgramSource(getActiveSwitcher());
  const previewSource = getSwitcherPreviewSource(getActiveSwitcher());
  const classes = [
    "node",
    node.type,
    node.isTransitioning ? "is-transitioning" : "",
    state.selectedNodeId === node.id ? "is-selected" : "",
    programSource?.id === node.id ? "is-program" : "",
    previewSource?.id === node.id ? "is-preview" : ""
  ].filter(Boolean).join(" ");

  return `
    <article class="${classes}"
      data-node-id="${node.id}"
      style="width: ${node.width}px; transform: translate(${node.position.x}px, ${node.position.y}px)">
      ${renderSockets(node, "input")}
      ${renderSockets(node, "output")}
      <div class="node-header drag-handle">
        <div>
          <p class="node-kicker">${node.kicker}</p>
          <h2>${node.title}</h2>
        </div>
        <div class="node-actions ${state.readOnly ? "is-hidden" : ""}">
          <button class="small-button" type="button" data-action="edit-node" data-node-id="${node.id}">Bearbeiten</button>
          <button class="small-button danger" type="button" data-action="remove-node" data-node-id="${node.id}">Entfernen</button>
        </div>
      </div>
      <div class="node-body">
        ${renderNodeBody(node)}
      </div>
    </article>
  `;
}

function renderNodeBody(node) {
  if (node.type === "camera") {
    return `
      <button class="camera-visual" type="button" data-action="toggle-camera-view" data-node-id="${node.id}">
        ${node.viewMode === "signal" ? renderSignalPicture(node) : `<img class="gear-image" src="${node.image}" alt="${node.title}">`}
      </button>
      <div class="node-meta">
        <span>${node.shortName}</span>
        <span>${node.viewMode === "signal" ? "Testbild" : "Kamerabild"}</span>
      </div>
    `;
  }

  if (node.type === "switcher") {
    return `
      <div class="simple-device-face switcher-title-face">${node.title}</div>
      <div class="switcher-display">
        <span>Program / Preview</span>
        <strong>${getSwitcherReadout(node)}</strong>
      </div>
      ${renderSwitcherPanel(node)}
    `;
  }

  if (node.type === "splitter") {
    const source = resolveNodeInputSource(node, "input-1");
    return `
      <div class="simple-device-face splitter-face">HDMI<br>1 x 5</div>
      <div class="node-meta">
        <span>${node.inputs.length} In / ${node.outputs.length} Out</span>
        <span>${source ? source.shortName : "No Signal"}</span>
      </div>
    `;
  }

  if (node.type === "computer") {
    return `
      <div class="media-drop-zone" data-drop-target="${node.id}">
        ${renderMediaSurface(node)}
      </div>
      <div class="node-meta">
        <span>${node.media?.name ?? "Keine Datei"}</span>
        <button class="small-button ${state.readOnly ? "is-hidden" : ""}" type="button" data-action="random-media" data-node-id="${node.id}">Random</button>
      </div>
    `;
  }

  if (node.type === "monitor") {
    return `
      <div class="monitor-screen">
        ${renderMonitorPicture(node)}
      </div>
      <div class="monitor-footer">
        <span class="record-dot"></span>
        <span>${getMonitorLabel(node)}</span>
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

function renderSockets(node, direction) {
  const ports = node[`${direction}s`] ?? [];

  return ports.map((port) => {
    const selected = state.selectedSocket
      && state.selectedSocket.nodeId === node.id
      && state.selectedSocket.portId === port.id;

    return `
      <button class="socket is-${direction} ${selected ? "is-selected" : ""}"
        type="button"
        data-action="socket"
        data-node-id="${node.id}"
        data-port-id="${port.id}"
        data-direction="${direction}"
        data-signal="${port.signal}"
        style="top: ${port.top}%; --socket-color: ${signalColors[port.signal] ?? signalColors.SDI}"
        title="${port.label} (${port.signal})">
        <span class="socket-label">${port.label}</span>
      </button>
    `;
  }).join("");
}

function renderSwitcherPanel(switcher) {
  ensureSwitcherAudioState(switcher);

  return `
    <div class="atem-control-panel">
      <div class="atem-panel-label">ATEM Mini Extreme</div>
      ${renderSwitcherTopRow(switcher)}
      <div class="atem-control-grid">
        <section class="atem-source-bank" aria-label="Source Buttons">
          <div class="atem-source-columns" style="grid-template-columns: repeat(${switcher.inputCount}, minmax(0, 1fr))">
            ${Array.from({ length: switcher.inputCount }, (_, index) => renderSourceColumn(switcher, index + 1)).join("")}
          </div>
        </section>

        <section class="atem-extra-bank" aria-label="Media Player und Black">
          <div class="atem-extra-spacer"></div>
          <div class="atem-extra-sources">
            ${["MP1", "MP2", "S/SRC", "BLACK"].map((label) => renderPanelButton(label, "source-extra")).join("")}
          </div>
        </section>

        <section class="atem-transition-bank" aria-label="Transition">
          <div class="atem-transition-top">
            ${renderRightControlPanel()}
          </div>
          <div class="switcher-actions">
            <button class="switcher-action cut" type="button" data-action="cut" data-node-id="${switcher.id}">CUT</button>
            <button class="switcher-action auto" type="button" data-action="auto" data-node-id="${switcher.id}">AUTO</button>
            ${renderPanelButton("FTB", "transition-extra")}
          </div>
        </section>
      </div>
    </div>
  `;
}

function renderRightControlPanel() {
  return `
    <div class="right-control-panel">
      <section class="right-control-group pip-control" aria-label="Picture in Picture">
        <div class="right-group-buttons two-col">
          ${["ON", "OFF", "◱", "◰", "◲", "◳", "▔", "▁"].map((label) => renderPanelButton(label)).join("")}
        </div>
        <strong>PICTURE IN PICTURE</strong>
      </section>

      <div class="right-master-column cut-column">
        <div class="macro-duration-stack">
          <section class="right-control-group macro-control" aria-label="Macro">
            <div class="right-group-buttons two-col">
              ${["1", "2", "3", "4", "5", "6"].map((label) => renderPanelButton(label)).join("")}
            </div>
            <strong>MACRO</strong>
          </section>

          <section class="right-control-group duration-control" aria-label="Duration">
            <div class="right-group-buttons two-col">
              ${["0.5", "1.0", "1.5", "2.0"].map((label) => renderPanelButton(label)).join("")}
            </div>
            <strong>DURATION</strong>
          </section>
        </div>
      </div>

      <div class="right-master-column auto-column">
        <section class="right-control-group effect-control" aria-label="Effect">
          <div class="right-group-buttons two-col">
            ${["↔", "↕", "◀", "▶", "●", "■", "◩", "◪", "▌", "▬", "MIX", "DIP"].map((label) => renderPanelButton(label)).join("")}
          </div>
          <strong>EFFECT</strong>
        </section>
      </div>

      <div class="right-master-column ftb-column">
        <section class="right-control-group video-out-control" aria-label="Video Out">
          <div class="right-group-buttons two-col">
            ${["1", "2", "3", "4", "5", "6", "7", "8", "CLEAN", "PVW", "M/V", "PGM"].map((label) => renderPanelButton(label)).join("")}
          </div>
          <strong>VIDEO OUT</strong>
        </section>
      </div>
    </div>
  `;
}

function renderSwitcherTopRow(switcher) {
  return `
    <div class="atem-top-grid">
      <section class="atem-top-source-bank" aria-label="Select Bus und Audio oben">
        <div class="atem-top-source-columns" style="grid-template-columns: repeat(${switcher.inputCount}, minmax(0, 1fr)) 122px">
          ${renderMicControl(switcher, "mic1", "MIC 1")}
          ${renderMicControl(switcher, "mic2", "MIC 2")}
          ${renderHeadphoneControl()}
          <div class="select-bus-core">
            <div class="select-bus-buttons">
              ${[
                "1", "2", "3", "4", "5", "6", "7", "8", "MP1", "MP2", "COL 1", "COL 2", "BARS", "BLACK",
                "K1 LUM", "K1 CHR", "K1 PTH", "K2 LUM", "K2 CHR", "K2 PTH", "DSK 1", "DSK 2", "DVE 1", "DVE 2", "DIP", "WIPE", "LOGO", "STING"
              ].map((label) => renderPanelButton(label)).join("")}
            </div>
            <strong>SELECT BUS</strong>
          </div>
        </div>
      </section>

      <section class="atem-status-bank" aria-label="Key, Record und Stream">
        <div></div>
        <div class="status-column">
          ${renderStatusControl("KEY 1", ["ON", "OFF"])}
          ${renderStatusControl("DSK 1", ["ON", "OFF"])}
        </div>
        <div class="status-column">
          ${renderStatusControl("RECORD", ["REC", "STOP"])}
          ${renderStatusControl("STREAM", ["ON AIR", "OFF"])}
        </div>
      </section>
    </div>
  `;
}

function renderSourceColumn(switcher, input) {
  const mode = switcher.audio?.sources?.[input] ?? "off";

  return `
    <div class="atem-source-column">
      ${renderSourceTopControls(switcher, input)}
      <div class="atem-source-control-grid">
      ${renderAudioButton(switcher, input, "afv", "AFV", mode)}
      ${renderAudioButton(switcher, input, "reset", "RESET", mode)}
      ${renderAudioButton(switcher, input, "on", "ON", mode)}
      ${renderAudioButton(switcher, input, "off", "OFF", mode)}
        ${renderPanelButton("▲")}
        ${renderPanelButton("▼")}
      </div>
      ${renderSourceButton(switcher, input)}
    </div>
  `;
}

function renderSourceTopControls(switcher, input) {
  return `
    <div class="atem-source-top-controls">
      <div class="atem-source-control-grid">
        ${["GAIN", "FOCUS", "BLACK", "SHUT", "▲", "▼"].map((label) => renderPanelButton(label)).join("")}
      </div>
    </div>
  `;
}

function renderAudioButton(switcher, input, mode, label, activeMode) {
  const isActive = mode !== "reset" && mode !== "off" && activeMode === mode;

  return `
    <button class="panel-button audio-button ${isActive ? "is-active" : ""}"
      type="button"
      data-action="set-audio-source"
      data-node-id="${switcher.id}"
      data-input="${input}"
      data-mode="${mode}"
      aria-pressed="${isActive}">
      ${label}
    </button>
  `;
}

function renderMicControl(switcher, micId, label) {
  const mode = switcher.audio?.mics?.[micId] ?? "off";

  return `
    <div class="top-device-control">
      <div class="top-device-buttons">
        <button class="panel-button audio-button ${mode === "on" ? "is-active" : ""}"
          type="button"
          data-action="set-mic-audio"
          data-node-id="${switcher.id}"
          data-mic="${micId}"
          data-mode="on"
          aria-pressed="${mode === "on"}">ON</button>
        <button class="panel-button audio-button"
          type="button"
          data-action="set-mic-audio"
          data-node-id="${switcher.id}"
          data-mic="${micId}"
          data-mode="off"
          aria-pressed="false">OFF</button>
        ${renderPanelButton("▲")}
        ${renderPanelButton("▼")}
      </div>
      <strong>${label}</strong>
    </div>
  `;
}

function renderHeadphoneControl() {
  return `
    <div class="top-device-control">
      <div class="top-device-buttons">
        ${["MUTE", "RESET", "▲", "▼"].map((label) => renderPanelButton(label)).join("")}
      </div>
      <strong>HEADPHONE</strong>
    </div>
  `;
}

function renderStatusControl(label, buttons) {
  return `
    <div class="top-device-control status-control">
      <div class="top-device-buttons">
        ${buttons.map((buttonLabel) => renderPanelButton(buttonLabel)).join("")}
      </div>
      <strong>${label}</strong>
    </div>
  `;
}

function renderPanelButton(label, variant = "") {
  return `<button class="panel-button ${variant}" type="button" disabled>${label}</button>`;
}

function createSwitcherAudioState(inputCount = 0) {
  return {
    sources: Object.fromEntries(Array.from({ length: inputCount }, (_, index) => [index + 1, "off"])),
    mics: {
      mic1: "off",
      mic2: "off"
    }
  };
}

function ensureSwitcherAudioState(switcher) {
  if (!switcher.audio) {
    switcher.audio = createSwitcherAudioState(switcher.inputCount);
  }

  switcher.audio.sources ??= {};
  switcher.audio.mics ??= {};

  Array.from({ length: switcher.inputCount }, (_, index) => index + 1).forEach((input) => {
    switcher.audio.sources[input] ??= "off";
  });
  switcher.audio.mics.mic1 ??= "off";
  switcher.audio.mics.mic2 ??= "off";
}

function setAudioSourceMode(switcherId, input, mode) {
  const switcher = getNode(switcherId);

  if (switcher?.type !== "switcher") {
    return;
  }

  ensureSwitcherAudioState(switcher);
  switcher.audio.sources[input] = mode === "reset" ? "off" : mode;
  render();
}

function setMicAudioMode(switcherId, micId, mode) {
  const switcher = getNode(switcherId);

  if (switcher?.type !== "switcher") {
    return;
  }

  ensureSwitcherAudioState(switcher);
  switcher.audio.mics[micId] = mode;
  render();
}

function renderSourceButton(switcher, input) {
  const isProgram = switcher.programInput === input;
  const isPreview = switcher.previewInput === input && !isProgram;
  const buttonClass = [
    "source-button",
    isProgram ? "is-program" : "",
    isPreview ? "is-preview" : ""
  ].filter(Boolean).join(" ");

  return `
    <button class="${buttonClass}" type="button" data-action="select-preview" data-node-id="${switcher.id}" data-input="${input}" aria-pressed="${isPreview || isProgram}">
      ${input}
    </button>
  `;
}

function renderMonitorPicture(monitor) {
  const transition = getMonitorTransition(monitor);

  if (transition) {
    return renderTransitionPicture(transition.fromSource, transition.toSource);
  }

  const feed = getMonitorFeed(monitor);

  if (feed.type === "multiview") {
    return renderMultiviewPicture(feed.switcher);
  }

  if (feed.transition) {
    return renderTransitionPicture(feed.transition.fromSource, feed.transition.toSource);
  }

  if (!feed.source) {
    return renderNoSignalPicture();
  }

  return renderSignalPicture(feed.source);
}

function getMonitorTransition(monitor) {
  const inputConnection = state.connections.find((connection) => (
    connection.to.nodeId === monitor.id
  ));

  return inputConnection ? resolveTransitionFromPort(inputConnection.from) : null;
}

function resolveTransitionFromPort(portRef, visited = new Set()) {
  const node = getNode(portRef.nodeId);

  if (!node || visited.has(`${portRef.nodeId}:${portRef.portId}`)) {
    return null;
  }

  visited.add(`${portRef.nodeId}:${portRef.portId}`);

  if (node.type === "switcher" && portRef.portId === "program-out") {
    const ownTransition = getOwnSwitcherTransition(node);

    if (ownTransition) {
      return ownTransition;
    }

    return resolveSwitcherProgramTransition(node, visited);
  }

  if (node.type === "splitter" && portRef.portId.startsWith("output-")) {
    const inputConnection = state.connections.find((connection) => (
      connection.to.nodeId === node.id && connection.to.portId === "input-1"
    ));

    return inputConnection ? resolveTransitionFromPort(inputConnection.from, visited) : null;
  }

  return null;
}

function getOwnSwitcherTransition(switcher) {
  if (state.activeTransition?.switcherId === switcher.id) {
    return state.activeTransition;
  }

  return switcher.transition ?? null;
}

function resolveSwitcherProgramTransition(switcher, visited = new Set()) {
  if (!switcher?.programInput) {
    return null;
  }

  const programConnection = state.connections.find((connection) => (
    connection.to.nodeId === switcher.id && connection.to.portId === `input-${switcher.programInput}`
  ));

  return programConnection ? resolveTransitionFromPort(programConnection.from, visited) : null;
}

function renderTransitionPicture(fromSource, toSource) {
  return `
    <div class="transition-picture">
      <div class="transition-layer is-from">
        ${fromSource ? renderSignalPicture(fromSource) : renderNoSignalPicture()}
      </div>
      <div class="transition-layer is-to">
        ${toSource ? renderSignalPicture(toSource) : renderNoSignalPicture()}
      </div>
    </div>
  `;
}

function renderSignalPicture(source) {
  if (source.media) {
    return renderMediaSurface(source);
  }

  return `
    <div class="test-picture" style="background: ${source.pattern ?? "#20262d"}">
      <span>${source.title}</span>
    </div>
  `;
}

function renderMediaSurface(source) {
  const media = source.media ?? createPlaceholderMedia(source.title);

  if (media.kind === "image") {
    return `
      <div class="media-surface">
        <img src="${media.url}" alt="${media.name}">
      </div>
    `;
  }

  if (media.kind === "video") {
    return `
      <div class="media-surface">
        <video src="${media.url}" muted loop autoplay playsinline></video>
      </div>
    `;
  }

  if (media.kind === "processing") {
    return `
      <div class="media-surface file-placeholder">
        <strong>Preview</strong>
        <span>${media.name} wird vorbereitet...</span>
      </div>
    `;
  }

  return `
    <div class="media-surface file-placeholder">
      <strong>${media.label}</strong>
      <span>${media.name}</span>
    </div>
  `;
}

function createPlaceholderMedia(name) {
  return {
    kind: "file",
    label: "HDMI",
    name
  };
}

function renderNoSignalPicture() {
  return `
    <div class="test-picture no-signal">
      <span>No Signal</span>
    </div>
  `;
}

function renderMultiviewPicture(switcher) {
  const cells = [
    { label: "PGM", source: getSwitcherProgramSource(switcher), className: "is-program" },
    { label: "PVW", source: getSwitcherPreviewSource(switcher), className: "is-preview" },
    ...Array.from({ length: switcher.inputCount }, (_, index) => {
      const input = index + 1;
      return {
        label: `IN ${input}`,
        source: getSwitcherInputSource(switcher, input),
        className: switcher.programInput === input ? "is-program" : switcher.previewInput === input ? "is-preview" : ""
      };
    })
  ];

  return `
    <div class="multiview-picture">
      ${cells.map((cell) => `
        <div class="multiview-cell ${cell.className}" style="background: ${cell.source ? cell.source.pattern : "#101418"}">
          <strong>${cell.label}</strong>
          <span>${cell.source ? cell.source.shortName : "No Signal"}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function getActiveSwitcher() {
  return state.nodes.find((node) => node.id === state.activeSwitcherId && node.type === "switcher")
    ?? state.nodes.find((node) => node.type === "switcher");
}

function getProgramStatus() {
  const switcher = getActiveSwitcher();

  if (!switcher?.programInput) {
    return "Keine Program-Quelle";
  }

  const source = getSwitcherProgramSource(switcher);
  return `PGM: ${switcher.title} Input ${switcher.programInput}${source ? ` / ${source.shortName}` : " / No Signal"}`;
}

function getSwitcherReadout(switcher) {
  const program = getSwitcherProgramSource(switcher);
  const preview = getSwitcherPreviewSource(switcher);
  const programLabel = switcher.programInput ? `PGM ${switcher.programInput}${program ? ` ${program.shortName}` : " No Signal"}` : "PGM -";
  const previewLabel = switcher.previewInput ? `PVW ${switcher.previewInput}${preview ? ` ${preview.shortName}` : " No Signal"}` : "PVW -";

  return `${programLabel} / ${previewLabel}`;
}

function getMonitorLabel(monitor) {
  const feed = getMonitorFeed(monitor);

  if (feed.type === "multiview") {
    return "Multiview";
  }

  if (!feed.source) {
    return feed.connected ? "Program: No Signal" : "Nicht verkabelt";
  }

  return `Program: ${feed.source.shortName}`;
}

function getMonitorFeed(monitor) {
  const inputConnection = state.connections.find((connection) => (
    connection.to.nodeId === monitor.id
  ));

  if (!inputConnection) {
    return { type: "none", connected: false, source: null };
  }

  const fromNode = getNode(inputConnection.from.nodeId);

  if (fromNode?.type === "switcher") {
    if (inputConnection.from.portId === "multiview-out") {
      return { type: "multiview", connected: true, switcher: fromNode, source: null };
    }

    const activeTransition = resolveTransitionFromPort(inputConnection.from);

    if (activeTransition && inputConnection.from.portId === "program-out") {
      return { type: "program", connected: true, transition: activeTransition, source: null };
    }

    return { type: "program", connected: true, source: getSwitcherProgramSource(fromNode) };
  }

  return { type: "program", connected: true, source: resolveSourceFromPort(inputConnection.from) };
}

function getSwitcherProgramSource(switcher) {
  return switcher?.programInput ? getSwitcherInputSource(switcher, switcher.programInput) : null;
}

function getSwitcherPreviewSource(switcher) {
  return switcher?.previewInput ? getSwitcherInputSource(switcher, switcher.previewInput) : null;
}

function getSwitcherInputSource(switcher, input) {
  return resolveNodeInputSource(switcher, `input-${input}`);
}

function resolveNodeInputSource(node, portId) {
  const connection = state.connections.find((item) => (
    item.to.nodeId === node.id && item.to.portId === portId
  ));

  return connection ? resolveSourceFromPort(connection.from) : null;
}

function resolveSourceFromPort(portRef) {
  const node = getNode(portRef.nodeId);

  if (!node) {
    return null;
  }

  if (node.type === "camera") {
    return node;
  }

  if (node.type === "computer") {
    return node;
  }

  if (node.type === "splitter") {
    return resolveNodeInputSource(node, "input-1");
  }

  if (node.type === "switcher" && portRef.portId === "program-out") {
    return getSwitcherProgramSource(node);
  }

  return null;
}

function renderLines() {
  const workspaceRect = workspace.getBoundingClientRect();
  cableLayer.setAttribute("viewBox", `0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`);
  cableLayer.innerHTML = "";

  state.connections.forEach((connection) => {
    const fromSocket = getSocketElement(connection.from);
    const toSocket = getSocketElement(connection.to);

    if (!fromSocket || !toSocket) {
      return;
    }

    const from = getSocketCenter(fromSocket, workspaceRect);
    const to = getSocketCenter(toSocket, workspaceRect);
    addCable(from, to, getConnectionLabel(connection), getConnectionClass(connection), connection.signal);
  });

  if (activeDrag?.type === "cable") {
    addCable(activeDrag.start, activeDrag.current, "", "is-preview", activeDrag.from.signal);
  }
}

function getSocketElement(socket) {
  return deviceLayer.querySelector(`[data-node-id="${socket.nodeId}"][data-port-id="${socket.portId}"]`);
}

function getSocketCenter(socket, workspaceRect) {
  const rect = socket.getBoundingClientRect();

  return {
    x: (rect.left - workspaceRect.left + rect.width / 2) / state.zoom,
    y: (rect.top - workspaceRect.top + rect.height / 2) / state.zoom
  };
}

function addCable(start, end, label, className, signal) {
  const midX = start.x + (end.x - start.x) / 2;
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");

  path.setAttribute("d", `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`);
  path.style.stroke = signalColors[signal] ?? signalColors.SDI;
  if (className) {
    path.classList.add(className);
  }

  text.setAttribute("x", String(midX - 22));
  text.setAttribute("y", String((start.y + end.y) / 2 - 8));
  text.textContent = label;

  cableLayer.append(path, text);
}

function getConnectionClass(connection) {
  const fromNode = getNode(connection.from.nodeId);
  const toNode = getNode(connection.to.nodeId);

  if (fromNode?.type === "switcher" && connection.from.portId === "program-out") {
    return "is-program";
  }

  if (toNode?.type === "switcher") {
    if (connection.to.portId === `input-${toNode.programInput}`) {
      return "is-program";
    }

    if (connection.to.portId === `input-${toNode.previewInput}`) {
      return "is-preview";
    }
  }

  return "";
}

function getConnectionLabel(connection) {
  const toNode = getNode(connection.to.nodeId);

  if (toNode?.type === "switcher") {
    return connection.to.portId.replace("input-", "In ");
  }

  if (connection.from.portId === "multiview-out") {
    return "MV";
  }

  if (connection.from.portId === "program-out") {
    return "PGM";
  }

  return connection.signal;
}

function toggleCameraView(nodeId) {
  const camera = getNode(nodeId);

  if (camera?.type === "camera") {
    camera.viewMode = camera.viewMode === "signal" ? "photo" : "signal";
    render();
  }
}

function setRandomMedia(nodeId) {
  const node = getNode(nodeId);

  if (!node) {
    return;
  }

  node.media = {
    kind: "image",
    name: "Picsum Random",
    url: `https://picsum.photos/seed/${Date.now()}-${node.id}/960/540`
  };
  render();
}

async function setDroppedFileMedia(nodeId, file) {
  const node = getNode(nodeId);

  if (!node || !file) {
    return;
  }

  revokeNodeMediaUrl(node);

  if (file.type.startsWith("image/")) {
    node.media = {
      kind: "image",
      name: file.name,
      url: await fileToDataUrl(file),
      embedded: true
    };
  } else if (file.type.startsWith("video/")) {
    node.media = { kind: "processing", name: file.name };
    render();

    try {
      node.media = await createVideoPreviewMedia(file);
    } catch (error) {
      try {
        node.media = await createEmbeddedOriginalVideoMedia(file);
      } catch (embedError) {
        try {
          node.media = await createVideoPosterMedia(file);
        } catch (posterError) {
          node.media = {
            kind: "file",
            label: "Video",
            name: file.name
          };
        }
      }
    }
  } else {
    node.media = {
      kind: "file",
      label: getFileLabel(file),
      name: file.name
    };
  }

  render();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

async function createEmbeddedOriginalVideoMedia(file) {
  if (file.size > ORIGINAL_VIDEO_EMBED_LIMIT_BYTES) {
    throw new Error("Video is too large for JSON embedding.");
  }

  return {
    kind: "video",
    name: file.name,
    originalName: file.name,
    url: await fileToDataUrl(file),
    embedded: true,
    embeddedOriginal: true
  };
}

function createVideoPreviewMedia(file) {
  return new Promise((resolve, reject) => {
    if (!("MediaRecorder" in window) || !HTMLCanvasElement.prototype.captureStream) {
      reject(new Error("Video preview recording is not supported."));
      return;
    }

    const sourceUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const mimeType = getSupportedVideoPreviewType();

    if (!context || !mimeType) {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error("No supported video preview encoder."));
      return;
    }

    let recorder = null;
    let frameRequest = null;
    let stopTimer = null;
    let stream = null;
    let previewSeconds = VIDEO_PREVIEW_SECONDS;
    const chunks = [];

    const cleanup = () => {
      if (frameRequest) {
        cancelAnimationFrame(frameRequest);
      }

      if (stopTimer) {
        window.clearTimeout(stopTimer);
      }

      video.pause();
      stream?.getTracks().forEach((track) => track.stop());
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(sourceUrl);
    };

    const stopRecording = () => {
      if (recorder?.state === "recording") {
        recorder.stop();
      }
    };

    const drawFrame = () => {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      frameRequest = requestAnimationFrame(drawFrame);
    };

    video.addEventListener("loadedmetadata", async () => {
      const aspectRatio = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9;
      canvas.width = VIDEO_PREVIEW_WIDTH;
      canvas.height = Math.round(VIDEO_PREVIEW_WIDTH / aspectRatio);

      try {
        stream = canvas.captureStream(VIDEO_PREVIEW_FPS);
        recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 900000 });
        previewSeconds = Number.isFinite(video.duration)
          ? Math.min(VIDEO_PREVIEW_SECONDS, video.duration)
          : VIDEO_PREVIEW_SECONDS;

        recorder.addEventListener("dataavailable", (event) => {
          if (event.data.size) {
            chunks.push(event.data);
          }
        });

        recorder.addEventListener("stop", async () => {
          cleanup();
          const blob = new Blob(chunks, { type: mimeType });
          resolve({
            kind: "video",
            name: `${file.name} Preview`,
            originalName: file.name,
            url: await blobToDataUrl(blob),
            embedded: true,
            previewSeconds: Math.ceil(previewSeconds)
          });
        });

        recorder.addEventListener("error", () => {
          cleanup();
          reject(new Error("Video preview recording failed."));
        });

        video.currentTime = 0;
        drawFrame();
        recorder.start();
        await video.play();
        stopTimer = window.setTimeout(stopRecording, previewSeconds * 1000);
      } catch (error) {
        cleanup();
        reject(error);
      }
    }, { once: true });

    video.addEventListener("ended", stopRecording);
    video.addEventListener("error", () => {
      cleanup();
      reject(new Error("Video file could not be loaded."));
    }, { once: true });

    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = sourceUrl;
  });
}

function createVideoPosterMedia(file) {
  return new Promise((resolve, reject) => {
    const sourceUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error("No canvas context available."));
      return;
    }

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(sourceUrl);
    };

    video.addEventListener("loadeddata", () => {
      const aspectRatio = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9;
      canvas.width = VIDEO_PREVIEW_WIDTH;
      canvas.height = Math.round(VIDEO_PREVIEW_WIDTH / aspectRatio);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL("image/jpeg", 0.82);
      cleanup();
      resolve({
        kind: "image",
        name: `${file.name} Poster`,
        originalName: file.name,
        url,
        embedded: true
      });
    }, { once: true });

    video.addEventListener("error", () => {
      cleanup();
      reject(new Error("Video poster could not be created."));
    }, { once: true });

    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = sourceUrl;
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(blob);
  });
}

function getSupportedVideoPreviewType() {
  return [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm"
  ].find((type) => MediaRecorder.isTypeSupported(type));
}

function getFileLabel(file) {
  const extension = file.name.split(".").pop()?.toUpperCase();

  if (extension === "PPT" || extension === "PPTX" || extension === "KEY") {
    return "Slides";
  }

  if (extension === "PDF") {
    return "PDF";
  }

  return extension || file.type || "File";
}

function revokeNodeMediaUrl(node) {
  if (node.media?.url?.startsWith("blob:")) {
    URL.revokeObjectURL(node.media.url);
  }
}

function connectSockets(firstSocket, secondSocket) {
  const from = firstSocket.direction === "output" ? firstSocket : secondSocket;
  const to = firstSocket.direction === "input" ? firstSocket : secondSocket;

  if (!isValidConnection(from, to)) {
    state.selectedSocket = null;
    render();
    return;
  }

  state.connections = state.connections.filter((connection) => !(
    (connection.from.nodeId === from.nodeId && connection.from.portId === from.portId)
    || (connection.to.nodeId === to.nodeId && connection.to.portId === to.portId)
  ));
  state.connections.push({
    signal: from.signal,
    from: { nodeId: from.nodeId, portId: from.portId },
    to: { nodeId: to.nodeId, portId: to.portId }
  });
  state.selectedSocket = null;
  render();
}

function selectNode(nodeId) {
  if (state.readOnly || state.selectedNodeId === nodeId) {
    return;
  }

  state.selectedNodeId = nodeId;
  state.selectedSocket = null;
  render();
}

function copySelectedNode() {
  const node = getNode(state.selectedNodeId);

  if (!node || state.readOnly) {
    return;
  }

  copiedNodeSnapshot = createNodeClipboardSnapshot(node);
}

function pasteCopiedNode() {
  if (!copiedNodeSnapshot || state.readOnly) {
    return;
  }

  const node = createNodeFromClipboardSnapshot(copiedNodeSnapshot);
  state.nodes.push(node);
  state.nextId += 1;
  state.selectedNodeId = node.id;
  state.selectedSocket = null;

  if (node.type === "switcher" && !state.activeSwitcherId) {
    state.activeSwitcherId = node.id;
  }

  copiedNodeSnapshot = createNodeClipboardSnapshot(node);
  render();
}

function createNodeClipboardSnapshot(node) {
  return {
    ...node,
    inputs: (node.inputs ?? []).map((port) => ({ ...port })),
    outputs: (node.outputs ?? []).map((port) => ({ ...port })),
    media: node.media ? { ...node.media } : node.media,
    audio: node.audio ? {
      sources: { ...node.audio.sources },
      mics: { ...node.audio.mics }
    } : node.audio,
    transition: null,
    isTransitioning: false
  };
}

function createNodeFromClipboardSnapshot(snapshot) {
  const id = `${snapshot.type}-${state.nextId}`;
  const position = {
    x: clamp((snapshot.position?.x ?? 0) + 36, 0, WORLD_WIDTH - (snapshot.width ?? 280)),
    y: clamp((snapshot.position?.y ?? 0) + 36, 0, WORLD_HEIGHT - 220)
  };
  const node = {
    ...snapshot,
    id,
    position,
    inputs: (snapshot.inputs ?? []).map((port) => ({ ...port })),
    outputs: (snapshot.outputs ?? []).map((port) => ({ ...port })),
    media: snapshot.media ? { ...snapshot.media } : snapshot.media,
    audio: snapshot.audio ? {
      sources: { ...snapshot.audio.sources },
      mics: { ...snapshot.audio.mics }
    } : snapshot.audio,
    transition: null,
    isTransitioning: false
  };

  if (node.type === "switcher") {
    node.programInput = null;
    node.previewInput = clamp(node.previewInput ?? 1, 1, Math.max(node.inputCount ?? 1, 1));
    ensureSwitcherAudioState(node);
  }

  return node;
}

function isTypingTarget(target) {
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function isValidConnection(from, to) {
  return from.direction === "output"
    && to.direction === "input"
    && from.nodeId !== to.nodeId
    && from.signal === to.signal;
}

function removeNode(nodeId) {
  const removedNode = getNode(nodeId);
  if (removedNode) {
    revokeNodeMediaUrl(removedNode);
  }

  state.nodes = state.nodes.filter((node) => node.id !== nodeId);
  state.connections = state.connections.filter((connection) => (
    connection.from.nodeId !== nodeId && connection.to.nodeId !== nodeId
  ));

  if (state.activeSwitcherId === nodeId) {
    state.activeSwitcherId = getActiveSwitcher()?.id ?? null;
  }

  if (state.selectedNodeId === nodeId) {
    state.selectedNodeId = null;
  }

  render();
}

function selectPreview(switcherId, input) {
  const switcher = getNode(switcherId);

  if (switcher?.type === "switcher") {
    state.activeSwitcherId = switcher.id;
    switcher.previewInput = input;
    render();
  }
}

function cut(switcherId) {
  const switcher = getNode(switcherId);

  if (switcher?.type === "switcher" && switcher.previewInput) {
    state.activeSwitcherId = switcher.id;
    switcher.programInput = switcher.previewInput;
    render();
  }
}

function auto(switcherId) {
  const switcher = getNode(switcherId);

  if (!switcher?.previewInput || switcher.isTransitioning) {
    return;
  }

  state.activeSwitcherId = switcher.id;
  const previousProgram = switcher.programInput;
  const nextProgram = switcher.previewInput;
  switcher.transition = {
    switcherId: switcher.id,
    fromInput: previousProgram,
    toInput: nextProgram,
    fromSource: previousProgram ? getSwitcherInputSource(switcher, previousProgram) : null,
    toSource: getSwitcherInputSource(switcher, nextProgram)
  };
  state.activeTransition = switcher.transition;
  switcher.isTransitioning = true;
  render();

  window.setTimeout(() => {
    switcher.programInput = nextProgram;
    switcher.previewInput = previousProgram ?? switcher.previewInput;
    switcher.isTransitioning = false;
    switcher.transition = null;
    state.activeTransition = null;
    render();
  }, 650);
}

function getNode(nodeId) {
  return state.nodes.find((node) => node.id === nodeId);
}

function getShortName(title) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function getNodePosition(nodeId) {
  return getNode(nodeId)?.position;
}

function setNodePosition(nodeId, x, y) {
  const position = getNodePosition(nodeId);

  if (position) {
    position.x = x;
    position.y = y;
  }
}

function openEditGear(nodeId) {
  const node = getNode(nodeId);

  if (!node) {
    return;
  }

  editDraft = {
    nodeId,
    title: node.title,
    inputs: node.inputs.map((port) => ({ ...port })),
    outputs: node.outputs.map((port) => ({ ...port }))
  };
  editGearHeading.textContent = node.title;
  editGearName.value = node.title;
  renderEditPortList();
  editGearDialog.showModal();
}

function renderEditPortList() {
  if (!editDraft) {
    editPortList.innerHTML = "";
    return;
  }

  const rows = [
    ...editDraft.inputs.map((port) => ({ ...port, direction: "input" })),
    ...editDraft.outputs.map((port) => ({ ...port, direction: "output" }))
  ];

  editPortList.innerHTML = rows.map((port) => `
    <div class="port-row">
      <span>${port.direction === "input" ? "Input" : "Output"}</span>
      <strong>${port.label}</strong>
      <em>${port.signal}</em>
      <button class="small-button danger" type="button" data-edit-remove-port="${port.direction}:${port.id}">Entfernen</button>
    </div>
  `).join("");
}

function addPortToEditDraft() {
  if (!editDraft) {
    return;
  }

  const direction = document.querySelector("#editPortDirection").value;
  const signal = document.querySelector("#editPortSignal").value;
  const labelField = document.querySelector("#editPortLabel");
  const ports = direction === "input" ? editDraft.inputs : editDraft.outputs;
  const portId = `${direction}-${Date.now()}`;
  const label = labelField.value.trim() || `${signal} ${direction === "input" ? "In" : "Out"} ${ports.length + 1}`;

  ports.push({ id: portId, label, signal, top: 50 });
  labelField.value = "";
  normalizePortPositions(editDraft.inputs);
  normalizePortPositions(editDraft.outputs);
  renderEditPortList();
}

function removePortFromEditDraft(direction, portId) {
  if (!editDraft) {
    return;
  }

  const key = direction === "input" ? "inputs" : "outputs";
  editDraft[key] = editDraft[key].filter((port) => port.id !== portId);
  normalizePortPositions(editDraft.inputs);
  normalizePortPositions(editDraft.outputs);
  renderEditPortList();
}

function saveEditGear() {
  const node = editDraft ? getNode(editDraft.nodeId) : null;

  if (!node) {
    return;
  }

  const inputIds = new Set(editDraft.inputs.map((port) => port.id));
  const outputIds = new Set(editDraft.outputs.map((port) => port.id));

  node.title = editGearName.value.trim() || node.title;
  node.shortName = node.type === "camera" ? node.shortName : getShortName(node.title);
  node.inputs = editDraft.inputs.map((port) => ({ ...port }));
  node.outputs = editDraft.outputs.map((port) => ({ ...port }));
  node.inputCount = node.type === "switcher"
    ? node.inputs.filter((port) => port.id.startsWith("input-")).length
    : node.inputCount;
  node.previewInput = node.type === "switcher" ? clamp(node.previewInput ?? 1, 1, Math.max(node.inputCount, 1)) : node.previewInput;
  node.programInput = node.type === "switcher" && node.programInput ? clamp(node.programInput, 1, Math.max(node.inputCount, 1)) : node.programInput;
  if (node.type === "switcher") {
    ensureSwitcherAudioState(node);
  }
  state.connections = state.connections.filter((connection) => {
    if (connection.from.nodeId === node.id && !outputIds.has(connection.from.portId)) {
      return false;
    }

    if (connection.to.nodeId === node.id && !inputIds.has(connection.to.portId)) {
      return false;
    }

    return true;
  });
  editGearDialog.close();
  editDraft = null;
  render();
}

function normalizePortPositions(ports) {
  if (!ports.length) {
    return;
  }

  const step = ports.length > 1 ? 64 / (ports.length - 1) : 0;
  ports.forEach((port, index) => {
    port.top = ports.length === 1 ? 50 : 18 + index * step;
  });
}

function serializeSetup() {
  return {
    version: 1,
    nextId: state.nextId,
    zoom: state.zoom,
    activeSwitcherId: state.activeSwitcherId,
    nodes: state.nodes.map((node) => ({
      ...node,
      media: node.media?.url?.startsWith("blob:")
        ? { kind: "file", label: node.media.label ?? "File", name: node.media.name }
        : node.media
    })),
    connections: state.connections
  };
}

function loadSetup(setup, readOnly = state.readOnly) {
  state.nextId = setup.nextId ?? 1;
  state.zoom = setup.zoom ?? 1;
  state.activeSwitcherId = setup.activeSwitcherId ?? null;
  state.nodes = (setup.nodes ?? []).map((node) => ({
    ...node,
    inputs: (node.inputs ?? []).map((port) => ({ ...port })),
    outputs: (node.outputs ?? []).map((port) => ({ ...port }))
  }));
  state.nodes.filter((node) => node.type === "switcher").forEach(ensureSwitcherAudioState);
  state.connections = (setup.connections ?? []).map((connection) => ({ ...connection }));
  state.readOnly = readOnly;
  render();
}

function exportSetup() {
  const blob = new Blob([JSON.stringify(serializeSetup(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `broadcast-setup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importSetup(file) {
  const reader = new FileReader();

  reader.addEventListener("load", () => {
    loadSetup(JSON.parse(String(reader.result)), false);
  });
  reader.readAsText(file);
}

function createShareLink() {
  const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(serializeSetup())))));
  const url = `${location.origin}${location.pathname}#readonly=1&plan=${encoded}`;

  navigator.clipboard?.writeText(url);
  window.prompt("Read-only Link", url);
}

function loadSetupFromHash() {
  const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
  const encoded = hash.get("plan");

  if (!encoded) {
    return false;
  }

  const setup = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(encoded)))));
  loadSetup(setup, hash.get("readonly") === "1");
  return true;
}

document.querySelector("#openGearLibrary").addEventListener("click", () => {
  if (state.readOnly) {
    return;
  }

  gearDialog.showModal();
});

gearList.addEventListener("click", (event) => {
  if (state.readOnly) {
    return;
  }

  const button = event.target.closest("[data-add-gear]");

  if (button) {
    addGear(button.dataset.addGear);
    gearDialog.close();
  }
});

gearSearch.addEventListener("input", (event) => {
  gearFilter = event.target.value;
  renderGearList();
});

document.querySelector("#exportSetup").addEventListener("click", exportSetup);

document.querySelector("#importSetup").addEventListener("click", () => {
  if (!state.readOnly) {
    importSetupFile.click();
  }
});

importSetupFile.addEventListener("change", (event) => {
  const file = event.target.files?.[0];

  if (file) {
    importSetup(file);
  }

  event.target.value = "";
});

document.querySelector("#shareSetup").addEventListener("click", createShareLink);

document.querySelector("#addCustomGear").addEventListener("click", () => {
  if (state.readOnly) {
    return;
  }

  const name = document.querySelector("#customGearName").value.trim() || "Custom Gear";
  const signal = document.querySelector("#customGearSignal").value;
  const inputCount = clamp(Number(document.querySelector("#customGearInputs").value), 0, 12);
  const outputCount = clamp(Number(document.querySelector("#customGearOutputs").value), 0, 12);
  const customTemplate = {
    type: "custom",
    title: name,
    kicker: "Custom",
    width: 280,
    inputs: makeNumberedPorts("input", inputCount, signal, signal, 26, inputCount > 1 ? 56 / Math.max(inputCount - 1, 1) : 0),
    outputs: makeNumberedPorts("output", outputCount, signal, signal, 26, outputCount > 1 ? 56 / Math.max(outputCount - 1, 1) : 0)
  };

  addGear(`custom-${state.nextId}`, customTemplate);
  gearDialog.close();
});

document.querySelector("#addEditPort").addEventListener("click", addPortToEditDraft);

document.querySelector("#saveEditGear").addEventListener("click", saveEditGear);

editPortList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-edit-remove-port]");

  if (!button) {
    return;
  }

  const [direction, portId] = button.dataset.editRemovePort.split(":");
  removePortFromEditDraft(direction, portId);
});

document.querySelector(".zoom-controls").addEventListener("click", (event) => {
  const button = event.target.closest("[data-zoom]");

  if (!button) {
    return;
  }

  if (button.dataset.zoom === "in") {
    setZoom(state.zoom + ZOOM_STEP);
  }

  if (button.dataset.zoom === "out") {
    setZoom(state.zoom - ZOOM_STEP);
  }

  if (button.dataset.zoom === "reset") {
    setZoom(1);
  }
});

workspaceViewport.addEventListener("wheel", (event) => {
  if (!event.ctrlKey && !event.metaKey) {
    return;
  }

  event.preventDefault();
  const zoomFactor = 1 - event.deltaY * 0.0015;
  setZoom(state.zoom * zoomFactor, {
    clientX: event.clientX,
    clientY: event.clientY
  });
}, { passive: false });

deviceLayer.addEventListener("click", (event) => {
  const clickedNode = event.target.closest("article.node");

  if (!state.readOnly && clickedNode) {
    state.selectedNodeId = clickedNode.dataset.nodeId;
  }

  const randomTarget = event.target.closest("[data-action='random-media']");

  if (state.readOnly && randomTarget) {
    return;
  }

  if (randomTarget) {
    setRandomMedia(randomTarget.dataset.nodeId);
    return;
  }

  const actionTarget = event.target.closest("[data-action]");

  if (!actionTarget) {
    if (clickedNode) {
      state.selectedSocket = null;
      render();
    }

    return;
  }

  const action = actionTarget.dataset.action;
  const allowedReadOnlyActions = ["select-preview", "cut", "auto"];

  if (state.readOnly && !allowedReadOnlyActions.includes(action)) {
    return;
  }

  if (action === "socket") {
    if (suppressNextSocketClick) {
      suppressNextSocketClick = false;
      return;
    }

    const socket = getSocketData(actionTarget);

    if (state.selectedSocket) {
      connectSockets(state.selectedSocket, socket);
    } else {
      state.selectedSocket = socket;
      render();
    }
  }

  if (action === "select-preview") {
    selectPreview(actionTarget.dataset.nodeId, Number(actionTarget.dataset.input));
  }

  if (action === "set-audio-source") {
    setAudioSourceMode(actionTarget.dataset.nodeId, Number(actionTarget.dataset.input), actionTarget.dataset.mode);
  }

  if (action === "set-mic-audio") {
    setMicAudioMode(actionTarget.dataset.nodeId, actionTarget.dataset.mic, actionTarget.dataset.mode);
  }

  if (action === "toggle-camera-view") {
    toggleCameraView(actionTarget.dataset.nodeId);
  }

  if (action === "random-media") {
    setRandomMedia(actionTarget.dataset.nodeId);
  }

  if (action === "cut") {
    cut(actionTarget.dataset.nodeId);
  }

  if (action === "auto") {
    auto(actionTarget.dataset.nodeId);
  }

  if (action === "remove-node") {
    removeNode(actionTarget.dataset.nodeId);
  }

  if (action === "edit-node") {
    openEditGear(actionTarget.dataset.nodeId);
  }
});

deviceLayer.addEventListener("dragover", (event) => {
  if (state.readOnly) {
    return;
  }

  const node = event.target.closest("[data-node-id]");

  if (!node || !event.dataTransfer?.types.includes("Files")) {
    return;
  }

  event.preventDefault();
  node.classList.add("is-file-hover");
});

deviceLayer.addEventListener("dragleave", (event) => {
  const node = event.target.closest("[data-node-id]");

  if (node) {
    node.classList.remove("is-file-hover");
  }
});

deviceLayer.addEventListener("drop", (event) => {
  if (state.readOnly) {
    return;
  }

  const node = event.target.closest("[data-node-id]");
  const file = event.dataTransfer?.files?.[0];

  if (!node || !file) {
    return;
  }

  event.preventDefault();
  node.classList.remove("is-file-hover");
  setDroppedFileMedia(node.dataset.nodeId, file);
});

deviceLayer.addEventListener("pointerdown", (event) => {
  if (state.readOnly) {
    return;
  }

  const socketButton = event.target.closest("[data-action='socket']");

  if (socketButton) {
    startCableDrag(event, socketButton);
    return;
  }

  if (event.target.closest("button")) {
    return;
  }

  const handle = event.target.closest(".drag-handle");
  const node = event.target.closest("[data-node-id]");

  if (!handle || !node) {
    return;
  }

  const nodeId = node.dataset.nodeId;
  const position = getNodePosition(nodeId);

  if (!position) {
    return;
  }

  state.selectedNodeId = nodeId;
  state.selectedSocket = null;
  node.setPointerCapture(event.pointerId);
  node.classList.add("is-dragging");

  activeDrag = {
    type: "node",
    nodeId,
    node,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: position.x,
    originY: position.y
  };
});

deviceLayer.addEventListener("pointermove", (event) => {
  if (!activeDrag || activeDrag.pointerId !== event.pointerId) {
    return;
  }

  if (activeDrag.type === "cable") {
    activeDrag.current = getWorkspacePoint(event);
    renderLines();
    return;
  }

  const nodeRect = activeDrag.node.getBoundingClientRect();
  const nodeWidth = nodeRect.width / state.zoom;
  const nodeHeight = nodeRect.height / state.zoom;
  const nextX = clamp(activeDrag.originX + (event.clientX - activeDrag.startX) / state.zoom, 0, Math.max(WORLD_WIDTH - nodeWidth, 0));
  const nextY = clamp(activeDrag.originY + (event.clientY - activeDrag.startY) / state.zoom, 0, Math.max(WORLD_HEIGHT - nodeHeight, 0));

  setNodePosition(activeDrag.nodeId, nextX, nextY);
  activeDrag.node.style.transform = `translate(${nextX}px, ${nextY}px)`;
  renderLines();
});

deviceLayer.addEventListener("pointerup", endDrag);
deviceLayer.addEventListener("pointercancel", endDrag);

function endDrag(event) {
  if (!activeDrag || activeDrag.pointerId !== event.pointerId) {
    return;
  }

  if (activeDrag.type === "cable") {
    endCableDrag(event);
    return;
  }

  activeDrag.node.classList.remove("is-dragging");
  activeDrag.node.releasePointerCapture(event.pointerId);
  activeDrag = null;
}

function startCableDrag(event, socketButton) {
  if (socketButton.dataset.direction !== "output") {
    return;
  }

  const workspaceRect = workspace.getBoundingClientRect();
  const start = getSocketCenter(socketButton, workspaceRect);

  socketButton.setPointerCapture(event.pointerId);
  state.selectedSocket = null;
  activeDrag = {
    type: "cable",
    pointerId: event.pointerId,
    socketButton,
    from: getSocketData(socketButton),
    start,
    current: start
  };
  renderLines();
}

function endCableDrag(event) {
  const cableDrag = activeDrag;
  const dropTarget = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-action='socket']");

  activeDrag = null;
  suppressNextSocketClick = true;

  if (dropTarget?.dataset.direction === "input") {
    connectSockets(cableDrag.from, getSocketData(dropTarget));
  } else {
    render();
  }

  if (cableDrag.socketButton.hasPointerCapture(event.pointerId)) {
    cableDrag.socketButton.releasePointerCapture(event.pointerId);
  }
}

function getSocketData(socketButton) {
  return {
    nodeId: socketButton.dataset.nodeId,
    portId: socketButton.dataset.portId,
    direction: socketButton.dataset.direction,
    signal: socketButton.dataset.signal
  };
}

function getWorkspacePoint(event) {
  const workspaceRect = workspace.getBoundingClientRect();

  return {
    x: (event.clientX - workspaceRect.left) / state.zoom,
    y: (event.clientY - workspaceRect.top) / state.zoom
  };
}

function setZoom(nextZoom, anchor) {
  const previousZoom = state.zoom;
  const clampedZoom = Math.round(clamp(nextZoom, MIN_ZOOM, MAX_ZOOM) * 100) / 100;

  if (clampedZoom === previousZoom) {
    return;
  }

  const viewportRect = workspaceViewport.getBoundingClientRect();
  const anchorOffset = anchor
    ? {
        x: anchor.clientX - viewportRect.left,
        y: anchor.clientY - viewportRect.top
      }
    : {
        x: workspaceViewport.clientWidth / 2,
        y: workspaceViewport.clientHeight / 2
      };
  const viewportCenter = {
    x: workspaceViewport.scrollLeft + anchorOffset.x,
    y: workspaceViewport.scrollTop + anchorOffset.y
  };
  const worldCenter = {
    x: viewportCenter.x / previousZoom,
    y: viewportCenter.y / previousZoom
  };

  state.zoom = clampedZoom;
  renderZoom();
  renderLines();

  workspaceViewport.scrollLeft = worldCenter.x * state.zoom - anchorOffset.x;
  workspaceViewport.scrollTop = worldCenter.y * state.zoom - anchorOffset.y;
}

function renderZoom() {
  workspace.style.transform = `scale(${state.zoom})`;
  workspaceScaleShell.style.width = `${WORLD_WIDTH * state.zoom}px`;
  workspaceScaleShell.style.height = `${WORLD_HEIGHT * state.zoom}px`;
  zoomReadout.textContent = `${Math.round(state.zoom * 100)}%`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

document.addEventListener("keydown", (event) => {
  if (!event.metaKey || event.altKey || event.ctrlKey || event.shiftKey || isTypingTarget(event.target)) {
    return;
  }

  if (event.key.toLowerCase() === "c") {
    copySelectedNode();
    event.preventDefault();
  }

  if (event.key.toLowerCase() === "v") {
    pasteCopiedNode();
    event.preventDefault();
  }
});

workspaceViewport.addEventListener("scroll", renderLines);
window.addEventListener("resize", renderLines);

if (!loadSetupFromHash()) {
  render();
}
