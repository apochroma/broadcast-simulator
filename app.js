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

const sourceLooks = [
  { color: "#f72585", pattern: "linear-gradient(135deg, #5a189a, #f72585 52%, #4cc9f0)" },
  { color: "#2dd4bf", pattern: "linear-gradient(135deg, #0f766e, #2dd4bf 52%, #a7f3d0)" },
  { color: "#f97316", pattern: "linear-gradient(135deg, #7c2d12, #f97316 52%, #fde68a)" },
  { color: "#8b5cf6", pattern: "linear-gradient(135deg, #312e81, #8b5cf6 52%, #c4b5fd)" },
  { color: "#22c55e", pattern: "linear-gradient(135deg, #14532d, #22c55e 52%, #bef264)" },
  { color: "#ef4444", pattern: "linear-gradient(135deg, #7f1d1d, #ef4444 52%, #fecaca)" },
  { color: "#0ea5e9", pattern: "linear-gradient(135deg, #0c4a6e, #0ea5e9 52%, #bae6fd)" },
  { color: "#eab308", pattern: "linear-gradient(135deg, #713f12, #eab308 52%, #fef08a)" }
];

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
      { id: "rj45", label: "RJ45", signal: "RJ45", top: 72 },
      { id: "line-out", label: "Line Out", signal: "Mic 3.5mm", top: 86 }
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

const switcherMediaSources = [
  { id: "mp1", label: "MP1", shortName: "MP1", name: "Media Player 1", pattern: "#12171d" },
  { id: "mp2", label: "MP2", shortName: "MP2", name: "Media Player 2", pattern: "#12171d" },
  { id: "ssrc", label: "S/SRC", shortName: "S/SRC", name: "Super Source", pattern: "#16202a" },
  { id: "black", label: "BLACK", shortName: "BLACK", name: "Black", pattern: "#000" }
];

const pipPresets = [
  { id: "top-left", label: "Oben links", slots: [{ input: 1, position: "top-left" }] },
  { id: "top-right", label: "Oben rechts", slots: [{ input: 1, position: "top-right" }] },
  { id: "bottom-left", label: "Unten links", slots: [{ input: 1, position: "bottom-left" }] },
  { id: "bottom-right", label: "Unten rechts", slots: [{ input: 1, position: "bottom-right" }] },
  { id: "middle-left", label: "Mitte links", slots: [{ input: 1, position: "middle-left" }] },
  {
    id: "middle-split",
    label: "Mitte links und rechts",
    slots: [
      { input: 1, position: "middle-left" },
      { input: 2, position: "middle-right" }
    ]
  }
];

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
    width: inputCount > 4 ? 1894 : 700
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
    width: inputCount > 4 ? 1894 : 700
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

const WORLD_WIDTH = 12000;
const WORLD_HEIGHT = 8000;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;
const VIDEO_PREVIEW_SECONDS = 5;
const VIDEO_PREVIEW_WIDTH = 640;
const VIDEO_PREVIEW_FPS = 15;
const ORIGINAL_VIDEO_EMBED_LIMIT_BYTES = 40 * 1024 * 1024;
const AUDIO_FADE_MS = 900;
const AUDIO_METER_HIDE_MS = 1800;
const AUDIO_METER_SWITCH_DELAY_MS = 1200;
const GAIN_HOLD_DELAY_MS = 360;
const GAIN_HOLD_INTERVAL_MS = 70;
const audioNoteColors = ["#d65aff", "#ff4f6a", "#55e6a5", "#ffd166", "#60d8ff", "#f78c3f"];

const state = {
  nextId: 1,
  zoom: 1,
  activeSwitcherId: null,
  activeTransition: null,
  activeAudioMeter: null,
  audioFades: [],
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
const audioMeterPopover = document.querySelector("#audioMeterPopover");
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
let audioMeterTimer = null;
let audioMeterHoverTimer = null;
let audioMeterSwitchTimer = null;
let gainHoldTimer = null;
let gainHoldInterval = null;
let suppressNextGainClick = false;
let activeGainDrag = null;
let activeChannelFaderDrag = null;

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
  ["computer", "Playback", "Computer / Playback", "HDMI, USB-C, RJ45 und 3.5mm Line-Out mit Datei-Preview"],
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
  const sourceLook = getSourceLook(state.nextId);
  const node = {
    ...template,
    id,
    libraryType: resolvedType,
    inputs: (template.inputs ?? []).map((port) => ({ ...port })),
    outputs: (template.outputs ?? []).map((port) => ({ ...port })),
    title: template.type === "camera" ? `${template.title} ${countOfType}` : template.title,
    shortName: template.type === "camera" ? `CAM ${countOfType}` : getShortName(template.title),
    position,
    viewMode: getDefaultSourceViewMode(template.type),
    media: template.type === "computer" ? createPlaceholderMedia("Computer") : null,
    previewInput: template.type === "switcher" ? 1 : null,
    programInput: null,
    busMode: template.type === "switcher" ? "pgmPrv" : null,
    transitionDuration: template.type === "switcher" ? 0.5 : null,
    multiviewMode: template.type === "switcher" ? "multiview" : null,
    multiviewInput: null,
    pipEnabled: false,
    pipPreset: template.type === "switcher" ? "top-left" : null,
    isRecording: false,
    isStreaming: false,
    cutFlashing: false,
    audio: template.type === "switcher" ? createSwitcherAudioState(template.inputCount) : null,
    sourceColor: sourceLook.color,
    pattern: sourceLook.pattern
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
  renderAudioMeterPopover();
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
  ensureSourceIdentity(node);
  const programSource = getSwitcherProgramSource(getActiveSwitcher());
  const previewSource = getSwitcherPreviewSource(getActiveSwitcher());
  const classes = [
    "node",
    node.type,
    node.isTransitioning ? "is-transitioning" : "",
    node.isFadingToBlack ? "is-fading-to-black" : "",
    node.cutFlashing ? "is-cut-flashing" : "",
    state.selectedNodeId === node.id ? "is-selected" : "",
    programSource?.id === node.id ? "is-program" : "",
    previewSource?.id === node.id ? "is-preview" : ""
  ].filter(Boolean).join(" ");

  return `
    <article class="${classes}"
      data-node-id="${node.id}"
      style="width: ${node.width}px; transform: translate(${node.position.x}px, ${node.position.y}px); --transition-duration: ${getSwitcherTransitionDurationMs(node)}ms">
      ${renderSockets(node, "input")}
      ${renderSockets(node, "output")}
      <div class="node-header drag-handle">
        <div>
          <p class="node-kicker">${node.kicker}</p>
          <h2>${node.title}</h2>
        </div>
        <div class="node-actions ${state.readOnly ? "is-hidden" : ""}">
          ${node.type === "switcher" ? renderSwitcherModeButton(node) : ""}
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

function renderSwitcherModeButton(switcher) {
  const isCutBus = getSwitcherBusMode(switcher) === "cutBus";
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

function renderNodeBody(node) {
  if (isDisplaySourceNode(node)) {
    return `
      <button class="source-visual" type="button" data-action="cycle-source-view" data-node-id="${node.id}">
        ${renderSourcePreview(node)}
      </button>
      <div class="node-meta">
        <span>${node.shortName}</span>
        ${node.type === "computer"
          ? `<button class="small-button ${state.readOnly ? "is-hidden" : ""}" type="button" data-action="random-media" data-node-id="${node.id}">Random</button>`
          : `<span>${getSourceViewLabel(node)}</span>`}
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

function isDisplaySourceNode(node) {
  return node?.type === "camera" || node?.type === "computer";
}

function getSourceLook(seed) {
  return sourceLooks[Math.abs(Number(seed) || 0) % sourceLooks.length];
}

function ensureSourceIdentity(node) {
  if (!isDisplaySourceNode(node)) {
    return;
  }

  ensureComputerLineOut(node);
  const look = getSourceLook(String(node.id ?? "").split("-").pop() ?? 0);
  node.sourceColor ??= look.color;
  node.pattern ??= look.pattern;
  node.viewMode = normalizeSourceViewMode(node);
}

function ensureComputerLineOut(node) {
  if (node?.type !== "computer") {
    return;
  }

  node.outputs ??= [];

  if (node.outputs.some((port) => port.id === "line-out")) {
    return;
  }

  node.outputs.push({ id: "line-out", label: "Line Out", signal: "Mic 3.5mm", top: 86 });
}

function getDefaultSourceViewMode(type) {
  if (type === "camera") {
    return "product";
  }

  if (type === "computer") {
    return "color";
  }

  return null;
}

function normalizeSourceViewMode(node) {
  if (!isDisplaySourceNode(node)) {
    return node?.viewMode ?? null;
  }

  if (node.viewMode === "signal") {
    return "color";
  }

  if (node.viewMode === "photo") {
    return "product";
  }

  return ["color", "media", "product"].includes(node.viewMode)
    ? node.viewMode
    : getDefaultSourceViewMode(node.type);
}

function getAvailableSourceViewModes(node) {
  const modes = ["color"];

  if (node.media && node.media.kind !== "file") {
    modes.push("media");
  }

  modes.push("product");
  return modes;
}

function renderSourcePreview(node) {
  const mode = normalizeSourceViewMode(node);

  if (mode === "media" && node.media && node.media.kind !== "file") {
    return renderMediaSurface(node);
  }

  if (mode === "product") {
    return renderSourceProductPicture(node);
  }

  return renderSourceColorPicture(node);
}

function renderSourceColorPicture(node) {
  return `
    <div class="test-picture source-color-picture" style="background: ${node.pattern ?? "#20262d"}">
      <span>${node.title}</span>
    </div>
  `;
}

function renderSourceProductPicture(node) {
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

function getSourceViewLabel(node) {
  const mode = normalizeSourceViewMode(node);

  if (mode === "media") {
    return node.media?.name ?? "Medium";
  }

  if (mode === "product") {
    return node.type === "camera" ? "Kamerabild" : "Gerätebild";
  }

  return "Farbe";
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
            ${switcherMediaSources.map((source) => renderMediaSourceButton(switcher, source)).join("")}
          </div>
        </section>

        <section class="atem-transition-bank" aria-label="Transition">
          <div class="atem-transition-top">
            ${renderRightControlPanel(switcher)}
          </div>
          <div class="switcher-actions">
            <button class="switcher-action cut" type="button" data-action="cut" data-node-id="${switcher.id}">CUT</button>
            <button class="switcher-action auto" type="button" data-action="auto" data-node-id="${switcher.id}">AUTO</button>
            <button class="switcher-action ftb" type="button" data-action="ftb" data-node-id="${switcher.id}">FTB</button>
          </div>
        </section>
      </div>
    </div>
  `;
}

function renderRightControlPanel(switcher) {
  return `
    <div class="right-control-panel">
      <section class="right-control-group pip-control" aria-label="Picture in Picture">
        <div class="right-group-buttons two-col">
          ${renderPipPowerButton(switcher, "ON", true)}
          ${renderPipPowerButton(switcher, "OFF", false)}
          ${pipPresets.map((preset) => renderPipPresetButton(switcher, preset)).join("")}
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
              ${[0.5, 1, 1.5, 2].map((duration) => renderDurationButton(switcher, duration)).join("")}
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
            ${[1, 2, 3, 4, 5, 6, 7, 8].map((input) => renderVideoOutButton(switcher, String(input), "input", input)).join("")}
            ${renderVideoOutButton(switcher, "CLEAN", "clean")}
            ${renderVideoOutButton(switcher, "PVW", "preview")}
            ${renderVideoOutButton(switcher, "M/V", "multiview")}
            ${renderVideoOutButton(switcher, "PGM", "program")}
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
          ${renderHeadphoneControl(switcher)}
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
          ${renderStatusControl(switcher, "KEY 1", ["ON", "OFF"])}
          ${renderStatusControl(switcher, "DSK 1", ["ON", "OFF"])}
        </div>
        <div class="status-column">
          ${renderStatusControl(switcher, "RECORD", ["REC", "STOP"])}
          ${renderStatusControl(switcher, "STREAM", ["ON AIR", "OFF"])}
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
        ${renderFaderAdjustButton(switcher, input, "up", "▲")}
        ${renderFaderAdjustButton(switcher, input, "down", "▼")}
      </div>
      ${renderSourceButton(switcher, input)}
    </div>
  `;
}

function renderSourceTopControls(switcher, input) {
  return `
    <div class="atem-source-top-controls">
      <div class="atem-source-control-grid">
        ${renderPanelButton("GAIN")}
        ${renderPanelButton("FOCUS")}
        ${renderPanelButton("BLACK")}
        ${renderPanelButton("SHUT")}
        ${renderPanelButton("▲")}
        ${renderPanelButton("▼")}
      </div>
    </div>
  `;
}

function renderAudioGainControl(switcher, input, kind = "source") {
  const gain = kind === "mic" ? getSwitcherMicGain(switcher, input) : getSwitcherInputGain(switcher, input);
  const angle = -135 + ((gain + 20) / 40) * 270;
  const label = kind === "mic" ? getMicLabel(input) : getSwitcherBusSourceLabel(input);

  return `
    <button class="audio-gain-control"
      type="button"
      data-action="adjust-input-gain"
      data-node-id="${switcher.id}"
      data-input="${input}"
      data-audio-kind="${kind}"
      data-audio-input="${input}"
      aria-label="Gain ${label} ${formatSignedValue(gain)} dB">
      <span class="mini-knob" style="--knob-angle: ${angle}deg"></span>
      <strong>${formatSignedDb(gain)}</strong>
    </button>
  `;
}

function renderFaderAdjustButton(switcher, input, direction, label) {
  return `
    <button class="panel-button fader-button"
      type="button"
      data-action="adjust-audio-fader"
      data-node-id="${switcher.id}"
      data-input="${input}"
      data-audio-kind="source"
      data-audio-input="${input}"
      data-direction="${direction}">
      ${label}
    </button>
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
      data-audio-kind="source"
      data-audio-input="${input}"
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
          data-audio-kind="mic"
          data-audio-input="${micId}"
          data-mode="on"
          aria-pressed="${mode === "on"}">ON</button>
        <button class="panel-button audio-button"
          type="button"
          data-action="set-mic-audio"
          data-node-id="${switcher.id}"
          data-mic="${micId}"
          data-audio-kind="mic"
          data-audio-input="${micId}"
          data-mode="off"
          aria-pressed="false">OFF</button>
        <button class="panel-button fader-button"
          type="button"
          data-action="adjust-mic-fader"
          data-node-id="${switcher.id}"
          data-mic="${micId}"
          data-audio-kind="mic"
          data-audio-input="${micId}"
          data-direction="up">▲</button>
        <button class="panel-button fader-button"
          type="button"
          data-action="adjust-mic-fader"
          data-node-id="${switcher.id}"
          data-mic="${micId}"
          data-audio-kind="mic"
          data-audio-input="${micId}"
          data-direction="down">▼</button>
      </div>
      <strong>${label}</strong>
    </div>
  `;
}

function renderHeadphoneControl(switcher) {
  const muted = switcher.audio?.headphone?.muted === true;

  return `
    <div class="top-device-control">
      <div class="top-device-buttons">
        <button class="panel-button audio-button ${muted ? "is-active" : ""}"
          type="button"
          data-action="set-headphone-audio"
          data-node-id="${switcher.id}"
          data-audio-kind="headphone"
          data-audio-input="headphone"
          data-mode="mute"
          aria-pressed="${muted}">MUTE</button>
        <button class="panel-button audio-button"
          type="button"
          data-action="set-headphone-audio"
          data-node-id="${switcher.id}"
          data-audio-kind="headphone"
          data-audio-input="headphone"
          data-mode="reset">RESET</button>
        <button class="panel-button fader-button"
          type="button"
          data-action="adjust-headphone-fader"
          data-node-id="${switcher.id}"
          data-audio-kind="headphone"
          data-audio-input="headphone"
          data-direction="up">▲</button>
        <button class="panel-button fader-button"
          type="button"
          data-action="adjust-headphone-fader"
          data-node-id="${switcher.id}"
          data-audio-kind="headphone"
          data-audio-input="headphone"
          data-direction="down">▼</button>
      </div>
      <strong>HEADPHONE</strong>
    </div>
  `;
}

function renderStatusControl(switcher, label, buttons) {
  return `
    <div class="top-device-control status-control">
      <div class="top-device-buttons">
        ${buttons.map((buttonLabel) => {
          const statusMode = getStatusButtonMode(label, buttonLabel);
          const isLit = getSwitcherStatusActive(switcher, label, buttonLabel);

          if (!statusMode) {
            return renderPanelButton(buttonLabel, isLit ? "is-lit" : "");
          }

          return `
            <button class="panel-button ${isLit ? "is-lit" : ""}"
              type="button"
              data-action="set-switcher-status"
              data-node-id="${switcher.id}"
              data-status="${statusMode.status}"
              data-enabled="${statusMode.enabled}"
              aria-pressed="${isLit}">
              ${buttonLabel}
            </button>
          `;
        }).join("")}
      </div>
      <strong>${label}</strong>
    </div>
  `;
}

function getStatusButtonMode(label, buttonLabel) {
  if (label === "RECORD") {
    return { status: "recording", enabled: buttonLabel === "REC" };
  }

  if (label === "STREAM") {
    return { status: "streaming", enabled: buttonLabel === "ON AIR" };
  }

  return null;
}

function getSwitcherStatusActive(switcher, label, buttonLabel) {
  if (label === "RECORD") {
    return Boolean(switcher.isRecording) && buttonLabel === "REC";
  }

  if (label === "STREAM") {
    return Boolean(switcher.isStreaming) && buttonLabel === "ON AIR";
  }

  return false;
}

function renderDurationButton(switcher, duration) {
  const isSelected = getSwitcherTransitionDuration(switcher) === duration;
  const label = duration.toFixed(1);

  return `
    <button class="panel-button duration-button ${isSelected ? "is-selected" : ""}"
      type="button"
      data-action="set-transition-duration"
      data-node-id="${switcher.id}"
      data-duration="${duration}"
      aria-pressed="${isSelected}">
      ${label}
    </button>
  `;
}

function renderVideoOutButton(switcher, label, mode, input = "") {
  const isActive = getSwitcherMultiviewMode(switcher) === mode
    && (mode !== "input" || Number(switcher.multiviewInput) === input);

  return `
    <button class="panel-button video-out-button ${isActive ? "is-selected" : ""}"
      type="button"
      data-action="set-multiview-output"
      data-node-id="${switcher.id}"
      data-view-mode="${mode}"
      data-input="${input}"
      aria-pressed="${isActive}">
      ${label}
    </button>
  `;
}

function renderPipPowerButton(switcher, label, enabled) {
  const isActive = Boolean(switcher.pipEnabled) === enabled;
  const buttonClass = [
    "panel-button",
    "pip-button",
    isActive ? "is-selected" : "",
    enabled && isActive ? "is-lit" : ""
  ].filter(Boolean).join(" ");

  return `
    <button class="${buttonClass}"
      type="button"
      data-action="set-pip-enabled"
      data-node-id="${switcher.id}"
      data-enabled="${enabled}"
      aria-pressed="${isActive}">
      ${label}
    </button>
  `;
}

function renderPipPresetButton(switcher, preset) {
  const isActive = getSwitcherPipPreset(switcher) === preset.id;

  return `
    <button class="panel-button pip-button pip-icon-button ${isActive ? "is-selected" : ""}"
      type="button"
      data-action="set-pip-preset"
      data-node-id="${switcher.id}"
      data-pip-preset="${preset.id}"
      aria-label="${preset.label}"
      aria-pressed="${isActive}">
      <span class="pip-icon pip-icon-${preset.id}" aria-hidden="true"></span>
    </button>
  `;
}

function renderPanelButton(label, variant = "") {
  return `<button class="panel-button ${variant}" type="button" disabled>${label}</button>`;
}

function createSwitcherAudioState(inputCount = 0) {
  return {
    sources: Object.fromEntries(Array.from({ length: inputCount }, (_, index) => [index + 1, "off"])),
    faders: Object.fromEntries(Array.from({ length: inputCount }, (_, index) => [index + 1, 0])),
    channelFaders: Object.fromEntries(Array.from({ length: inputCount }, (_, index) => [index + 1, createAudioChannelFaderState()])),
    gains: Object.fromEntries(Array.from({ length: inputCount }, (_, index) => [index + 1, 0])),
    mics: {
      mic1: "off",
      mic2: "off"
    },
    micFaders: {
      mic1: createAudioChannelFaderState(),
      mic2: createAudioChannelFaderState()
    },
    micGains: {
      mic1: 0,
      mic2: 0
    },
    headphone: {
      muted: false,
      fader: 0
    }
  };
}

function createAudioChannelFaderState(value = 0, locked = true) {
  const fader = clamp(Math.round(Number(value) * 10) / 10, -60, 6);
  return {
    left: fader,
    right: fader,
    locked
  };
}

function ensureSwitcherAudioState(switcher) {
  if (!switcher.audio) {
    switcher.audio = createSwitcherAudioState(switcher.inputCount);
  }

  switcher.audio.sources ??= {};
  if (!switcher.audio.faders && switcher.audio.gains) {
    switcher.audio.faders = { ...switcher.audio.gains };
    switcher.audio.gains = {};
  }
  switcher.audio.faders ??= {};
  switcher.audio.channelFaders ??= {};
  switcher.audio.gains ??= {};
  switcher.audio.mics ??= {};
  switcher.audio.micFaders ??= {};
  switcher.audio.micGains ??= {};
  switcher.audio.headphone ??= {};

  Array.from({ length: switcher.inputCount }, (_, index) => index + 1).forEach((input) => {
    switcher.audio.sources[input] ??= "off";
    switcher.audio.faders[input] ??= 0;
    switcher.audio.channelFaders[input] = normalizeAudioChannelFaderState(switcher.audio.channelFaders[input], switcher.audio.faders[input]);
    switcher.audio.gains[input] ??= 0;
  });
  switcher.audio.mics.mic1 ??= "off";
  switcher.audio.mics.mic2 ??= "off";
  switcher.audio.micFaders.mic1 = normalizeAudioChannelFaderState(switcher.audio.micFaders.mic1, 0);
  switcher.audio.micFaders.mic2 = normalizeAudioChannelFaderState(switcher.audio.micFaders.mic2, 0);
  switcher.audio.micGains.mic1 ??= 0;
  switcher.audio.micGains.mic2 ??= 0;
  switcher.audio.headphone.muted ??= false;
  switcher.audio.headphone.fader = clamp(Math.round(Number(switcher.audio.headphone.fader ?? 0) * 10) / 10, -60, 6);
}

function normalizeAudioChannelFaderState(channelFader, fallback = 0) {
  if (!channelFader || typeof channelFader !== "object") {
    return createAudioChannelFaderState(fallback);
  }

  return {
    left: clamp(Math.round(Number(channelFader.left ?? fallback) * 10) / 10, -60, 6),
    right: clamp(Math.round(Number(channelFader.right ?? fallback) * 10) / 10, -60, 6),
    locked: channelFader.locked !== false
  };
}

function setAudioSourceMode(switcherId, input, mode) {
  const switcher = getNode(switcherId);

  if (switcher?.type !== "switcher") {
    return;
  }

  ensureSwitcherAudioState(switcher);
  if (mode === "reset") {
    switcher.audio.faders[input] = 0;
    switcher.audio.channelFaders[input] = createAudioChannelFaderState();
    switcher.audio.gains[input] = 0;
  } else {
    switcher.audio.sources[input] = mode;
  }
  showAudioMeter(switcherId, input);
  render();
}

function getSwitcherInputAudioMode(switcher, input) {
  ensureSwitcherAudioState(switcher);
  return switcher.audio.sources[input] ?? "off";
}

function getSwitcherInputGain(switcher, input) {
  ensureSwitcherAudioState(switcher);
  return Number(switcher.audio.gains[input] ?? 0);
}

function getSwitcherInputFader(switcher, input) {
  ensureSwitcherAudioState(switcher);
  const channelFader = getSwitcherInputChannelFaders(switcher, input);
  return Math.round(((channelFader.left + channelFader.right) / 2) * 10) / 10;
}

function getSwitcherInputChannelFaders(switcher, input) {
  ensureSwitcherAudioState(switcher);
  switcher.audio.channelFaders[input] = normalizeAudioChannelFaderState(switcher.audio.channelFaders[input], switcher.audio.faders[input]);
  return switcher.audio.channelFaders[input];
}

function setSwitcherInputGain(switcher, input, gain) {
  ensureSwitcherAudioState(switcher);
  switcher.audio.gains[input] = clamp(Math.round(Number(gain) * 10) / 10, -20, 20);
}

function setSwitcherInputFader(switcher, input, fader) {
  ensureSwitcherAudioState(switcher);
  const value = clamp(Math.round(Number(fader) * 10) / 10, -60, 6);
  switcher.audio.faders[input] = value;
  switcher.audio.channelFaders[input] = {
    ...getSwitcherInputChannelFaders(switcher, input),
    left: value,
    right: value
  };
}

function setSwitcherInputChannelFader(switcherId, input, channel, value) {
  const switcher = getNode(switcherId);

  if (switcher?.type !== "switcher") {
    return;
  }

  ensureSwitcherAudioState(switcher);
  const channelFader = getSwitcherInputChannelFaders(switcher, input);
  updateChannelFaderState(channelFader, channel, value);

  switcher.audio.faders[input] = Math.round(((channelFader.left + channelFader.right) / 2) * 10) / 10;
  showAudioMeter(switcherId, input, { autoHide: false });
  renderAudioMeterPopover();
}

function updateChannelFaderState(channelFader, channel, value) {
  const nextValue = clamp(Math.round(Number(value) * 10) / 10, -60, 6);

  if (channelFader.locked) {
    const activeChannel = channel === "right" ? "right" : "left";
    const requestedDelta = nextValue - channelFader[activeChannel];
    const minDelta = -60 - Math.min(channelFader.left, channelFader.right);
    const maxDelta = 6 - Math.max(channelFader.left, channelFader.right);
    const delta = clamp(requestedDelta, minDelta, maxDelta);
    channelFader.left = Math.round((channelFader.left + delta) * 10) / 10;
    channelFader.right = Math.round((channelFader.right + delta) * 10) / 10;
  } else {
    channelFader[channel === "right" ? "right" : "left"] = nextValue;
  }
}

function toggleSwitcherInputFaderLock(switcherId, input) {
  const switcher = getNode(switcherId);

  if (switcher?.type !== "switcher") {
    return;
  }

  ensureSwitcherAudioState(switcher);
  const channelFader = getSwitcherInputChannelFaders(switcher, input);
  channelFader.locked = !channelFader.locked;
  switcher.audio.faders[input] = Math.round(((channelFader.left + channelFader.right) / 2) * 10) / 10;

  showAudioMeter(switcherId, input, { autoHide: false });
  renderAudioMeterPopover();
}

function toggleSwitcherMicFaderLock(switcherId, micId) {
  const switcher = getNode(switcherId);

  if (switcher?.type !== "switcher") {
    return;
  }

  ensureSwitcherAudioState(switcher);
  const channelFader = getSwitcherMicFaders(switcher, micId);
  channelFader.locked = !channelFader.locked;

  showAudioMeter(switcherId, micId, { kind: "mic", autoHide: false });
  renderAudioMeterPopover();
}

function adjustAudioFader(switcherId, input, direction) {
  const switcher = getNode(switcherId);

  if (switcher?.type !== "switcher") {
    return;
  }

  const delta = direction === "up" ? 0.1 : -0.1;
  setSwitcherInputFader(switcher, input, getSwitcherInputFader(switcher, input) + delta);
  showAudioMeter(switcherId, input, { autoHide: true });
  render();
}

function adjustMicAudioFader(switcherId, micId, direction) {
  const switcher = getNode(switcherId);

  if (switcher?.type !== "switcher") {
    return;
  }

  const delta = direction === "up" ? 0.1 : -0.1;
  const channelFader = getSwitcherMicFaders(switcher, micId);
  const minDelta = -60 - Math.min(channelFader.left, channelFader.right);
  const maxDelta = 6 - Math.max(channelFader.left, channelFader.right);
  const safeDelta = clamp(delta, minDelta, maxDelta);
  channelFader.left = Math.round((channelFader.left + safeDelta) * 10) / 10;
  channelFader.right = Math.round((channelFader.right + safeDelta) * 10) / 10;
  showAudioMeter(switcherId, micId, { kind: "mic", autoHide: true });
  render();
}

function adjustHeadphoneFader(switcherId, direction) {
  const switcher = getNode(switcherId);

  if (switcher?.type !== "switcher") {
    return;
  }

  const delta = direction === "up" ? 0.1 : -0.1;
  setSwitcherHeadphoneFader(switcherId, getSwitcherHeadphoneFader(switcher) + delta);
  showAudioMeter(switcherId, "headphone", { kind: "headphone", autoHide: true });
  render();
}

function adjustInputGain(switcherId, input, delta) {
  const switcher = getNode(switcherId);

  if (switcher?.type !== "switcher") {
    return;
  }

  setSwitcherInputGain(switcher, input, getSwitcherInputGain(switcher, input) + delta);
  showAudioMeter(switcherId, input, { autoHide: false });
  renderAudioMeterPopover();
}

function startFaderHold(button) {
  stopFaderHold();

  gainHoldTimer = window.setTimeout(() => {
    suppressNextGainClick = true;
    adjustAudioFader(button.dataset.nodeId, Number(button.dataset.input), button.dataset.direction);
    gainHoldInterval = window.setInterval(() => {
      adjustAudioFader(button.dataset.nodeId, Number(button.dataset.input), button.dataset.direction);
    }, GAIN_HOLD_INTERVAL_MS);
  }, GAIN_HOLD_DELAY_MS);
}

function startMicFaderHold(button) {
  stopFaderHold();

  gainHoldTimer = window.setTimeout(() => {
    suppressNextGainClick = true;
    adjustMicAudioFader(button.dataset.nodeId, button.dataset.mic, button.dataset.direction);
    gainHoldInterval = window.setInterval(() => {
      adjustMicAudioFader(button.dataset.nodeId, button.dataset.mic, button.dataset.direction);
    }, GAIN_HOLD_INTERVAL_MS);
  }, GAIN_HOLD_DELAY_MS);
}

function startHeadphoneFaderHold(button) {
  stopFaderHold();

  gainHoldTimer = window.setTimeout(() => {
    suppressNextGainClick = true;
    adjustHeadphoneFader(button.dataset.nodeId, button.dataset.direction);
    gainHoldInterval = window.setInterval(() => {
      adjustHeadphoneFader(button.dataset.nodeId, button.dataset.direction);
    }, GAIN_HOLD_INTERVAL_MS);
  }, GAIN_HOLD_DELAY_MS);
}

function stopFaderHold() {
  window.clearTimeout(gainHoldTimer);
  window.clearInterval(gainHoldInterval);
  gainHoldTimer = null;
  gainHoldInterval = null;
}

function getSwitcherMicAudioMode(switcher, micId) {
  ensureSwitcherAudioState(switcher);
  return switcher.audio.mics[micId] ?? "off";
}

function getSwitcherMicSource(switcher, micId) {
  const micNumber = micId === "mic2" ? 2 : 1;
  return resolveNodeInputSource(switcher, `mic-in-${micNumber}`);
}

function showAudioMeter(switcherId, input, options = {}) {
  const switcher = getNode(switcherId);

  if (switcher?.type !== "switcher") {
    return;
  }

  state.activeAudioMeter = {
    switcherId,
    kind: options.kind ?? "source",
    input: options.kind === "source" || options.kind === undefined ? Number(input) : input
  };

  window.clearTimeout(audioMeterTimer);
  if (options.autoHide !== false) {
    audioMeterTimer = window.setTimeout(() => {
      state.activeAudioMeter = null;
      render();
    }, AUDIO_METER_HIDE_MS);
  }
}

function showAudioMeterFromHover(switcherId, input, kind = "source") {
  const nextMeter = {
    switcherId,
    kind,
    input: kind === "source" ? Number(input) : input
  };
  const activeMeter = state.activeAudioMeter;
  const isSameMeter = activeMeter
    && activeMeter.switcherId === nextMeter.switcherId
    && activeMeter.kind === nextMeter.kind
    && String(activeMeter.input) === String(nextMeter.input);

  window.clearTimeout(audioMeterHoverTimer);
  window.clearTimeout(audioMeterSwitchTimer);

  if (!activeMeter || isSameMeter) {
    showAudioMeter(nextMeter.switcherId, nextMeter.input, { kind, autoHide: false });
    renderAudioMeterPopover();
    return;
  }

  audioMeterSwitchTimer = window.setTimeout(() => {
    showAudioMeter(nextMeter.switcherId, nextMeter.input, { kind, autoHide: false });
    renderAudioMeterPopover();
  }, AUDIO_METER_SWITCH_DELAY_MS);
}

function cancelAudioMeterSwitch() {
  window.clearTimeout(audioMeterSwitchTimer);
  audioMeterSwitchTimer = null;
}

function hideAudioMeter(delay = 160) {
  window.clearTimeout(audioMeterTimer);
  window.clearTimeout(audioMeterHoverTimer);
  cancelAudioMeterSwitch();
  audioMeterHoverTimer = window.setTimeout(() => {
    state.activeAudioMeter = null;
    render();
  }, delay);
}

function renderAudioMeterPopover() {
  if (!audioMeterPopover) {
    return;
  }

  const meter = state.activeAudioMeter;
  const switcher = meter ? getNode(meter.switcherId) : null;

  if (!meter || switcher?.type !== "switcher") {
    audioMeterPopover.classList.add("is-hidden");
    audioMeterPopover.innerHTML = "";
    return;
  }

  ensureSwitcherAudioState(switcher);
  const kind = meter.kind ?? "source";

  if (kind === "headphone") {
    const muted = switcher.audio.headphone.muted === true;
    const fader = getSwitcherHeadphoneFader(switcher);
    const db = getAudioMeterDb("headphone", 0, fader, 0, !muted);

    audioMeterPopover.classList.toggle("is-muted", muted);
    audioMeterPopover.classList.remove("is-hidden");
    audioMeterPopover.innerHTML = `
      <div class="audio-meter-head">
        <div>
          <span>${switcher.title}</span>
          <strong>HEADPHONE</strong>
        </div>
        <em>${muted ? "MUTE" : "ON"}</em>
      </div>
      <div class="audio-meter-body is-headphone">
        ${renderHeadphoneMeterStrip(db, fader, switcher.id, muted)}
        <div class="audio-meter-readout">
          <span>FADER</span>
          <strong>${formatSignedDb(fader)}</strong>
          <small>${muted ? "Kopfhörer stummgeschaltet" : "Monitoring aktiv"}</small>
        </div>
      </div>
    `;
    return;
  }

  const isMic = kind === "mic";
  const input = isMic ? String(meter.input) : Number(meter.input);
  const mode = isMic ? getSwitcherMicAudioMode(switcher, input) : getSwitcherInputAudioMode(switcher, input);
  const source = isMic ? getSwitcherMicSource(switcher, input) : getSwitcherInputSource(switcher, input);
  const gain = isMic ? getSwitcherMicGain(switcher, input) : getSwitcherInputGain(switcher, input);
  const fader = isMic
    ? Math.round(((getSwitcherMicFaders(switcher, input).left + getSwitcherMicFaders(switcher, input).right) / 2) * 10) / 10
    : getSwitcherInputFader(switcher, input);
  const channelFaders = isMic ? getSwitcherMicFaders(switcher, input) : getSwitcherInputChannelFaders(switcher, input);
  const hasSignal = Boolean(source);
  const audible = isMic
    ? mode === "on" && !switcher.isFadeToBlackActive && !switcher.isFadingToBlack
    : Boolean(source) && isSwitcherInputAudioLive(switcher, input);
  const leftDb = getAudioMeterDb(input, gain, channelFaders.left, 0, hasSignal);
  const rightDb = getAudioMeterDb(input, gain, channelFaders.right, 1, hasSignal);
  const status = getAudioMeterStatusLabel(mode, audible, source);
  const title = isMic ? `${getMicLabel(input)} ${source ? source.shortName : "No Signal"}` : `${getSwitcherBusSourceLabel(input)} ${source ? source.shortName : "No Signal"}`;

  audioMeterPopover.classList.toggle("is-muted", !audible);
  audioMeterPopover.classList.remove("is-hidden");
  audioMeterPopover.innerHTML = `
    <div class="audio-meter-head">
      <div>
        <span>${switcher.title}</span>
        <strong>${title}</strong>
      </div>
      <em>${mode.toUpperCase()}</em>
    </div>
    <div class="audio-meter-body">
      ${renderAudioMeterStrip("L", leftDb, mode, channelFaders.left, switcher.id, input, kind)}
      ${renderAudioFaderLockControl(switcher.id, input, channelFaders.locked, kind)}
      ${renderAudioMeterStrip("R", rightDb, mode, channelFaders.right, switcher.id, input, kind)}
      <div class="audio-meter-readout">
        <span>GAIN</span>
        ${renderAudioGainControl(switcher, input, kind)}
        <span>FADER</span>
        <strong>${formatFaderReadout(channelFaders, fader)}</strong>
        <small>${status}</small>
      </div>
    </div>
  `;
}

function renderAudioMeterStrip(label, db, mode, fader, switcherId, input, kind = "source") {
  const level = getAudioMeterPercent(db);
  const levelRange = getAudioMeterDynamicRange(db);
  const channel = label === "R" ? "right" : "left";
  const faderPercent = getAudioFaderPercent(fader);

  return `
    <div class="audio-meter-strip" style="--level: ${level}%; --level-low: ${levelRange.low}%; --level-high: ${levelRange.high}%">
      <i class="audio-mode-bar ${getAudioModeBarClass(mode)}"></i>
      <strong>${formatMeterDb(db)}</strong>
      <div class="audio-channel-strip">
        <button class="audio-channel-fader"
          type="button"
          role="slider"
          aria-valuemin="-60"
          aria-valuemax="6"
          aria-valuenow="${fader}"
          style="--fader-pos: ${faderPercent}%"
          data-action="set-channel-fader"
          data-node-id="${switcherId}"
          data-input="${input}"
          data-audio-kind="${kind}"
          data-audio-input="${input}"
          data-channel="${channel}"
          aria-label="Fader ${label} ${formatSignedDb(fader)}">
          <span class="audio-channel-fader-track" aria-hidden="true"></span>
          <span class="audio-channel-fader-thumb" aria-hidden="true"></span>
        </button>
        <div class="audio-meter-track">
          <div class="audio-meter-scale" aria-hidden="true">
            <span style="bottom: 100%">0</span>
            <span style="bottom: 83.33%">-10</span>
            <span style="bottom: 66.67%">-20</span>
            <span style="bottom: 50%">-30</span>
            <span style="bottom: 33.33%">-40</span>
            <span style="bottom: 16.67%">-50</span>
          </div>
          <i></i>
        </div>
      </div>
      <span>${label}</span>
    </div>
  `;
}

function renderHeadphoneMeterStrip(db, fader, switcherId, muted) {
  const level = getAudioMeterPercent(db);
  const levelRange = getAudioMeterDynamicRange(db);
  const faderPercent = getAudioFaderPercent(fader);

  return `
    <div class="audio-meter-strip" style="--level: ${level}%; --level-low: ${levelRange.low}%; --level-high: ${levelRange.high}%">
      <i class="audio-mode-bar ${muted ? "is-off" : "is-on"}"></i>
      <strong>${formatMeterDb(db)}</strong>
      <div class="audio-channel-strip">
        <button class="audio-channel-fader"
          type="button"
          role="slider"
          aria-valuemin="-60"
          aria-valuemax="6"
          aria-valuenow="${fader}"
          style="--fader-pos: ${faderPercent}%"
          data-action="set-channel-fader"
          data-node-id="${switcherId}"
          data-input="headphone"
          data-audio-kind="headphone"
          data-audio-input="headphone"
          data-channel="headphone"
          aria-label="Headphone Fader ${formatSignedDb(fader)}">
          <span class="audio-channel-fader-track" aria-hidden="true"></span>
          <span class="audio-channel-fader-thumb" aria-hidden="true"></span>
        </button>
        <div class="audio-meter-track">
          <div class="audio-meter-scale" aria-hidden="true">
            <span style="bottom: 100%">0</span>
            <span style="bottom: 83.33%">-10</span>
            <span style="bottom: 66.67%">-20</span>
            <span style="bottom: 50%">-30</span>
            <span style="bottom: 33.33%">-40</span>
            <span style="bottom: 16.67%">-50</span>
          </div>
          <i></i>
        </div>
      </div>
      <span>MON</span>
    </div>
  `;
}

function getAudioFaderPercent(fader) {
  return clamp(((Number(fader) + 60) / 66) * 100, 0, 100);
}

function renderAudioFaderLockControl(switcherId, input, locked, kind = "source") {
  const icon = locked
    ? `
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path class="lock-shackle" d="M12 18v-5.5C12 7.5 15.6 4 20 4s8 3.5 8 8.5V18" />
        <rect class="lock-body" x="9" y="17" width="22" height="17" rx="4" />
        <path class="lock-keyhole" d="M20 23v5" />
      </svg>
    `
    : `
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path class="lock-shackle" d="M14 18v-5.5C14 7.5 17.6 4 22 4c3.2 0 6 1.9 7.2 4.8" />
        <rect class="lock-body" x="9" y="17" width="22" height="17" rx="4" />
        <path class="lock-keyhole" d="M20 23v5" />
      </svg>
    `;

  return `
    <button class="audio-fader-lock ${locked ? "is-locked" : "is-unlocked"}"
      type="button"
      data-action="toggle-channel-fader-lock"
      data-node-id="${switcherId}"
      data-input="${input}"
      data-audio-kind="${kind}"
      data-audio-input="${input}"
      aria-pressed="${locked}"
      aria-label="${locked ? "Fader gekoppelt" : "Fader unabhängig"}">
      ${icon}
    </button>
  `;
}

function formatFaderReadout(channelFaders, fallback) {
  if (channelFaders.left === channelFaders.right) {
    return formatSignedDb(channelFaders.left);
  }

  return `L ${formatSignedDb(channelFaders.left)} / R ${formatSignedDb(channelFaders.right)}`;
}

function getAudioModeBarClass(mode) {
  if (mode === "on") {
    return "is-on";
  }

  if (mode === "afv") {
    return "is-afv";
  }

  return "is-off";
}

function getAudioMeterDb(input, gain, fader, channelOffset, hasSignal) {
  if (!hasSignal) {
    return -60;
  }

  const seed = typeof input === "number" && Number.isFinite(input)
    ? input
    : String(input).split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  const base = -29 + ((seed * 7 + channelOffset * 5) % 13);
  return clamp(base + gain + fader, -60, 0);
}

function getAudioMeterPercent(db) {
  return clamp(((Number(db) + 60) / 60) * 100, 0, 100);
}

function getAudioMeterDynamicRange(db) {
  const value = Number(db);

  if (value <= -60) {
    return { low: 0, high: 0 };
  }

  const varianceDb = clamp(Math.abs(value) * 0.15, 1.2, 6);
  return {
    low: getAudioMeterPercent(value - varianceDb),
    high: getAudioMeterPercent(value + varianceDb)
  };
}

function getAudioMeterStatusLabel(mode, audible, source) {
  if (!source) {
    return "Kein Eingangssignal";
  }

  if (audible) {
    return "Im Mix hörbar";
  }

  if (mode === "afv") {
    return "Signal vorhanden, AFV wartet";
  }

  if (mode === "off") {
    return "Signal vorhanden, OFF";
  }

  return "Nicht im Mix";
}

function formatSignedDb(value) {
  const number = Number(value);
  return `${number >= 0 ? "+" : ""}${number.toFixed(1)} dB`;
}

function formatSignedValue(value) {
  const number = Number(value);
  return `${number >= 0 ? "+" : ""}${number.toFixed(1)}`;
}

function formatGain(gain) {
  const value = Number(gain);
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)} dB`;
}

function formatMeterDb(db) {
  return Number(db).toFixed(2);
}

function isSwitcherInputAudioLive(switcher, input) {
  if (switcher?.isFadeToBlackActive || switcher?.isFadingToBlack) {
    return false;
  }

  const mode = getSwitcherInputAudioMode(switcher, input);
  return mode === "on" || (mode === "afv" && switcher.programInput === input);
}

function getAudioMarkerColor(seed) {
  const value = typeof seed === "number"
    ? seed
    : String(seed).split("").reduce((total, char) => total + char.charCodeAt(0), 0);

  return audioNoteColors[Math.abs(value) % audioNoteColors.length];
}

function getSourceAudioColor(source, fallbackSeed) {
  return source?.sourceColor ?? getAudioMarkerColor(fallbackSeed);
}

function getSwitcherInputAudioMarker(switcher, input) {
  const mode = getSwitcherInputAudioMode(switcher, input);
  const fading = getActiveAudioFade(switcher.id, input);
  const ftbFade = getActiveFtbAudioFade(switcher.id, input);
  const source = getSwitcherInputSource(switcher, input);

  if (!source) {
    return null;
  }

  if (!isSwitcherInputAudioLive(switcher, input) && !fading && !ftbFade) {
    return null;
  }

  return {
    id: `${switcher.id}-input-${input}`,
    label: `Audio ${input}`,
    color: getSourceAudioColor(source, input),
    fading: Boolean(fading || ftbFade),
    muted: mode === "off"
  };
}

function getSwitcherMicAudioMarker(switcher, micIndex) {
  const micId = `mic${micIndex}`;
  const source = getSwitcherMicSource(switcher, micId);

  if (!source || getSwitcherMicAudioMode(switcher, micId) !== "on") {
    return null;
  }

  return {
    id: `${switcher.id}-${micId}`,
    label: `Mic ${micIndex}`,
    color: getSourceAudioColor(source, `mic-${micIndex}`)
  };
}

function getSwitcherAudioMixMarkers(switcher) {
  if (switcher?.type !== "switcher") {
    return [];
  }

  const sourceMarkers = Array.from({ length: switcher.inputCount }, (_, index) => {
    return getSwitcherInputAudioMarker(switcher, index + 1);
  }).filter(Boolean);
  const micMarkers = [1, 2].map((index) => getSwitcherMicAudioMarker(switcher, index)).filter(Boolean);

  return [...sourceMarkers, ...micMarkers].slice(0, 8);
}

function getActiveAudioFade(switcherId, input) {
  const now = Date.now();
  return state.audioFades.find((fade) => (
    fade.switcherId === switcherId
    && fade.input === input
    && fade.expiresAt > now
  ));
}

function getActiveFtbAudioFade(switcherId, input) {
  const now = Date.now();
  return state.audioFades.find((fade) => (
    fade.switcherId === switcherId
    && fade.input === input
    && fade.type === "ftb"
    && fade.expiresAt > now
  ));
}

function purgeExpiredAudioFades() {
  const now = Date.now();
  state.audioFades = state.audioFades.filter((fade) => fade.expiresAt > now);
}

function scheduleAudioFadeCleanup(delay = AUDIO_FADE_MS) {
  window.setTimeout(() => {
    purgeExpiredAudioFades();
    render();
  }, delay + 40);
}

function beginAudioFadeForProgramChange(switcher, previousProgram, nextProgram) {
  if (!switcher || previousProgram === nextProgram || !Number.isInteger(Number(previousProgram))) {
    return;
  }

  const input = Number(previousProgram);

  if (getSwitcherInputAudioMode(switcher, input) !== "afv") {
    return;
  }

  state.audioFades = state.audioFades.filter((fade) => !(
    fade.switcherId === switcher.id && fade.input === input
  ));
  state.audioFades.push({
    switcherId: switcher.id,
    input,
    type: "afv",
    expiresAt: Date.now() + AUDIO_FADE_MS
  });
  scheduleAudioFadeCleanup();
}

function beginAudioFadeToBlack(switcher, durationMs) {
  if (!switcher?.inputCount) {
    return;
  }

  const fadingInputs = Array.from({ length: switcher.inputCount }, (_, index) => index + 1)
    .filter((input) => isSwitcherInputAudioLive(switcher, input));

  if (!fadingInputs.length) {
    return;
  }

  const expiresAt = Date.now() + durationMs;
  state.audioFades = state.audioFades.filter((fade) => !(
    fade.switcherId === switcher.id
    && fade.type === "ftb"
    && fadingInputs.includes(fade.input)
  ));
  fadingInputs.forEach((input) => {
    state.audioFades.push({
      switcherId: switcher.id,
      input,
      type: "ftb",
      expiresAt
    });
  });
  scheduleAudioFadeCleanup(durationMs);
}

function setMicAudioMode(switcherId, micId, mode) {
  const switcher = getNode(switcherId);

  if (switcher?.type !== "switcher") {
    return;
  }

  ensureSwitcherAudioState(switcher);
  switcher.audio.mics[micId] = mode;
  showAudioMeter(switcherId, micId, { kind: "mic" });
  render();
}

function setHeadphoneAudioMode(switcherId, mode) {
  const switcher = getNode(switcherId);

  if (switcher?.type !== "switcher") {
    return;
  }

  ensureSwitcherAudioState(switcher);
  if (mode === "reset") {
    switcher.audio.headphone.fader = 0;
    switcher.audio.headphone.muted = false;
  } else if (mode === "mute") {
    switcher.audio.headphone.muted = !switcher.audio.headphone.muted;
  }
  showAudioMeter(switcherId, "headphone", { kind: "headphone" });
  render();
}

function getSwitcherMicGain(switcher, micId) {
  ensureSwitcherAudioState(switcher);
  return Number(switcher.audio.micGains[micId] ?? 0);
}

function setSwitcherMicGain(switcher, micId, gain) {
  ensureSwitcherAudioState(switcher);
  switcher.audio.micGains[micId] = clamp(Math.round(Number(gain) * 10) / 10, -20, 20);
}

function getSwitcherMicFaders(switcher, micId) {
  ensureSwitcherAudioState(switcher);
  switcher.audio.micFaders[micId] = normalizeAudioChannelFaderState(switcher.audio.micFaders[micId], 0);
  return switcher.audio.micFaders[micId];
}

function getMicLabel(micId) {
  return micId === "mic2" ? "MIC 2" : "MIC 1";
}

function setSwitcherMicChannelFader(switcherId, micId, channel, value) {
  const switcher = getNode(switcherId);

  if (switcher?.type !== "switcher") {
    return;
  }

  ensureSwitcherAudioState(switcher);
  updateChannelFaderState(getSwitcherMicFaders(switcher, micId), channel, value);
  showAudioMeter(switcherId, micId, { kind: "mic", autoHide: false });
  renderAudioMeterPopover();
}

function getSwitcherHeadphoneFader(switcher) {
  ensureSwitcherAudioState(switcher);
  return Number(switcher.audio.headphone.fader ?? 0);
}

function setSwitcherHeadphoneFader(switcherId, value) {
  const switcher = getNode(switcherId);

  if (switcher?.type !== "switcher") {
    return;
  }

  ensureSwitcherAudioState(switcher);
  switcher.audio.headphone.fader = clamp(Math.round(Number(value) * 10) / 10, -60, 6);
  showAudioMeter(switcherId, "headphone", { kind: "headphone", autoHide: false });
  renderAudioMeterPopover();
}

function setSwitcherAudioGain(switcher, kind, input, gain) {
  if (kind === "mic") {
    setSwitcherMicGain(switcher, input, gain);
    return;
  }

  setSwitcherInputGain(switcher, Number(input), gain);
}

function getSwitcherAudioGain(switcher, kind, input) {
  return kind === "mic" ? getSwitcherMicGain(switcher, input) : getSwitcherInputGain(switcher, Number(input));
}

function renderSourceButton(switcher, input) {
  const isProgram = switcher.programInput === input;
  const isPreview = getSwitcherBusMode(switcher) !== "cutBus" && switcher.previewInput === input && !isProgram;
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

function renderMediaSourceButton(switcher, source) {
  const isProgram = switcher.programInput === source.id;
  const isPreview = getSwitcherBusMode(switcher) !== "cutBus" && switcher.previewInput === source.id && !isProgram;
  const buttonClass = [
    "panel-button",
    "source-extra",
    "media-source-button",
    isProgram ? "is-program" : "",
    isPreview ? "is-preview" : ""
  ].filter(Boolean).join(" ");

  return `
    <button class="${buttonClass}"
      type="button"
      data-action="select-preview"
      data-node-id="${switcher.id}"
      data-input="${source.id}"
      aria-pressed="${isPreview || isProgram}">
      ${source.label}
    </button>
  `;
}

function renderMonitorPicture(monitor) {
  const transition = getMonitorTransition(monitor);

  if (transition) {
    return renderTransitionPicture(transition.fromSource, transition.toSource, transition.durationMs);
  }

  const feed = getMonitorFeed(monitor);

  if (feed.type === "multiview") {
    return renderMultiviewPicture(feed.switcher);
  }

  if (feed.transition) {
    return renderTransitionPicture(feed.transition.fromSource, feed.transition.toSource, feed.transition.durationMs);
  }

  if (!feed.source) {
    return renderNoSignalPicture();
  }

  if (feed.pipSwitcher) {
    return renderPipPicture(feed.pipSwitcher, feed.source);
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

function renderTransitionPicture(fromSource, toSource, durationMs = 650) {
  return `
    <div class="transition-picture" style="--transition-duration: ${durationMs}ms">
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
  if (source?.id === "black") {
    return `<div class="black-picture" aria-label="Black"></div>`;
  }

  if (isDisplaySourceNode(source)) {
    ensureSourceIdentity(source);
    return renderSourcePreview(source);
  }

  if (source.media) {
    return renderMediaSurface(source);
  }

  return `
    <div class="test-picture" style="background: ${source.pattern ?? "#20262d"}">
      <span>${source.title}</span>
    </div>
  `;
}

function renderPipPicture(switcher, programSource) {
  if (!switcher.pipEnabled) {
    return renderSignalPicture(programSource);
  }

  return `
    <div class="pip-picture">
      <div class="pip-program-layer">
        ${renderSignalPicture(programSource)}
      </div>
      ${getSwitcherPipSlots(switcher).map((slot) => {
        const source = getSwitcherInputSource(switcher, slot.input);
        return `
          <div class="pip-slot pip-slot-${slot.position}">
            ${source ? renderSignalPicture(source) : renderNoSignalPicture()}
          </div>
        `;
      }).join("")}
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
  return `PGM: ${switcher.title} ${getSwitcherBusSourceLabel(switcher.programInput)}${source ? ` / ${source.shortName}` : " / No Signal"}`;
}

function getSwitcherReadout(switcher) {
  const program = getSwitcherProgramSource(switcher);
  const preview = getSwitcherPreviewSource(switcher);
  const programLabel = switcher.programInput ? `PGM ${getSwitcherBusSourceLabel(switcher.programInput)}${program ? ` ${program.shortName}` : " No Signal"}` : "PGM -";
  const previewLabel = getSwitcherBusMode(switcher) === "cutBus"
    ? "CUT-Bus"
    : switcher.previewInput ? `PVW ${getSwitcherBusSourceLabel(switcher.previewInput)}${preview ? ` ${preview.shortName}` : " No Signal"}` : "PVW -";

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
      return getSwitcherMultiviewFeed(fromNode);
    }

    const activeTransition = resolveTransitionFromPort(inputConnection.from);

    if (activeTransition && inputConnection.from.portId === "program-out") {
      return { type: "program", connected: true, transition: activeTransition, source: null };
    }

    return {
      type: "program",
      connected: true,
      source: getSwitcherProgramSource(fromNode),
      pipSwitcher: fromNode
    };
  }

  return { type: "program", connected: true, source: resolveSourceFromPort(inputConnection.from) };
}

function getSwitcherMultiviewFeed(switcher) {
  const mode = getSwitcherMultiviewMode(switcher);

  if (mode === "program") {
    return {
      type: "program",
      connected: true,
      source: getSwitcherProgramSource(switcher),
      pipSwitcher: switcher
    };
  }

  if (mode === "clean") {
    return { type: "program", connected: true, source: getSwitcherProgramSource(switcher) };
  }

  if (mode === "preview") {
    return { type: "program", connected: true, source: getSwitcherPreviewSource(switcher) };
  }

  if (mode === "input") {
    return {
      type: "program",
      connected: true,
      source: getSwitcherInputSource(switcher, switcher.multiviewInput)
    };
  }

  return { type: "multiview", connected: true, switcher, source: null };
}

function getSwitcherProgramSource(switcher) {
  return switcher?.programInput ? getSwitcherInputSource(switcher, switcher.programInput) : null;
}

function getSwitcherPreviewSource(switcher) {
  return switcher?.previewInput ? getSwitcherInputSource(switcher, switcher.previewInput) : null;
}

function getSwitcherInputSource(switcher, input) {
  const mediaSource = getSwitcherMediaSource(input);

  if (mediaSource) {
    return mediaSource;
  }

  return resolveNodeInputSource(switcher, `input-${input}`);
}

function getSwitcherMediaSource(source) {
  return switcherMediaSources.find((item) => item.id === source) ?? null;
}

function normalizeSwitcherBusSource(source) {
  const numericSource = Number(source);

  if (Number.isInteger(numericSource) && String(source).trim() !== "") {
    return numericSource;
  }

  return source;
}

function getSwitcherBusMode(switcher) {
  return switcher.busMode === "cutBus" ? "cutBus" : "pgmPrv";
}

function getSwitcherTransitionDuration(switcher) {
  const duration = Number(switcher?.transitionDuration);

  return [0.5, 1, 1.5, 2].includes(duration) ? duration : 0.5;
}

function getSwitcherTransitionDurationMs(switcher) {
  return Math.round(getSwitcherTransitionDuration(switcher) * 1000);
}

function getSwitcherMultiviewMode(switcher) {
  return ["multiview", "program", "preview", "clean", "input"].includes(switcher?.multiviewMode)
    ? switcher.multiviewMode
    : "multiview";
}

function getSwitcherPipPreset(switcher) {
  return pipPresets.some((preset) => preset.id === switcher?.pipPreset) ? switcher.pipPreset : "top-left";
}

function getSwitcherPipSlots(switcher) {
  return pipPresets.find((preset) => preset.id === getSwitcherPipPreset(switcher))?.slots ?? pipPresets[0].slots;
}

function getSwitcherBusSourceLabel(source) {
  const mediaSource = getSwitcherMediaSource(source);

  return mediaSource ? mediaSource.label : source;
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
  purgeExpiredAudioFades();

  state.connections.forEach((connection, index) => {
    const fromSocket = getSocketElement(connection.from);
    const toSocket = getSocketElement(connection.to);

    if (!fromSocket || !toSocket) {
      return;
    }

    const from = getSocketCenter(fromSocket, workspaceRect);
    const to = getSocketCenter(toSocket, workspaceRect);
    addCable(
      from,
      to,
      getConnectionLabel(connection),
      getConnectionClass(connection),
      connection.signal,
      getConnectionAudioMarkers(connection),
      `cable-path-${index}`
    );
  });

  if (activeDrag?.type === "cable") {
    addCable(activeDrag.start, activeDrag.current, "", "is-preview", activeDrag.from.signal, [], "cable-path-preview");
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

function addCable(start, end, label, className, signal, audioMarkers = [], pathId = "cable-path") {
  const midX = start.x + (end.x - start.x) / 2;
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  const pathD = `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`;

  path.setAttribute("id", pathId);
  path.setAttribute("d", pathD);
  path.style.stroke = signalColors[signal] ?? signalColors.SDI;
  if (className) {
    path.classList.add(className);
  }

  text.setAttribute("x", String(midX - 22));
  text.setAttribute("y", String((start.y + end.y) / 2 - 8));
  text.textContent = label;

  cableLayer.append(path, text);

  audioMarkers.forEach((marker, index) => {
    addAudioNote(pathId, marker, index, audioMarkers.length);
  });
}

function addAudioNote(pathId, marker, index, markerCount) {
  const note = document.createElementNS("http://www.w3.org/2000/svg", "text");
  const motion = document.createElementNS("http://www.w3.org/2000/svg", "animateMotion");
  const mpath = document.createElementNS("http://www.w3.org/2000/svg", "mpath");
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
  mpath.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", `#${pathId}`);
  motion.append(mpath);
  note.append(motion);
  cableLayer.append(note);
}

function getConnectionAudioMarkers(connection) {
  const fromNode = getNode(connection.from.nodeId);
  const toNode = getNode(connection.to.nodeId);

  if (toNode?.type === "switcher" && connection.to.portId.startsWith("input-")) {
    const input = Number(connection.to.portId.replace("input-", ""));
    const marker = Number.isInteger(input) ? getSwitcherInputAudioMarker(toNode, input) : null;
    return marker ? [marker] : [];
  }

  if (toNode?.type === "switcher" && connection.to.portId.startsWith("mic-in-")) {
    const input = Number(connection.to.portId.replace("mic-in-", ""));
    const marker = Number.isInteger(input) ? getSwitcherMicAudioMarker(toNode, input) : null;
    return marker ? [marker] : [];
  }

  if (fromNode?.type === "switcher" && isSwitcherAudioOutput(connection.from.portId)) {
    return getSwitcherAudioMixMarkers(fromNode);
  }

  return [];
}

function isSwitcherAudioOutput(portId) {
  return portId === "program-out"
    || portId === "multiview-out"
    || portId.startsWith("usb-out-")
    || portId === "headphone-out";
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

function cycleSourceView(nodeId) {
  const node = getNode(nodeId);

  if (!isDisplaySourceNode(node)) {
    return;
  }

  const modes = getAvailableSourceViewModes(node);
  const currentMode = normalizeSourceViewMode(node);
  const currentIndex = modes.indexOf(currentMode);
  node.viewMode = modes[(currentIndex + 1) % modes.length];
  render();
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
  if (isDisplaySourceNode(node)) {
    node.viewMode = "media";
  }
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

  if (isDisplaySourceNode(node) && node.media?.kind !== "file") {
    node.viewMode = "media";
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
      faders: { ...(node.audio.faders ?? {}) },
      channelFaders: Object.fromEntries(Object.entries(node.audio.channelFaders ?? {}).map(([input, fader]) => [input, { ...fader }])),
      gains: { ...(node.audio.gains ?? {}) },
      mics: { ...node.audio.mics },
      micFaders: Object.fromEntries(Object.entries(node.audio.micFaders ?? {}).map(([mic, fader]) => [mic, { ...fader }])),
      micGains: { ...(node.audio.micGains ?? {}) },
      headphone: { ...(node.audio.headphone ?? {}) }
    } : node.audio,
    cutFlashing: false,
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
      faders: { ...(snapshot.audio.faders ?? {}) },
      channelFaders: Object.fromEntries(Object.entries(snapshot.audio.channelFaders ?? {}).map(([input, fader]) => [input, { ...fader }])),
      gains: { ...(snapshot.audio.gains ?? {}) },
      mics: { ...snapshot.audio.mics },
      micFaders: Object.fromEntries(Object.entries(snapshot.audio.micFaders ?? {}).map(([mic, fader]) => [mic, { ...fader }])),
      micGains: { ...(snapshot.audio.micGains ?? {}) },
      headphone: { ...(snapshot.audio.headphone ?? {}) }
    } : snapshot.audio,
    cutFlashing: false,
    transition: null,
    isTransitioning: false
  };

  if (node.type === "switcher") {
    node.programInput = null;
    node.previewInput = normalizeSwitcherBusSource(node.previewInput ?? 1);
    node.busMode = getSwitcherBusMode(node);
    node.transitionDuration = getSwitcherTransitionDuration(node);
    node.multiviewMode = getSwitcherMultiviewMode(node);
    node.multiviewInput = node.multiviewMode === "input"
      ? clamp(Number(node.multiviewInput ?? 1), 1, Math.max(node.inputCount ?? 1, 1))
      : null;
    node.pipEnabled = Boolean(node.pipEnabled);
    node.pipPreset = getSwitcherPipPreset(node);
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
    const source = normalizeSwitcherBusSource(input);

    if (getSwitcherBusMode(switcher) === "cutBus") {
      const previousProgram = switcher.programInput;
      switcher.programInput = source;
      switcher.isFadeToBlackActive = source === "black";
      beginAudioFadeForProgramChange(switcher, previousProgram, source);
    } else {
      switcher.previewInput = source;
    }

    render();
  }
}

function toggleSwitcherBusMode(switcherId) {
  const switcher = getNode(switcherId);

  if (switcher?.type !== "switcher") {
    return;
  }

  switcher.busMode = getSwitcherBusMode(switcher) === "cutBus" ? "pgmPrv" : "cutBus";
  state.activeSwitcherId = switcher.id;
  render();
}

function setTransitionDuration(switcherId, duration) {
  const switcher = getNode(switcherId);
  const nextDuration = Number(duration);

  if (switcher?.type !== "switcher" || ![0.5, 1, 1.5, 2].includes(nextDuration)) {
    return;
  }

  switcher.transitionDuration = nextDuration;
  state.activeSwitcherId = switcher.id;
  render();
}

function setSwitcherStatus(switcherId, status, enabled) {
  const switcher = getNode(switcherId);

  if (switcher?.type !== "switcher") {
    return;
  }

  if (status === "recording") {
    switcher.isRecording = enabled === "true";
  }

  if (status === "streaming") {
    switcher.isStreaming = enabled === "true";
  }

  state.activeSwitcherId = switcher.id;
  render();
}

function setMultiviewOutput(switcherId, mode, input = "") {
  const switcher = getNode(switcherId);

  if (switcher?.type !== "switcher" || !["multiview", "program", "preview", "clean", "input"].includes(mode)) {
    return;
  }

  switcher.multiviewMode = mode;
  switcher.multiviewInput = mode === "input"
    ? clamp(Number(input), 1, Math.max(switcher.inputCount ?? 1, 1))
    : null;
  state.activeSwitcherId = switcher.id;
  render();
}

function setPipEnabled(switcherId, enabled) {
  const switcher = getNode(switcherId);

  if (switcher?.type !== "switcher") {
    return;
  }

  switcher.pipEnabled = enabled === true || enabled === "true";
  switcher.pipPreset = getSwitcherPipPreset(switcher);
  state.activeSwitcherId = switcher.id;
  render();
}

function setPipPreset(switcherId, presetId) {
  const switcher = getNode(switcherId);

  if (switcher?.type !== "switcher" || !pipPresets.some((preset) => preset.id === presetId)) {
    return;
  }

  switcher.pipPreset = presetId;
  state.activeSwitcherId = switcher.id;
  render();
}

function cut(switcherId) {
  const switcher = getNode(switcherId);

  if (switcher?.type === "switcher" && switcher.previewInput) {
    state.activeSwitcherId = switcher.id;
    const previousProgram = switcher.programInput;
    switcher.programInput = switcher.previewInput;
    switcher.isFadeToBlackActive = switcher.programInput === "black";
    switcher.previewInput = previousProgram ?? switcher.previewInput;
    beginAudioFadeForProgramChange(switcher, previousProgram, switcher.programInput);
    switcher.cutFlashing = true;
    render();

    window.setTimeout(() => {
      switcher.cutFlashing = false;
      render();
    }, 300);
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
  const durationMs = getSwitcherTransitionDurationMs(switcher);
  switcher.transition = {
    switcherId: switcher.id,
    fromInput: previousProgram,
    toInput: nextProgram,
    fromSource: previousProgram ? getSwitcherInputSource(switcher, previousProgram) : null,
    toSource: getSwitcherInputSource(switcher, nextProgram),
    durationMs
  };
  state.activeTransition = switcher.transition;
  switcher.isTransitioning = true;
  render();

  window.setTimeout(() => {
    switcher.programInput = nextProgram;
    switcher.isFadeToBlackActive = nextProgram === "black";
    switcher.previewInput = previousProgram ?? switcher.previewInput;
    beginAudioFadeForProgramChange(switcher, previousProgram, nextProgram);
    switcher.isTransitioning = false;
    switcher.transition = null;
    state.activeTransition = null;
    render();
  }, durationMs);
}

function fadeToBlack(switcherId) {
  const switcher = getNode(switcherId);

  if (switcher?.type !== "switcher" || switcher.isTransitioning || switcher.programInput === "black") {
    return;
  }

  state.activeSwitcherId = switcher.id;
  const previousProgram = switcher.programInput;
  const durationMs = getSwitcherTransitionDurationMs(switcher);
  const blackSource = getSwitcherMediaSource("black");
  beginAudioFadeToBlack(switcher, durationMs);
  switcher.transition = {
    switcherId: switcher.id,
    fromInput: previousProgram,
    toInput: "black",
    fromSource: previousProgram ? getSwitcherInputSource(switcher, previousProgram) : null,
    toSource: blackSource,
    durationMs
  };
  state.activeTransition = switcher.transition;
  switcher.isTransitioning = true;
  switcher.isFadingToBlack = true;
  switcher.isFadeToBlackActive = false;
  render();

  window.setTimeout(() => {
    switcher.programInput = "black";
    switcher.isFadeToBlackActive = true;
    switcher.isTransitioning = false;
    switcher.isFadingToBlack = false;
    switcher.transition = null;
    state.activeTransition = null;
    render();
  }, durationMs);
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
  node.previewInput = node.type === "switcher" ? normalizeSwitcherBusSource(node.previewInput ?? 1) : node.previewInput;
  node.programInput = node.type === "switcher" && node.programInput ? normalizeSwitcherBusSource(node.programInput) : node.programInput;
  if (node.type === "switcher") {
    node.busMode = getSwitcherBusMode(node);
    node.transitionDuration = getSwitcherTransitionDuration(node);
    node.multiviewMode = getSwitcherMultiviewMode(node);
    node.multiviewInput = node.multiviewMode === "input"
      ? clamp(Number(node.multiviewInput ?? 1), 1, Math.max(node.inputCount ?? 1, 1))
      : null;
    node.pipEnabled = Boolean(node.pipEnabled);
    node.pipPreset = getSwitcherPipPreset(node);
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
  state.nodes.filter((node) => node.type === "switcher").forEach((node) => {
    node.busMode = getSwitcherBusMode(node);
    node.previewInput = node.previewInput ? normalizeSwitcherBusSource(node.previewInput) : node.previewInput;
    node.programInput = node.programInput ? normalizeSwitcherBusSource(node.programInput) : node.programInput;
    node.transitionDuration = getSwitcherTransitionDuration(node);
    node.multiviewMode = getSwitcherMultiviewMode(node);
    node.multiviewInput = node.multiviewMode === "input"
      ? clamp(Number(node.multiviewInput ?? 1), 1, Math.max(node.inputCount ?? 1, 1))
      : null;
    node.pipEnabled = Boolean(node.pipEnabled);
    node.pipPreset = getSwitcherPipPreset(node);
    node.cutFlashing = false;
    node.isRecording = Boolean(node.isRecording);
    node.isStreaming = Boolean(node.isStreaming);
    ensureSwitcherAudioState(node);
  });
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
    selectPreview(actionTarget.dataset.nodeId, actionTarget.dataset.input);
  }

  if (action === "set-audio-source") {
    setAudioSourceMode(actionTarget.dataset.nodeId, Number(actionTarget.dataset.input), actionTarget.dataset.mode);
  }

  if (action === "adjust-audio-fader") {
    if (suppressNextGainClick) {
      suppressNextGainClick = false;
      return;
    }
    adjustAudioFader(actionTarget.dataset.nodeId, Number(actionTarget.dataset.input), actionTarget.dataset.direction);
  }

  if (action === "set-mic-audio") {
    setMicAudioMode(actionTarget.dataset.nodeId, actionTarget.dataset.mic, actionTarget.dataset.mode);
  }

  if (action === "adjust-mic-fader") {
    if (suppressNextGainClick) {
      suppressNextGainClick = false;
      return;
    }
    adjustMicAudioFader(actionTarget.dataset.nodeId, actionTarget.dataset.mic, actionTarget.dataset.direction);
  }

  if (action === "set-headphone-audio") {
    setHeadphoneAudioMode(actionTarget.dataset.nodeId, actionTarget.dataset.mode);
  }

  if (action === "adjust-headphone-fader") {
    if (suppressNextGainClick) {
      suppressNextGainClick = false;
      return;
    }
    adjustHeadphoneFader(actionTarget.dataset.nodeId, actionTarget.dataset.direction);
  }

  if (action === "set-transition-duration") {
    setTransitionDuration(actionTarget.dataset.nodeId, actionTarget.dataset.duration);
  }

  if (action === "set-switcher-status") {
    setSwitcherStatus(actionTarget.dataset.nodeId, actionTarget.dataset.status, actionTarget.dataset.enabled);
  }

  if (action === "set-multiview-output") {
    setMultiviewOutput(actionTarget.dataset.nodeId, actionTarget.dataset.viewMode, actionTarget.dataset.input);
  }

  if (action === "set-pip-enabled") {
    setPipEnabled(actionTarget.dataset.nodeId, actionTarget.dataset.enabled);
  }

  if (action === "set-pip-preset") {
    setPipPreset(actionTarget.dataset.nodeId, actionTarget.dataset.pipPreset);
  }

  if (action === "cycle-source-view") {
    cycleSourceView(actionTarget.dataset.nodeId);
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

  if (action === "ftb") {
    fadeToBlack(actionTarget.dataset.nodeId);
  }

  if (action === "toggle-switcher-bus-mode") {
    toggleSwitcherBusMode(actionTarget.dataset.nodeId);
  }

  if (action === "remove-node") {
    removeNode(actionTarget.dataset.nodeId);
  }

  if (action === "edit-node") {
    openEditGear(actionTarget.dataset.nodeId);
  }
});

deviceLayer.addEventListener("pointerover", (event) => {
  const audioTarget = event.target.closest("[data-audio-input][data-node-id]");

  if (!audioTarget || !deviceLayer.contains(audioTarget)) {
    return;
  }

  showAudioMeterFromHover(
    audioTarget.dataset.nodeId,
    audioTarget.dataset.audioInput,
    audioTarget.dataset.audioKind ?? "source"
  );
});

deviceLayer.addEventListener("pointerout", (event) => {
  const audioTarget = event.target.closest("[data-audio-input][data-node-id]");

  if (!audioTarget) {
    return;
  }

  if (audioTarget.contains(event.relatedTarget) || audioMeterPopover?.contains(event.relatedTarget)) {
    return;
  }

  cancelAudioMeterSwitch();
  hideAudioMeter();
});

audioMeterPopover?.addEventListener("pointerover", () => {
  window.clearTimeout(audioMeterHoverTimer);
  cancelAudioMeterSwitch();
});

audioMeterPopover?.addEventListener("pointerout", (event) => {
  if (audioMeterPopover.contains(event.relatedTarget)) {
    return;
  }

  hideAudioMeter();
});

audioMeterPopover?.addEventListener("pointerdown", (event) => {
  if (state.readOnly) {
    return;
  }

  const channelFader = event.target.closest("[data-action='set-channel-fader']");

  if (channelFader) {
    startChannelFaderDrag(event, channelFader);
    return;
  }

  const inputGainControl = event.target.closest("[data-action='adjust-input-gain']");

  if (inputGainControl) {
    startInputGainDrag(event, inputGainControl);
  }
});

audioMeterPopover?.addEventListener("click", (event) => {
  if (state.readOnly) {
    return;
  }

  const lockButton = event.target.closest("[data-action='toggle-channel-fader-lock']");

  if (lockButton) {
    if (lockButton.dataset.audioKind === "mic") {
      toggleSwitcherMicFaderLock(lockButton.dataset.nodeId, lockButton.dataset.audioInput);
    } else {
      toggleSwitcherInputFaderLock(lockButton.dataset.nodeId, Number(lockButton.dataset.input));
    }
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

  const inputGainControl = event.target.closest("[data-action='adjust-input-gain']");

  if (inputGainControl) {
    startInputGainDrag(event, inputGainControl);
    return;
  }

  const gainButton = event.target.closest("[data-action='adjust-audio-fader']");

  if (gainButton) {
    startFaderHold(gainButton);
    return;
  }

  const micFaderButton = event.target.closest("[data-action='adjust-mic-fader']");

  if (micFaderButton) {
    startMicFaderHold(micFaderButton);
    return;
  }

  const headphoneFaderButton = event.target.closest("[data-action='adjust-headphone-fader']");

  if (headphoneFaderButton) {
    startHeadphoneFaderHold(headphoneFaderButton);
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
deviceLayer.addEventListener("pointerleave", stopFaderHold);
document.addEventListener("pointermove", (event) => {
  if (activeGainDrag && activeGainDrag.pointerId === event.pointerId) {
    updateInputGainDrag(event);
  }

  if (activeChannelFaderDrag && activeChannelFaderDrag.pointerId === event.pointerId) {
    updateChannelFaderDrag(event);
  }
});
document.addEventListener("pointerup", (event) => {
  stopFaderHold();
  endInputGainDrag(event);
  endChannelFaderDrag(event);
});
document.addEventListener("pointercancel", (event) => {
  stopFaderHold();
  endInputGainDrag(event);
  endChannelFaderDrag(event);
});

function startChannelFaderDrag(event, control) {
  const rect = control.getBoundingClientRect();
  activeChannelFaderDrag = {
    pointerId: event.pointerId,
    control,
    switcherId: control.dataset.nodeId,
    kind: control.dataset.audioKind ?? "source",
    input: control.dataset.audioKind === "source" || !control.dataset.audioKind
      ? Number(control.dataset.input)
      : control.dataset.audioInput,
    channel: control.dataset.channel,
    rect
  };
  control.setPointerCapture?.(event.pointerId);
  updateChannelFaderDrag(event);
}

function updateChannelFaderDrag(event) {
  if (!activeChannelFaderDrag) {
    return;
  }

  const rect = activeChannelFaderDrag.rect;
  const ratio = clamp((rect.bottom - event.clientY) / rect.height, 0, 1);
  const value = -60 + ratio * 66;

  if (activeChannelFaderDrag.kind === "mic") {
    setSwitcherMicChannelFader(
      activeChannelFaderDrag.switcherId,
      activeChannelFaderDrag.input,
      activeChannelFaderDrag.channel,
      value
    );
    return;
  }

  if (activeChannelFaderDrag.kind === "headphone") {
    setSwitcherHeadphoneFader(activeChannelFaderDrag.switcherId, value);
    return;
  }

  setSwitcherInputChannelFader(activeChannelFaderDrag.switcherId, activeChannelFaderDrag.input, activeChannelFaderDrag.channel, value);
}

function endChannelFaderDrag(event) {
  if (!activeChannelFaderDrag || activeChannelFaderDrag.pointerId !== event.pointerId) {
    return;
  }

  try {
    activeChannelFaderDrag.control.releasePointerCapture?.(event.pointerId);
  } catch {
    // The popover re-renders while dragging, so the original control may already be detached.
  }
  activeChannelFaderDrag = null;
}

function startInputGainDrag(event, control) {
  const switcher = getNode(control.dataset.nodeId);

  if (switcher?.type !== "switcher") {
    return;
  }

  const kind = control.dataset.audioKind ?? "source";
  const input = kind === "source" ? Number(control.dataset.input) : control.dataset.audioInput;
  activeGainDrag = {
    pointerId: event.pointerId,
    control,
    switcherId: switcher.id,
    kind,
    input,
    startX: event.clientX,
    startGain: getSwitcherAudioGain(switcher, kind, input)
  };
  control.setPointerCapture(event.pointerId);
  showAudioMeter(switcher.id, input, { kind, autoHide: false });
  renderAudioMeterPopover();
}

function updateInputGainDrag(event) {
  const switcher = getNode(activeGainDrag.switcherId);

  if (switcher?.type !== "switcher") {
    return;
  }

  const delta = Math.round((event.clientX - activeGainDrag.startX) / 4) * 0.1;
  setSwitcherAudioGain(switcher, activeGainDrag.kind, activeGainDrag.input, activeGainDrag.startGain + delta);
  showAudioMeter(switcher.id, activeGainDrag.input, { kind: activeGainDrag.kind, autoHide: false });
  renderAudioMeterPopover();
}

function endInputGainDrag(event) {
  if (!activeGainDrag || activeGainDrag.pointerId !== event.pointerId) {
    return;
  }

  activeGainDrag.control.releasePointerCapture?.(event.pointerId);
  activeGainDrag = null;
  hideAudioMeter(600);
}

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
