function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const signalColors = {
  SDI: cssVar("--signal-sdi"),
  HDMI: cssVar("--signal-hdmi"),
  "USB-C": cssVar("--signal-usb-c"),
  LAN: cssVar("--signal-lan"),
  "Mic 3.5mm": cssVar("--signal-audio"),
  "Headphone 3.5mm": cssVar("--signal-headphones"),
  XLR: cssVar("--signal-audio"),
  Network: cssVar("--signal-network"),
  Wireless: cssVar("--signal-wireless"),
  Timecode: cssVar("--signal-timecode")
};

const uiIcons = {
  minus: `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  `,
  dragHandle: `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
      <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
      <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
    </svg>
  `
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function makePortId(direction) {
  // Date.now() alone can collide when ports are added in the same millisecond.
  return `${direction}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makePortLabel(existingPorts, signal) {
  const takenLabels = new Set(existingPorts.filter((port) => port.signal === signal).map((port) => port.label));
  let index = 1;

  while (takenLabels.has(`${signal} ${index}`)) {
    index += 1;
  }

  return `${signal} ${index}`;
}

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

const {
  gearLibrary,
  gearEntries,
  legacyGearAliases,
  switcherMediaSources,
  pipPresets
} = window.BroadcastDeviceCatalog;

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
const PTZ_PRESET_LONG_PRESS_MS = 1000;
const CABLE_SNAP_DISTANCE_PX = 34;
const UNDO_HISTORY_LIMIT = 80;
const MEDIA_POOL_SLOT_COUNT = 20;
const audioNoteColors = [
  cssVar("--audio-note-1"),
  cssVar("--audio-note-2"),
  cssVar("--audio-note-3"),
  cssVar("--audio-note-4"),
  cssVar("--audio-note-5"),
  cssVar("--audio-note-6")
];
const sourceFallbackColor = cssVar("--source-fallback");
const multiviewEmptyColor = cssVar("--multiview-empty");

const state = {
  nextId: 1,
  zoom: 1,
  activeSwitcherId: null,
  activeTransition: null,
  activeAudioMeter: null,
  activeMediaPool: null,
  pendingMediaPoolImage: null,
  audioFades: [],
  readOnly: false,
  selectedNodeId: null,
  selectedNodeIds: [],
  selectedConnectionIndex: null,
  selectedSocket: null,
  nodes: [],
  connections: []
};

const workspaceViewport = document.querySelector("#workspaceViewport");
const workspaceScaleShell = document.querySelector("#workspaceScaleShell");
const workspace = document.querySelector("#workspace");
const cableLayer = document.querySelector("#cableLayer");
const deviceLayer = document.querySelector("#deviceLayer");
const selectionMarquee = document.querySelector("#selectionMarquee");
const alignControls = document.querySelector(".align-controls");
const audioMeterPopover = document.querySelector("#audioMeterPopover");
const emptyState = document.querySelector("#emptyState");
const programStatus = document.querySelector("#programStatus");
const zoomReadout = document.querySelector("#zoomReadout");
const gearDialog = document.querySelector("#gearDialog");
const gearList = document.querySelector("#gearList");
const gearSearch = document.querySelector("#gearSearch");
const importSetupFile = document.querySelector("#importSetupFile");
const streamDeckImportFile = document.querySelector("#streamDeckImportFile");
const aboutDialog = document.querySelector("#aboutDialog");
const editGearDialog = document.querySelector("#editGearDialog");
const editGearHeading = document.querySelector("#editGearHeading");
const editGearName = document.querySelector("#editGearName");
const editPortList = document.querySelector("#editPortList");
const editPortAddRow = document.querySelector("#editPortAddRow");
const editPortLockedNote = document.querySelector("#editPortLockedNote");
const editPortDirectionField = document.querySelector("#editPortDirectionField");
const editPortDirectionSelect = document.querySelector("#editPortDirection");
const editPortSignalSelect = document.querySelector("#editPortSignal");
const customGearPortList = document.querySelector("#customGearPortList");
const customGearPortDirectionField = document.querySelector("#customGearPortDirectionField");
const customGearPortDirectionSelect = document.querySelector("#customGearPortDirection");
const customGearPortSignalSelect = document.querySelector("#customGearPortSignal");
const mediaPoolDialog = document.querySelector("#mediaPoolDialog");
const mediaPoolHeading = document.querySelector("#mediaPoolHeading");
const mediaPoolGrid = document.querySelector("#mediaPoolGrid");
const mediaPoolFileInput = document.querySelector("#mediaPoolFileInput");
const mediaPoolCursor = document.querySelector("#mediaPoolCursor");

let activeDrag = null;
let suppressNextSocketClick = false;
let suppressNextNodeClick = false;
let editDraft = null;
let customGearDraft = { inputs: [], outputs: [] };
let gearFilter = "";
let copiedNodeSnapshot = null;
let undoStack = [];
let isRestoringUndo = false;
let audioMeterTimer = null;
let audioMeterHoverTimer = null;
let audioMeterSwitchTimer = null;
let gainHoldTimer = null;
let gainHoldInterval = null;
let suppressNextGainClick = false;
let activeGainDrag = null;
let activeChannelFaderDrag = null;
let activePtzJoystickDrag = null;
let ptzAnimationFrame = null;
let ptzPresetPressTimer = null;
let ptzPresetPressContext = null;
let streamDeckPressTimers = [];
let streamDeckPressContext = null;
let activeStreamDeckPtzMotion = null;
let streamDeckPtzAnimationFrame = null;
const ptzPresetRecallAnimations = new Map();
let connectionController = null;
let atemController = null;
let atemAudioController = null;
let atemMediaController = null;
let deviceRenderer = null;
const ptzProjectionImages = new Map();

function addGear(type, customTemplate) {
  const resolvedType = legacyGearAliases[type] ?? type;
  const template = customTemplate ?? gearLibrary[resolvedType];

  recordUndoSnapshot();
  const countOfType = state.nodes.filter((node) => node.type === template.type).length + 1;
  const position = getSpawnPosition(template.type, countOfType, template.width);
  const id = `${template.type}-${state.nextId}`;
  const sourceLook = getUnusedSourceLook(state.nextId);
  const node = {
    ...template,
    id,
    libraryType: resolvedType,
    inputs: (template.inputs ?? []).map((port) => ({ ...port })),
    outputs: (template.outputs ?? []).map((port) => ({ ...port })),
    title: template.type === "camera" ? `${template.title} ${countOfType}` : template.title,
    shortName: template.type === "camera" ? `CAM ${countOfType}` : getShortName(template.title),
    position,
    rotation: 0,
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
    mediaPools: template.type === "switcher" ? createSwitcherMediaPools() : null,
    isRecording: false,
    isStreaming: false,
    cutFlashing: false,
    audio: template.type === "switcher" ? createSwitcherAudioState(template.inputCount) : null,
    sourceColor: sourceLook.color,
    pattern: sourceLook.pattern,
    companionImport: template.type === "streamDeckXL" ? null : undefined,
    companionSurfaceChoices: template.type === "streamDeckXL" ? null : undefined,
    currentPageId: template.type === "streamDeckXL" ? null : undefined,
    instanceMap: template.type === "streamDeckXL" ? {} : undefined,
    instanceNames: template.type === "streamDeckXL" ? {} : undefined,
    customVariables: template.type === "streamDeckXL" ? {} : undefined
  };

  state.nextId += 1;
  state.nodes.push(node);
  setSelectedNodes([node.id], node.id);

  if (node.type === "switcher") {
    state.activeSwitcherId = node.id;
    ensureSwitcherMediaPools(node);
  }

  render();
}

// The RODE Wireless GO II is sold and used as a matched set (1 receiver + 2
// transmitters), so the catalog offers it as a single "kit" entry that drops
// all three nodes at once, laid out next to each other, instead of forcing
// the user to add each piece separately.
function addRodeWirelessSet() {
  if (state.readOnly) {
    return;
  }

  addGear("rodeWirelessGo2Receiver");
  const receiver = state.nodes.at(-1);

  addGear("rodeWirelessGo2Transmitter");
  const transmitter1 = state.nodes.at(-1);
  transmitter1.position = {
    x: receiver.position.x - transmitter1.width - 60,
    y: receiver.position.y - 200
  };

  addGear("rodeWirelessGo2Transmitter");
  const transmitter2 = state.nodes.at(-1);
  transmitter2.position = {
    x: receiver.position.x - transmitter2.width - 60,
    y: receiver.position.y + 200
  };

  // The kit's mics are pre-paired to the receiver's two channels, just like
  // a real Wireless GO II ships already synced out of the box.
  state.connections.push(
    { signal: "Wireless", from: { nodeId: transmitter1.id, portId: "wireless-out" }, to: { nodeId: receiver.id, portId: "wireless-in-1" } },
    { signal: "Wireless", from: { nodeId: transmitter2.id, portId: "wireless-out" }, to: { nodeId: receiver.id, portId: "wireless-in-2" } }
  );

  setSelectedNodes([receiver.id, transmitter1.id, transmitter2.id], receiver.id);
  render();
}

// The Behringer C-2 is sold and used as a matched stereo pair, so the catalog
// offers it as a single "kit" entry that drops both mics at once, side by
// side — two fully independent nodes from here on, same as the RODE kit
// above, so either one can be deleted or repositioned on its own.
function addBehringerC2Set() {
  if (state.readOnly) {
    return;
  }

  addGear("behringerC2");
  const mic1 = state.nodes.at(-1);

  addGear("behringerC2");
  const mic2 = state.nodes.at(-1);
  mic2.position = {
    x: mic1.position.x + mic1.width + 40,
    y: mic1.position.y
  };

  setSelectedNodes([mic1.id, mic2.id], mic1.id);
  render();
}

const DEFAULT_STREAM_DECK_CONFIG_PATH = "configuration/streamdeck.companionconfig";

// New Stream Deck XL nodes start pre-loaded with this project's reference
// Companion export, instead of the empty "import a file" state — the "Load
// Configuration" button in the node's toolbar still lets a different file be
// swapped in later.
function addStreamDeckXLWithDefaultConfig() {
  if (state.readOnly) {
    return;
  }

  addGear("streamDeckXL");
  const node = state.nodes.at(-1);
  autoImportDefaultStreamDeckConfig(node.id);
}

async function autoImportDefaultStreamDeckConfig(nodeId) {
  try {
    const response = await fetch(DEFAULT_STREAM_DECK_CONFIG_PATH);

    if (!response.ok) {
      return;
    }

    const blob = await response.blob();
    const file = new File([blob], DEFAULT_STREAM_DECK_CONFIG_PATH.split("/").pop(), { type: "application/octet-stream" });
    pendingStreamDeckImportNodeId = nodeId;
    await handleStreamDeckImportFile(file);
  } catch (error) {
    // No default file reachable (e.g. different deployment) — the node just
    // stays in its normal empty state with the manual import button.
  }
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
  deviceLayer.innerHTML = state.nodes.map((node) => deviceRenderer.renderNode(node)).join("");
  emptyState.classList.toggle("is-hidden", state.nodes.length > 0);
  if (programStatus) {
    programStatus.textContent = getProgramStatus();
  }
  renderAudioMeterPopover();
  atemMediaController.renderDialog();
  renderGearList();
  renderZoom();
  updateAlignControlsState();
  requestAnimationFrame(() => {
    renderLines();
    renderPtzProjectionCanvases();
  });
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

function isDisplaySourceNode(node) {
  return node?.type === "camera" || node?.type === "computer";
}

function getSourceLook(seed) {
  return sourceLooks[Math.abs(Number(seed) || 0) % sourceLooks.length];
}

function getUnusedSourceLook(seed, excludeNodeId = null) {
  const usedColors = new Set(state.nodes
    .filter((node) => isDisplaySourceNode(node) && node.id !== excludeNodeId)
    .map((node) => node.sourceColor)
    .filter(Boolean));
  const preferredIndex = Math.abs(Number(seed) || 0) % sourceLooks.length;
  const orderedLooks = [
    ...sourceLooks.slice(preferredIndex),
    ...sourceLooks.slice(0, preferredIndex)
  ];
  const unusedLook = orderedLooks.find((look) => !usedColors.has(look.color));

  if (unusedLook) {
    return unusedLook;
  }

  const hue = Math.round((Number(seed) * 137.508) % 360);
  const color = `hsl(${hue} 78% 55%)`;
  return {
    color,
    pattern: `linear-gradient(135deg, hsl(${hue} 68% 24%), ${color} 52%, hsl(${(hue + 42) % 360} 82% 78%))`
  };
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

function ensureMonitorLoopOutputs(node) {
  if (node?.type !== "monitor") {
    return;
  }

  node.outputs ??= [];

  if (!node.outputs.some((port) => port.id === "sdi-out")) {
    node.outputs.push({ id: "sdi-out", label: "SDI Out", signal: "SDI", top: 42 });
  }

  if (!node.outputs.some((port) => port.id === "hdmi-out")) {
    node.outputs.push({ id: "hdmi-out", label: "HDMI Out", signal: "HDMI", top: 58 });
  }
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

  return ["color", "media", "product", "model3d"].includes(node.viewMode)
    ? node.viewMode
    : getDefaultSourceViewMode(node.type);
}

function getAvailableSourceViewModes(node) {
  // Cameras cycle through a fixed set of four views regardless of whether
  // media happens to be loaded yet (the equirectangular slot just shows a
  // placeholder until an image is set) — unlike other source nodes, where
  // "media" only appears once something's actually been loaded into it.
  if (node.type === "camera") {
    const modes = ["color", "product", "media"];

    if (node.model3d) {
      modes.push("model3d");
    }

    return modes;
  }

  const modes = ["color"];

  if (node.media && node.media.kind !== "file") {
    modes.push("media");
  }

  modes.push("product");
  return modes;
}

function renderSwitcherPanel(switcher) {
  ensureSwitcherAudioState(switcher);

  if (isAtemMiniProPanel(switcher)) {
    return renderMiniSwitcherPanel(switcher);
  }

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

function isAtemMiniProPanel(switcher) {
  const title = String(switcher.title ?? "");
  return switcher.inputCount <= 4 && (title.includes("ATEM Mini") || title.includes("ATEM SDI"));
}

function renderMiniSwitcherPanel(switcher) {
  return `
    <div class="atem-control-panel atem-mini-panel">
      <div class="atem-panel-label">${switcher.title}</div>
      <div class="atem-mini-raster">
        <div class="mini-top-slot mini-col-1">${renderMicControl(switcher, "mic1", "MIC 1")}</div>
        <div class="mini-top-slot mini-col-2">${renderMicControl(switcher, "mic2", "MIC 2")}</div>

        ${Array.from({ length: switcher.inputCount }, (_, index) => `
          <section class="mini-source-slot mini-col-${index + 1}" aria-label="Source ${index + 1}">
            ${renderMiniSourceColumn(switcher, index + 1)}
          </section>
        `).join("")}

        <section class="mini-still-slot mini-col-5" aria-label="Still und Black">
          <div class="atem-mini-still-buttons">
            ${renderMediaSourceButton(switcher, { id: "mp1", label: "STILL" })}
            ${renderMediaSourceButton(switcher, { id: "black", label: "BLACK" })}
          </div>
        </section>

        <section class="right-control-group mini-pip-control" aria-label="Picture in Picture">
          <div class="right-group-buttons mini-pip-buttons">
            ${renderPipPresetButton(switcher, pipPresets[0])}
            ${renderPipPresetButton(switcher, pipPresets[1])}
            ${renderPipPowerButton(switcher, "ON", true)}
            ${renderPipPresetButton(switcher, pipPresets[2])}
            ${renderPipPresetButton(switcher, pipPresets[3])}
            ${renderPipPowerButton(switcher, "OFF", false)}
          </div>
          <strong>PICTURE IN PICTURE</strong>
        </section>

        <section class="right-control-group mini-duration-control" aria-label="Duration">
          <div class="right-group-buttons two-col">
            ${[0.5, 1, 1.5, 2].map((duration) => renderDurationButton(switcher, duration)).join("")}
          </div>
          <strong>DURATION</strong>
        </section>

        <section class="right-control-group mini-key-control" aria-label="Key">
          ${renderStatusControl(switcher, "KEY", ["ON", "OFF"])}
        </section>

        <section class="right-control-group mini-effect-control" aria-label="Effect">
          <div class="right-group-buttons two-col">
            ${["◧", "▬", "◀", "▶", "MIX", "DIP"].map((label) => renderPanelButton(label)).join("")}
          </div>
          <strong>EFFECT</strong>
        </section>

        <section class="atem-status-bank mini-record-stream-bank" aria-label="Record und Stream">
          <div class="status-column">
            ${renderStatusControl(switcher, "RECORD", ["REC", "STOP"])}
          </div>
          <div class="status-column">
            ${renderStatusControl(switcher, "STREAM", ["ON AIR", "OFF"])}
          </div>
        </section>

        <section class="right-control-group mini-video-out-control" aria-label="Video Out">
          <div class="right-group-buttons two-col">
            ${[1, 2, 3, 4].map((input) => renderVideoOutButton(switcher, String(input), "input", input)).join("")}
            ${renderVideoOutButton(switcher, "M/V", "multiview")}
            ${renderVideoOutButton(switcher, "PGM", "program")}
          </div>
          <strong>VIDEO OUT</strong>
        </section>

        <button class="switcher-action cut mini-col-6" type="button" data-action="cut" data-node-id="${switcher.id}">CUT</button>
        <button class="switcher-action auto mini-col-7" type="button" data-action="auto" data-node-id="${switcher.id}">AUTO</button>
        <button class="switcher-action ftb mini-col-8" type="button" data-action="ftb" data-node-id="${switcher.id}">FTB</button>
      </div>
    </div>
  `;
}

function renderMiniSourceColumn(switcher, input) {
  const mode = switcher.audio?.sources?.[input] ?? "off";

  return `
    <div class="atem-mini-source-column">
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

function renderMiniRightControlPanel(switcher) {
  return `
    <div class="atem-mini-right-controls">
      <section class="right-control-group mini-pip-control" aria-label="Picture in Picture">
        <div class="right-group-buttons mini-pip-buttons">
          ${renderPipPresetButton(switcher, pipPresets[0])}
          ${renderPipPresetButton(switcher, pipPresets[1])}
          ${renderPipPowerButton(switcher, "ON", true)}
          ${renderPipPresetButton(switcher, pipPresets[2])}
          ${renderPipPresetButton(switcher, pipPresets[3])}
          ${renderPipPowerButton(switcher, "OFF", false)}
        </div>
        <strong>PICTURE IN PICTURE</strong>
      </section>

      <section class="right-control-group mini-key-control" aria-label="Key">
        ${renderStatusControl(switcher, "KEY 1", ["ON", "OFF"])}
      </section>

      <section class="atem-status-bank mini-record-stream-bank" aria-label="Record und Stream">
        <div class="status-column">
          ${renderStatusControl(switcher, "RECORD", ["REC", "STOP"])}
        </div>
        <div class="status-column">
          ${renderStatusControl(switcher, "STREAM", ["ON AIR", "OFF"])}
        </div>
      </section>

      <section class="right-control-group mini-duration-control" aria-label="Duration">
        <div class="right-group-buttons two-col">
          ${[0.5, 1, 1.5, 2].map((duration) => renderDurationButton(switcher, duration)).join("")}
        </div>
        <strong>DURATION</strong>
      </section>

      <section class="right-control-group mini-effect-control" aria-label="Effect">
        <div class="right-group-buttons two-col">
          ${["◧", "▬", "◀", "▶", "MIX", "DIP"].map((label) => renderPanelButton(label)).join("")}
        </div>
        <strong>EFFECT</strong>
      </section>

      <section class="right-control-group mini-video-out-control" aria-label="Video Out">
        <div class="right-group-buttons two-col">
          ${[1, 2, 3, 4].map((input) => renderVideoOutButton(switcher, String(input), "input", input)).join("")}
          ${renderVideoOutButton(switcher, "M/V", "multiview")}
          ${renderVideoOutButton(switcher, "PGM", "program")}
        </div>
        <strong>VIDEO OUT</strong>
      </section>
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

function createSwitcherMediaPools() {
  return {
    mp1: createMediaPoolState(),
    mp2: createMediaPoolState()
  };
}

function createMediaPoolState() {
  return {
    selectedSlot: 0,
    slots: Array.from({ length: MEDIA_POOL_SLOT_COUNT }, () => null)
  };
}

function ensureSwitcherMediaPools(switcher) {
  if (switcher?.type !== "switcher") {
    return;
  }

  switcher.mediaPools ??= createSwitcherMediaPools();
  ["mp1", "mp2"].forEach((playerId) => {
    switcher.mediaPools[playerId] ??= createMediaPoolState();
    const pool = switcher.mediaPools[playerId];
    pool.slots = Array.from({ length: MEDIA_POOL_SLOT_COUNT }, (_, index) => pool.slots?.[index] ?? null);
    pool.selectedSlot = clamp(Number(pool.selectedSlot ?? 0), 0, MEDIA_POOL_SLOT_COUNT - 1);
  });
}

function cloneSwitcherMediaPools(mediaPools) {
  return {
    mp1: cloneMediaPoolState(mediaPools?.mp1),
    mp2: cloneMediaPoolState(mediaPools?.mp2)
  };
}

function cloneMediaPoolState(pool) {
  const normalizedPool = pool ?? createMediaPoolState();

  return {
    selectedSlot: clamp(Number(normalizedPool.selectedSlot ?? 0), 0, MEDIA_POOL_SLOT_COUNT - 1),
    slots: Array.from({ length: MEDIA_POOL_SLOT_COUNT }, (_, index) => {
      const slot = normalizedPool.slots?.[index];
      return slot ? { ...slot } : null;
    })
  };
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

function startFaderHold(button) {
  stopFaderHold();

  gainHoldTimer = window.setTimeout(() => {
    suppressNextGainClick = true;
    atemAudioController.adjustInputFader(button.dataset.nodeId, Number(button.dataset.input), button.dataset.direction);
    gainHoldInterval = window.setInterval(() => {
      atemAudioController.adjustInputFader(button.dataset.nodeId, Number(button.dataset.input), button.dataset.direction);
    }, GAIN_HOLD_INTERVAL_MS);
  }, GAIN_HOLD_DELAY_MS);
}

function startMicFaderHold(button) {
  stopFaderHold();

  gainHoldTimer = window.setTimeout(() => {
    suppressNextGainClick = true;
    atemAudioController.adjustMicFader(button.dataset.nodeId, button.dataset.mic, button.dataset.direction);
    gainHoldInterval = window.setInterval(() => {
      atemAudioController.adjustMicFader(button.dataset.nodeId, button.dataset.mic, button.dataset.direction);
    }, GAIN_HOLD_INTERVAL_MS);
  }, GAIN_HOLD_DELAY_MS);
}

function startHeadphoneFaderHold(button) {
  stopFaderHold();

  gainHoldTimer = window.setTimeout(() => {
    suppressNextGainClick = true;
    atemAudioController.adjustHeadphoneFader(button.dataset.nodeId, button.dataset.direction);
    gainHoldInterval = window.setInterval(() => {
      atemAudioController.adjustHeadphoneFader(button.dataset.nodeId, button.dataset.direction);
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

  const kind = options.kind ?? "source";
  const normalizedInput = kind === "source" ? Number(input) : input;
  const previousMeter = state.activeAudioMeter;
  const anchorRect = options.anchorRect
    ?? (previousMeter
      && previousMeter.switcherId === switcherId
      && previousMeter.kind === kind
      && String(previousMeter.input) === String(normalizedInput)
      ? previousMeter.anchorRect
      : null);

  state.activeAudioMeter = {
    switcherId,
    kind,
    input: normalizedInput,
    anchorRect
  };

  window.clearTimeout(audioMeterTimer);
  if (options.autoHide !== false) {
    audioMeterTimer = window.setTimeout(() => {
      state.activeAudioMeter = null;
      render();
    }, AUDIO_METER_HIDE_MS);
  }
}

function getElementViewportRect(element) {
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left,
    right: rect.right,
    top: rect.top,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height
  };
}

function getAudioMeterAnchorElement(audioTarget) {
  if (audioTarget.dataset.audioKind !== "source") {
    return audioTarget;
  }

  const selector = [
    "[data-action='set-audio-source']",
    `[data-node-id='${CSS.escape(audioTarget.dataset.nodeId)}']`,
    `[data-audio-input='${CSS.escape(audioTarget.dataset.audioInput)}']`,
    "[data-mode='afv']"
  ].join("");

  return deviceLayer.querySelector(selector) ?? audioTarget;
}

function showAudioMeterFromHover(switcherId, input, kind = "source", anchorElement = null) {
  const nextMeter = {
    switcherId,
    kind,
    input: kind === "source" ? Number(input) : input,
    anchorRect: anchorElement ? getElementViewportRect(anchorElement) : null
  };
  const activeMeter = state.activeAudioMeter;
  const isSameMeter = activeMeter
    && activeMeter.switcherId === nextMeter.switcherId
    && activeMeter.kind === nextMeter.kind
    && String(activeMeter.input) === String(nextMeter.input);

  window.clearTimeout(audioMeterHoverTimer);
  window.clearTimeout(audioMeterSwitchTimer);

  if (!activeMeter || isSameMeter) {
    showAudioMeter(nextMeter.switcherId, nextMeter.input, { kind, autoHide: false, anchorRect: nextMeter.anchorRect });
    renderAudioMeterPopover();
    return;
  }

  audioMeterSwitchTimer = window.setTimeout(() => {
    showAudioMeter(nextMeter.switcherId, nextMeter.input, { kind, autoHide: false, anchorRect: nextMeter.anchorRect });
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
    audioMeterPopover.style.left = "";
    audioMeterPopover.style.top = "";
    audioMeterPopover.style.right = "";
    audioMeterPopover.style.bottom = "";
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
    positionAudioMeterPopover(meter);
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
  positionAudioMeterPopover(meter);
}

function positionAudioMeterPopover(meter) {
  const anchor = meter?.anchorRect;
  const margin = 14;
  const viewportPadding = 14;

  audioMeterPopover.style.right = "auto";
  audioMeterPopover.style.bottom = "auto";

  if (!anchor) {
    audioMeterPopover.style.left = "";
    audioMeterPopover.style.top = "";
    audioMeterPopover.style.right = "32px";
    audioMeterPopover.style.bottom = "32px";
    return;
  }

  const popoverRect = audioMeterPopover.getBoundingClientRect();
  const popoverWidth = popoverRect.width;
  const popoverHeight = popoverRect.height;
  const unclampedLeft = anchor.left + (anchor.width / 2) - (popoverWidth / 2);
  const unclampedTop = anchor.top - popoverHeight - margin;
  const maxLeft = Math.max(viewportPadding, window.innerWidth - popoverWidth - viewportPadding);
  const maxTop = Math.max(viewportPadding, window.innerHeight - popoverHeight - viewportPadding);

  audioMeterPopover.style.left = `${clamp(unclampedLeft, viewportPadding, maxLeft)}px`;
  audioMeterPopover.style.top = `${clamp(unclampedTop, viewportPadding, maxTop)}px`;
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

// Same dB/percent/pulse-range math the ATEM meter popover uses, applied to a
// wireless mic channel directly (no gain/fader state to factor in here).
function getWirelessChannelMeter(channelNum) {
  const db = getAudioMeterDb(`rode-ch${channelNum}`, 0, 0, channelNum - 1, true);

  return {
    percent: getAudioMeterPercent(db),
    range: getAudioMeterDynamicRange(db)
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

function getSwitcherHeadphoneFader(switcher) {
  ensureSwitcherAudioState(switcher);
  return Number(switcher.audio.headphone.fader ?? 0);
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
  const opensMediaPool = source.id === "mp1" || source.id === "mp2";
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
      ${opensMediaPool ? `data-media-player="${source.id}"` : ""}
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

  return renderFeedPicture(getMonitorFeed(monitor));
}

function renderFeedPicture(feed) {
  if (feed.type === "multiview") {
    return renderMultiviewPicture(feed.switcher);
  }

  if (feed.transition) {
    return renderTransitionPicture(feed.transition.fromSource, feed.transition.toSource, feed.transition.durationMs);
  }

  if (feed.pipSwitcher) {
    return renderPipPicture(feed.pipSwitcher, feed.programFeed ?? { ...feed, pipSwitcher: null });
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
      return getRenderableSwitcherTransition(node, ownTransition, visited);
    }

    return resolveSwitcherProgramTransition(node, visited);
  }

  if (node.type === "splitter" && portRef.portId.startsWith("output-")) {
    const inputConnection = state.connections.find((connection) => (
      connection.to.nodeId === node.id && connection.to.portId === "input-1"
    ));

    return inputConnection ? resolveTransitionFromPort(inputConnection.from, visited) : null;
  }

  if (node.type === "monitor" && ["sdi-out", "hdmi-out"].includes(portRef.portId)) {
    const monitorFeed = getMonitorFeedForOutput(node, portRef.portId, visited);
    return monitorFeed.transition ?? null;
  }

  if (node.type === "converter") {
    const crossInputPortId = portRef.portId === "sdi-out"
      ? "hdmi-in"
      : portRef.portId === "hdmi-out" ? "sdi-in" : null;

    const inputConnection = crossInputPortId && state.connections.find((connection) => (
      connection.to.nodeId === node.id && connection.to.portId === crossInputPortId
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

function getRenderableSwitcherTransition(switcher, transition, visited = new Set()) {
  if (!transition) {
    return transition;
  }

  if (transition.toInput !== "black" && transition.fromInput !== "black") {
    return transition;
  }

  if (transition.fromInput === "black") {
    return {
      ...transition,
      fromSource: getSwitcherMediaSource("black"),
      toSource: getSwitcherProgramOutputFeedForInput(switcher, transition.toInput, visited)
    };
  }

  return {
    ...transition,
    fromSource: getSwitcherProgramOutputFeed(switcher, visited),
    toSource: getSwitcherMediaSource("black")
  };
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
  const fromContent = fromSource?.type
    ? renderFeedPicture(fromSource)
    : (fromSource ? renderSignalPicture(fromSource) : renderNoSignalPicture());
  const toContent = toSource?.type
    ? renderFeedPicture(toSource)
    : (toSource ? renderSignalPicture(toSource) : renderNoSignalPicture());

  return `
    <div class="transition-picture" style="--transition-duration: ${durationMs}ms">
      <div class="transition-layer is-from">
        ${fromContent}
      </div>
      <div class="transition-layer is-to">
        ${toContent}
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
    return renderProgramSourcePicture(source);
  }

  if (source.media) {
    return renderMediaSurface(source);
  }

  return `
    <div class="test-picture" style="background: ${source.pattern ?? sourceFallbackColor}">
      <span>${source.title}</span>
    </div>
  `;
}

function renderProgramSourcePicture(source) {
  // Mirror exactly what the source node itself is showing (color test pattern,
  // product photo, or live PTZ panorama crop in media mode) instead of forcing
  // the panorama regardless of the camera's own selected view mode.
  return deviceRenderer.renderSourcePreview(source);
}

function isPtzPanoramaSource(source) {
  if (!source?.media || source.media.kind !== "image") {
    return false;
  }

  // .hdr files can't be decoded by HTMLImageElement at all, so the
  // Image-based aspect-ratio probing below doesn't apply — every .hdr
  // dropped onto a camera is treated as an equirectangular panorama outright.
  if (source.media.isHDR) {
    return true;
  }

  if (!source.media.isEquirectangular && isEquirectangularImage(source.media.name, source.media.width, source.media.height)) {
    source.media.isEquirectangular = true;
  }

  if (!source.media.isEquirectangular && source.media.url) {
    const image = getPtzProjectionImage(source.media.url);

    if (image.complete && image.naturalWidth && image.naturalHeight) {
      source.media.width = image.naturalWidth;
      source.media.height = image.naturalHeight;
      source.media.isEquirectangular = isEquirectangularImage(source.media.name, image.naturalWidth, image.naturalHeight);
    } else if (!source.media.equirectangularCheckPending) {
      source.media.equirectangularCheckPending = true;
      image.addEventListener("load", () => {
        source.media.width = image.naturalWidth;
        source.media.height = image.naturalHeight;
        source.media.isEquirectangular = isEquirectangularImage(source.media.name, image.naturalWidth, image.naturalHeight);
        source.media.equirectangularCheckPending = false;
        render();
      }, { once: true });
    }
  }

  return Boolean(source.media.isEquirectangular)
    || /panorama|equirect|360/i.test(source.media.name ?? "");
}

// A higher white-balance Kelvin *setting* tells the camera "the light is
// cool, warm the image up" (and vice versa) — the standard, slightly
// counter-intuitive camera convention where the WB value is a correction,
// not the tint itself. sepia() alone leans warm; sepia() + hue-rotate(180deg)
// flips that same warmth into a cool/blue tint — a common lightweight CSS
// stand-in for a real white-balance shift, not a physical blackbody model.
const STREAM_DECK_KELVIN_NEUTRAL = 5600;

function getStreamDeckKelvinFilterCss(kelvinValue) {
  if (kelvinValue === STREAM_DECK_KELVIN_NEUTRAL) {
    return "";
  }

  if (kelvinValue > STREAM_DECK_KELVIN_NEUTRAL) {
    const warmth = clamp((kelvinValue - STREAM_DECK_KELVIN_NEUTRAL) / (15000 - STREAM_DECK_KELVIN_NEUTRAL), 0, 1);
    return `sepia(${Math.round(warmth * 60)}%)`;
  }

  const coolness = clamp((STREAM_DECK_KELVIN_NEUTRAL - kelvinValue) / (STREAM_DECK_KELVIN_NEUTRAL - 2000), 0, 1);
  return `sepia(${Math.round(coolness * 60)}%) hue-rotate(180deg)`;
}

// The Kelvin dial only actually affects the image once white balance mode is
// set to "kelvin" — on a real camera "auto"/"manual"/"wb_a"/"wb_b" ignore it.
// "tungsten"/"daylight" are fixed presets, approximated here with reference
// Kelvin values so they still visibly tint even though the camera doesn't
// expose their exact target temperature over the protocol.
const STREAM_DECK_TUNGSTEN_REFERENCE_KELVIN = 3200;

function getStreamDeckEffectiveKelvin(source) {
  const mode = source.whitebalanceMode ?? "auto";

  if (mode === "kelvin" && source.kelvinStepIndex !== undefined) {
    const kelvinIndex = clamp(Number(source.kelvinStepIndex), 0, STREAM_DECK_KELVIN_LIST.length - 1);
    return STREAM_DECK_KELVIN_LIST[kelvinIndex];
  }

  if (mode === "tungsten") {
    return STREAM_DECK_TUNGSTEN_REFERENCE_KELVIN;
  }

  if (mode === "daylight") {
    return STREAM_DECK_KELVIN_NEUTRAL;
  }

  return null;
}

function renderPtzPanoramaPicture(source) {
  const maxZoom = getStreamDeckMaxZoom(source);
  const ptz = normalizePtzState(source.ptz, maxZoom);
  const zoom = clamp(Number(ptz.zoom ?? 1.7), 1.1, maxZoom);

  const filters = [];

  // HDR sources bake exposure into the actual pixels (real linear-light
  // scaling + filmic tonemap in drawEquirectangularProjectionHDR) instead of
  // this CSS filter — a flat brightness() multiply on an already-tonemapped
  // SDR image can't recover highlight/shadow detail the way real HDR data can.
  if (!source.media?.isHDR) {
    // Each EV stop doubles/halves light, so brightness() gets a 2^EV multiplier
    // — a photometrically-reasonable stand-in for a real exposure/aperture change.
    // Combines AE Level with Gain/Iris/Shutter so all four controls visibly
    // affect the picture, not just AE Level.
    const exposureEV = getStreamDeckEffectiveExposureEV(source);
    if (exposureEV !== 0) {
      filters.push(`brightness(${2 ** exposureEV})`);
    }
  }

  const effectiveKelvin = getStreamDeckEffectiveKelvin(source);

  if (effectiveKelvin !== null) {
    const kelvinFilter = getStreamDeckKelvinFilterCss(effectiveKelvin);

    if (kelvinFilter) {
      filters.push(kelvinFilter);
    }
  }

  const filterStyle = filters.length ? ` style="filter: ${filters.join(" ")};"` : "";

  return `
    <div class="ptz-panorama-view">
      <canvas class="ptz-panorama-canvas"
        data-source-id="${source.id}"
        data-pan="${ptz.pan}"
        data-tilt="${ptz.tilt}"
        data-zoom="${zoom}"${filterStyle}></canvas>
      <span>${source.shortName ?? source.title}</span>
    </div>
  `;
}

function renderPipPicture(switcher, programFeed) {
  if (!switcher.pipEnabled || isBlackFeed(programFeed)) {
    return renderFeedPicture(programFeed);
  }

  return `
    <div class="pip-picture">
      <div class="pip-program-layer">
        ${renderFeedPicture(programFeed)}
      </div>
      ${getSwitcherPipSlots(switcher).map((slot) => {
        const feed = getSwitcherInputFeed(switcher, slot.input);
        return `
          <div class="pip-slot pip-slot-${slot.position}">
            ${renderFeedPicture(feed)}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function isBlackFeed(feed) {
  return getFeedPrimarySource(feed)?.id === "black";
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
        <div class="multiview-cell ${cell.className}" style="background: ${cell.source ? cell.source.pattern : multiviewEmptyColor}">
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

  return getFeedFromPort(inputConnection.from);
}

function getFeedFromPort(portRef, visited = new Set()) {
  const fromNode = getNode(portRef.nodeId);

  if (!fromNode || visited.has(`${portRef.nodeId}:${portRef.portId}`)) {
    return { type: "none", connected: false, source: null };
  }

  if (fromNode.type === "switcher") {
    visited.add(`${portRef.nodeId}:${portRef.portId}`);

    if (portRef.portId === "multiview-out") {
      return getSwitcherMultiviewFeed(fromNode);
    }

    const activeTransition = resolveTransitionFromPort(portRef, new Set(visited));

    if (activeTransition && portRef.portId === "program-out") {
      return { type: "program", connected: true, transition: activeTransition, source: null };
    }

    return getSwitcherProgramOutputFeed(fromNode, visited);
  }

  if (fromNode.type === "monitor" && ["sdi-out", "hdmi-out"].includes(portRef.portId)) {
    visited.add(`${portRef.nodeId}:${portRef.portId}`);
    return getMonitorFeedForOutput(fromNode, portRef.portId, visited);
  }

  if (fromNode.type === "splitter" && portRef.portId.startsWith("output-")) {
    visited.add(`${portRef.nodeId}:${portRef.portId}`);

    const inputConnection = state.connections.find((connection) => (
      connection.to.nodeId === fromNode.id && connection.to.portId === "input-1"
    ));

    return inputConnection
      ? getFeedFromPort(inputConnection.from, visited)
      : { type: "none", connected: false, source: null };
  }

  if (fromNode.type === "converter") {
    visited.add(`${portRef.nodeId}:${portRef.portId}`);

    const crossInputPortId = portRef.portId === "sdi-out"
      ? "hdmi-in"
      : portRef.portId === "hdmi-out" ? "sdi-in" : null;

    const inputConnection = crossInputPortId && state.connections.find((connection) => (
      connection.to.nodeId === fromNode.id && connection.to.portId === crossInputPortId
    ));

    return inputConnection
      ? getFeedFromPort(inputConnection.from, visited)
      : { type: "none", connected: false, source: null };
  }

  return { type: "program", connected: true, source: resolveSourceFromPort(portRef, visited) };
}

function getMonitorFeedForOutput(monitor, portId, visited = new Set()) {
  if (monitor?.type !== "monitor" || !["sdi-out", "hdmi-out"].includes(portId)) {
    return { type: "none", connected: false, source: null };
  }

  const preferredInputPortId = portId === "sdi-out" ? "sdi-in" : "hdmi-in";
  const inputConnection = state.connections.find((connection) => (
    connection.to.nodeId === monitor.id && connection.to.portId === preferredInputPortId
  )) ?? state.connections.find((connection) => (
    connection.to.nodeId === monitor.id && ["sdi-in", "hdmi-in"].includes(connection.to.portId)
  ));

  if (!inputConnection) {
    return { type: "none", connected: false, source: null };
  }

  return getFeedFromPort(inputConnection.from, visited);
}

function getSwitcherMultiviewFeed(switcher) {
  const mode = getSwitcherMultiviewMode(switcher);

  if (mode === "program") {
    return getSwitcherProgramOutputFeed(switcher);
  }

  if (mode === "clean") {
    return getSwitcherProgramFeed(switcher);
  }

  if (mode === "preview") {
    return getSwitcherPreviewFeed(switcher);
  }

  if (mode === "input") {
    return getSwitcherInputFeed(switcher, switcher.multiviewInput);
  }

  return { type: "multiview", connected: true, switcher, source: null };
}

function getSwitcherProgramSource(switcher) {
  return getFeedPrimarySource(getSwitcherProgramFeed(switcher));
}

function getSwitcherPreviewSource(switcher) {
  return getFeedPrimarySource(getSwitcherPreviewFeed(switcher));
}

function getSwitcherProgramOutputFeed(switcher, visited = new Set()) {
  const feed = getSwitcherProgramFeed(switcher, visited);
  const propagatedTransition = getPropagatedSwitcherOutputTransition(switcher, feed);

  return {
    type: "program",
    connected: true,
    transition: propagatedTransition,
    source: getFeedPrimarySource(feed),
    programFeed: feed,
    pipSwitcher: switcher
  };
}

function getSwitcherProgramOutputFeedForInput(switcher, input, visited = new Set()) {
  const feed = getSwitcherInputFeed(switcher, input, visited);
  const propagatedTransition = getPropagatedSwitcherOutputTransition(switcher, feed);

  return {
    type: "program",
    connected: true,
    transition: propagatedTransition,
    source: getFeedPrimarySource(feed),
    programFeed: feed,
    pipSwitcher: switcher
  };
}

function getPropagatedSwitcherOutputTransition(switcher, feed) {
  if (!feed?.transition) {
    return null;
  }

  return {
    ...feed.transition,
    fromSource: feed.transition.fromSource?.type
      ? feed.transition.fromSource
      : (feed.transition.fromSource ?? null),
    toSource: feed.transition.toSource?.type
      ? feed.transition.toSource
      : (feed.transition.toSource ?? null),
    throughSwitcherId: switcher.id
  };
}

function getSwitcherProgramFeed(switcher, visited = new Set()) {
  return switcher?.programInput
    ? getSwitcherInputFeed(switcher, switcher.programInput, visited)
    : { type: "program", connected: true, source: null };
}

function getSwitcherPreviewFeed(switcher, visited = new Set()) {
  return switcher?.previewInput
    ? getSwitcherInputFeed(switcher, switcher.previewInput, visited)
    : { type: "program", connected: true, source: null };
}

function getSwitcherInputFeed(switcher, input, visited = new Set()) {
  const mediaSource = getSwitcherMediaSource(input, switcher);

  if (mediaSource) {
    return { type: "program", connected: true, source: mediaSource };
  }

  const connection = state.connections.find((item) => (
    item.to.nodeId === switcher.id && item.to.portId === `input-${input}`
  ));

  return connection
    ? getFeedFromPort(connection.from, visited)
    : { type: "program", connected: true, source: null };
}

function getFeedPrimarySource(feed) {
  if (!feed) {
    return null;
  }

  if (feed.source) {
    return feed.source;
  }

  if (feed.transition) {
    return feed.transition.toSource ?? feed.transition.fromSource ?? null;
  }

  return null;
}

function getSwitcherInputSource(switcher, input) {
  return getFeedPrimarySource(getSwitcherInputFeed(switcher, input));
}

function getSwitcherMediaSource(source, switcher = null) {
  const mediaSource = switcherMediaSources.find((item) => item.id === source) ?? null;

  if (!mediaSource || !["mp1", "mp2"].includes(mediaSource.id) || !switcher) {
    return mediaSource;
  }

  ensureSwitcherMediaPools(switcher);
  const pool = switcher.mediaPools[mediaSource.id];
  const selectedMedia = pool.slots[pool.selectedSlot];

  return {
    ...mediaSource,
    shortName: mediaSource.shortName,
    name: selectedMedia ? `${mediaSource.name} Slot ${pool.selectedSlot + 1}` : mediaSource.name,
    media: selectedMedia ?? null
  };
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

function resolveNodeInputSource(node, portId, visited = new Set()) {
  const connection = state.connections.find((item) => (
    item.to.nodeId === node.id && item.to.portId === portId
  ));

  return connection ? resolveSourceFromPort(connection.from, visited) : null;
}

const AUDIO_RECORDER_INPUT_PRIORITY = ["mic-line-1", "mic-line-2", "mic-line-3", "aux-in"];

function resolveSourceFromPort(portRef, visited = new Set()) {
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

  if (node.type === "wirelessReceiver" && portRef.portId === "mic-out") {
    return node;
  }

  if (node.type === "microphone") {
    return node;
  }

  if (visited.has(`${portRef.nodeId}:${portRef.portId}`)) {
    return null;
  }

  visited.add(`${portRef.nodeId}:${portRef.portId}`);

  if (node.type === "splitter") {
    return resolveNodeInputSource(node, "input-1", visited);
  }

  if (node.type === "switcher" && portRef.portId === "program-out") {
    return getSwitcherProgramSource(node);
  }

  if (node.type === "monitor" && ["sdi-out", "hdmi-out"].includes(portRef.portId)) {
    return getMonitorFeedForOutput(node, portRef.portId, visited).source;
  }

  if (node.type === "converter") {
    // The BiDirectional converter cross-converts both directions at once:
    // whatever feeds HDMI In comes back out SDI Out, and vice versa.
    const crossInputPortId = portRef.portId === "sdi-out"
      ? "hdmi-in"
      : portRef.portId === "hdmi-out" ? "sdi-in" : null;

    return crossInputPortId ? resolveNodeInputSource(node, crossInputPortId, visited) : null;
  }

  if (node.type === "audioRecorder") {
    // The mixer has no per-channel mute/fader modeled, so all of its outputs
    // just report whichever input is actually plugged in first, checked in
    // physical priority order (the 3 mic/line channels, then aux).
    for (const inputPortId of AUDIO_RECORDER_INPUT_PRIORITY) {
      const source = resolveNodeInputSource(node, inputPortId, visited);

      if (source) {
        return source;
      }
    }

    return null;
  }

  return null;
}

function renderLines() {
  purgeExpiredAudioFades();
  connectionController.render();
}

function getConnectionAudioMarkers(connection) {
  const fromNode = getNode(connection.from.nodeId);
  const toNode = getNode(connection.to.nodeId);

  if (fromNode?.type === "wirelessReceiver" && connection.from.portId === "mic-out") {
    return getWirelessReceiverMicOutMarkers(fromNode, toNode, connection.to.portId);
  }

  // A live mic is always "on" once cabled up — no mute/on-off state modeled
  // for it, unlike the mixer/ATEM downstream of it.
  if (fromNode?.type === "microphone") {
    return [{
      id: `${fromNode.id}-${connection.from.portId}`,
      label: fromNode.shortName ?? fromNode.title,
      color: getSourceAudioColor(fromNode, fromNode.id)
    }];
  }

  if (fromNode?.type === "audioRecorder") {
    return getAudioRecorderOutputMarkers(fromNode, toNode, connection.to.portId);
  }

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

  if (connection.signal === "Wireless") {
    return [{
      id: `${connection.from.nodeId}-${connection.from.portId}`,
      label: fromNode?.title ?? "Wireless Mic",
      color: getWirelessChannelColor(connection.to.portId)
    }];
  }

  return [];
}

// Each wireless channel gets its own note color so the mic feeding the sound
// stays visually traceable once it's mixed down onto the receiver's Mic Out.
function getWirelessChannelColor(channelPortId) {
  return channelPortId === "wireless-in-2" ? "#f5f5f5" : "#f4c453";
}

function getWirelessReceiverMicOutMarkers(receiver, toNode, toPortId) {
  // Only an ATEM mic channel has an on/off toggle gating whether the audio
  // "arrives" at the mix - other destinations (e.g. a camera's mic input)
  // simply carry the signal whenever the wireless channel is connected.
  if (toNode?.type === "switcher") {
    const micId = toPortId?.startsWith("mic-in-") ? `mic${toPortId.replace("mic-in-", "")}` : null;
    const micIsOn = micId && getSwitcherMicAudioMode(toNode, micId) === "on";

    if (!micIsOn) {
      return [];
    }
  }

  return ["wireless-in-1", "wireless-in-2"]
    .filter((portId) => isPortConnected(receiver.id, portId))
    .map((portId) => ({
      id: `${receiver.id}-${portId}-mic-out`,
      label: portId === "wireless-in-1" ? "CH 1" : "CH 2",
      color: getWirelessChannelColor(portId)
    }));
}

// No per-channel mute/fader is modeled on the mixer, so every mic actually
// plugged into it shows up as its own note on whichever output is cabled
// onward — same ATEM on/off gating as the wireless receiver above, otherwise
// the signal is just always considered "live".
function getAudioRecorderOutputMarkers(recorder, toNode, toPortId) {
  if (toNode?.type === "switcher") {
    const micId = toPortId?.startsWith("mic-in-") ? `mic${toPortId.replace("mic-in-", "")}` : null;
    const micIsOn = micId && getSwitcherMicAudioMode(toNode, micId) === "on";

    if (!micIsOn) {
      return [];
    }
  }

  return AUDIO_RECORDER_INPUT_PRIORITY
    .map((portId) => ({ portId, source: resolveNodeInputSource(recorder, portId) }))
    .filter(({ source }) => source)
    .map(({ portId, source }) => ({
      id: `${recorder.id}-${portId}-out`,
      label: source.shortName ?? source.title,
      color: getSourceAudioColor(source, `${recorder.id}-${portId}`)
    }));
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

connectionController = new BroadcastConnections.ConnectionController({
  callbacks: {
    getActiveDrag: () => activeDrag,
    getAudioMarkers: getConnectionAudioMarkers,
    getClassName: getConnectionClass,
    getLabel: getConnectionLabel,
    getWorkspacePoint,
    getZoom: () => state.zoom,
    isValidConnection,
    recordUndoSnapshot,
    render,
    renderLines,
    setActiveDrag: (drag) => {
      activeDrag = drag;
    },
    setSuppressNextSocketClick: (value) => {
      suppressNextSocketClick = value;
    }
  },
  config: {
    signalColors,
    snapDistance: CABLE_SNAP_DISTANCE_PX,
    worldHeight: WORLD_HEIGHT,
    worldWidth: WORLD_WIDTH
  },
  elements: {
    cableLayer,
    deviceLayer,
    workspace
  },
  state
});

atemController = new BroadcastAtem.AtemController({
  callbacks: {
    beginAudioFadeForProgramChange,
    beginAudioFadeToBlack,
    clamp,
    getNode,
    getSwitcherBusMode,
    getSwitcherInputSource,
    getSwitcherMediaSource,
    getSwitcherPipPreset,
    getSwitcherTransitionDurationMs,
    hasPipPreset: (presetId) => pipPresets.some((preset) => preset.id === presetId),
    normalizeSwitcherBusSource,
    render
  },
  state
});

atemAudioController = new BroadcastAtemAudio.AtemAudioController({
  callbacks: {
    clamp,
    createAudioChannelFaderState,
    ensureSwitcherAudioState,
    getNode,
    getSwitcherHeadphoneFader,
    getSwitcherInputChannelFaders,
    getSwitcherInputFader,
    getSwitcherInputGain,
    getSwitcherMicFaders,
    getSwitcherMicGain,
    render,
    renderAudioMeterPopover,
    setSwitcherInputFader,
    setSwitcherInputGain,
    setSwitcherMicGain,
    showAudioMeter,
    updateChannelFaderState
  }
});

atemMediaController = new BroadcastAtemMedia.AtemMediaPoolController({
  callbacks: {
    clamp,
    ensureSwitcherMediaPools,
    fileToDataUrl,
    getNode,
    render,
    selectPreview: (switcherId, playerId) => atemController.selectPreview(switcherId, playerId)
  },
  config: {
    slotCount: MEDIA_POOL_SLOT_COUNT
  },
  elements: {
    cursor: mediaPoolCursor,
    dialog: mediaPoolDialog,
    fileInput: mediaPoolFileInput,
    grid: mediaPoolGrid,
    heading: mediaPoolHeading
  },
  state
});

deviceRenderer = new BroadcastDeviceRenderers.DeviceRenderer({
  callbacks: {
    ensureMonitorLoopOutputs,
    ensureSourceIdentity,
    ensureSwitcherMediaPools,
    getActiveSwitcher,
    getMonitorLabel,
    getPtzControlledCamera,
    getStreamDeckButtonStyle,
    getStreamDeckIrisLabel,
    getStreamDeckShutterLabel,
    getStreamDeckKelvinLabel,
    getSwitcherBusMode,
    getSwitcherPreviewSource,
    getSwitcherProgramSource,
    getSwitcherReadout,
    getSwitcherTransitionDurationMs,
    getWirelessChannelMeter,
    isDisplaySourceNode,
    isPortConnected,
    isPtzPanoramaSource,
    isNodeSelected,
    normalizeSourceViewMode,
    renderMediaSurface,
    renderMonitorPicture,
    renderPtzPanoramaPicture,
    renderSwitcherPanel,
    resolveNodeInputSource
  },
  config: {
    signalColors,
    sourceFallbackColor
  },
  state
});

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

function selectPtzCamera(nodeId, cameraNumber) {
  const node = getNode(nodeId);

  if (!node || node.type !== "ptzController" || !Number.isInteger(cameraNumber)) {
    return;
  }

  recordUndoSnapshot();
  node.selectedCamera = cameraNumber;
  render();
}

function startPtzJoystickDrag(event, control) {
  const node = getNode(control.dataset.nodeId);

  if (!node || node.type !== "ptzController") {
    return;
  }

  const camera = getPtzControlledCamera(node);

  if (camera) {
    cancelPtzPresetRecallAnimation(camera.id);
  }

  recordUndoSnapshot();
  const rect = control.getBoundingClientRect();
  activePtzJoystickDrag = {
    pointerId: event.pointerId,
    control,
    nodeId: node.id,
    centerX: rect.left + rect.width / 2,
    centerY: rect.top + rect.height / 2,
    radius: rect.width * 0.34,
    lastFrameTime: null,
    returnFrameTime: null,
    zoomDirection: getPtzZoomDirection(event)
  };
  control.setPointerCapture?.(event.pointerId);
  updatePtzJoystickDrag(event);
  startPtzCameraMotion();
  event.preventDefault();
  event.stopPropagation();
}

function updatePtzJoystickDrag(event) {
  if (!activePtzJoystickDrag || activePtzJoystickDrag.pointerId !== event.pointerId) {
    return;
  }

  const node = getNode(activePtzJoystickDrag.nodeId);

  if (!node) {
    return;
  }

  const rawX = (event.clientX - activePtzJoystickDrag.centerX) / activePtzJoystickDrag.radius;
  const rawY = (event.clientY - activePtzJoystickDrag.centerY) / activePtzJoystickDrag.radius;
  const distance = Math.hypot(rawX, rawY);
  const scale = distance > 1 ? 1 / distance : 1;
  const x = clamp(Math.round(rawX * scale * 100) / 100, -1, 1);
  const y = clamp(Math.round(rawY * scale * 100) / 100, -1, 1);

  node.joystick = { x, y };
  activePtzJoystickDrag.zoomDirection = getPtzZoomDirection(event);
  activePtzJoystickDrag.control.style.setProperty("--ptz-joy-x", x);
  activePtzJoystickDrag.control.style.setProperty("--ptz-joy-y", y);
  activePtzJoystickDrag.control.setAttribute("aria-valuenow", String(Math.round(Math.hypot(x, y) * 100)));
  activePtzJoystickDrag.control.setAttribute("aria-label", `Joystick X ${Math.round(x * 100)} Y ${Math.round(y * 100)} Zoom ${activePtzJoystickDrag.zoomDirection}`);
}

function endPtzJoystickDrag(event) {
  if (!activePtzJoystickDrag || activePtzJoystickDrag.pointerId !== event.pointerId) {
    return;
  }

  activePtzJoystickDrag.control.releasePointerCapture?.(event.pointerId);
  activePtzJoystickDrag.returnFrameTime = null;
  startPtzJoystickReturn(activePtzJoystickDrag);
  activePtzJoystickDrag = null;
}

function getPtzZoomDirection(event) {
  if (event.shiftKey) {
    return 1;
  }

  if (event.altKey) {
    return -1;
  }

  return 0;
}

function updateActivePtzModifierState(event) {
  if (!activePtzJoystickDrag) {
    return;
  }

  activePtzJoystickDrag.zoomDirection = getPtzZoomDirection(event);
}

function startPtzCameraMotion() {
  if (ptzAnimationFrame) {
    return;
  }

  ptzAnimationFrame = requestAnimationFrame(tickPtzCameraMotion);
}

function tickPtzCameraMotion(timestamp) {
  ptzAnimationFrame = null;

  if (!activePtzJoystickDrag) {
    return;
  }

  const drag = activePtzJoystickDrag;
  const node = getNode(drag.nodeId);

  if (!node) {
    return;
  }

  const elapsed = drag.lastFrameTime ? Math.min((timestamp - drag.lastFrameTime) / 1000, 0.05) : 0;
  drag.lastFrameTime = timestamp;

  if (elapsed > 0) {
    moveSelectedPtzCamera(
      node,
      node.joystick?.x ?? 0,
      node.joystick?.y ?? 0,
      drag.zoomDirection ?? 0,
      elapsed
    );
    renderPtzProjectionCanvases();
  }

  ptzAnimationFrame = requestAnimationFrame(tickPtzCameraMotion);
}

function startPtzJoystickReturn(drag) {
  const node = getNode(drag.nodeId);

  if (!node) {
    render();
    return;
  }

  const step = (timestamp) => {
    const elapsed = drag.returnFrameTime ? Math.min((timestamp - drag.returnFrameTime) / 1000, 0.05) : 0;
    drag.returnFrameTime = timestamp;
    const currentX = node.joystick?.x ?? 0;
    const currentY = node.joystick?.y ?? 0;
    const stiffness = 12;
    const nextX = Math.abs(currentX) < 0.01 ? 0 : currentX * Math.max(0, 1 - stiffness * elapsed);
    const nextY = Math.abs(currentY) < 0.01 ? 0 : currentY * Math.max(0, 1 - stiffness * elapsed);

    node.joystick = { x: nextX, y: nextY };
    drag.control.style.setProperty("--ptz-joy-x", nextX);
    drag.control.style.setProperty("--ptz-joy-y", nextY);

    if (nextX || nextY) {
      requestAnimationFrame(step);
      return;
    }

    render();
  };

  requestAnimationFrame(step);
}

function moveSelectedPtzCamera(controller, x, y, zoomDirection = 0, elapsed = 1 / 60) {
  const camera = getPtzControlledCamera(controller);

  if (!camera) {
    return;
  }

  movePtzCameraByVector(camera, x, y, zoomDirection, elapsed);
}

// PT Speed / Zoom Speed (set via the Stream Deck's canon-ptz actions) scale
// motion here rather than in the callers, so both control paths that already
// share this function — the SKAARHOJ joystick drag (moveSelectedPtzCamera)
// and the Stream Deck direction-button hold (tickStreamDeckPtzMotion) — pick
// up the effect automatically, with no separate wiring needed per caller.
function getStreamDeckPanTiltSpeedMultiplier(camera) {
  const level = clamp(Number(camera?.panTiltSpeedLevel ?? STREAM_DECK_PT_SPEED_DEFAULT), STREAM_DECK_PT_SPEED_MIN, STREAM_DECK_PT_SPEED_MAX);
  return level / STREAM_DECK_PT_SPEED_DEFAULT;
}

function getStreamDeckZoomSpeedMultiplier(camera) {
  if (camera?.zoomSpeedValue === undefined) {
    return 1;
  }

  // A floor keeps "LOW" (protocol value 0) from fully freezing zoom — it's
  // meant to read as "very slow", not "broken".
  const value = clamp(Number(camera.zoomSpeedValue), 0, 127);
  return Math.max(value, 8) / 64;
}

function movePtzCameraByVector(camera, x, y, zoomDirection = 0, elapsed = 1 / 60) {
  const maxZoom = getStreamDeckMaxZoom(camera);
  const current = normalizePtzState(camera.ptz, maxZoom);
  const panTiltMultiplier = getStreamDeckPanTiltSpeedMultiplier(camera);
  const zoomMultiplier = getStreamDeckZoomSpeedMultiplier(camera);
  const panVelocity = Math.sign(x) * Math.pow(Math.abs(x), 1.35) * 82 * panTiltMultiplier;
  const tiltVelocity = Math.sign(y) * Math.pow(Math.abs(y), 1.35) * 48 * panTiltMultiplier;
  const zoomVelocity = zoomDirection * 0.85 * zoomMultiplier;

  camera.ptz = {
    ...current,
    pan: clamp(current.pan + panVelocity * elapsed, -180, 180),
    tilt: clamp(current.tilt - tiltVelocity * elapsed, -75, 75),
    zoom: clamp(current.zoom + zoomVelocity * elapsed, 1.1, maxZoom)
  };
}

// Continuous pan/tilt motion driven by holding a Stream Deck direction
// button (canon-ptz "up"/"left"/etc.), addressing the mapped camera directly
// — the joystick's own drag loop (tickPtzCameraMotion) is tied to a
// ptzController node and its "selected camera", which doesn't apply here.
function startStreamDeckPtzMotion(camera, vector) {
  if (!camera) {
    return;
  }

  activeStreamDeckPtzMotion = {
    camera,
    vector: { x: vector.x ?? 0, y: vector.y ?? 0, zoomDirection: vector.zoomDirection ?? 0 },
    lastFrameTime: null
  };

  if (!streamDeckPtzAnimationFrame) {
    streamDeckPtzAnimationFrame = requestAnimationFrame(tickStreamDeckPtzMotion);
  }
}

function stopStreamDeckPtzMotion() {
  activeStreamDeckPtzMotion = null;
}

function tickStreamDeckPtzMotion(timestamp) {
  streamDeckPtzAnimationFrame = null;

  if (!activeStreamDeckPtzMotion) {
    return;
  }

  const motion = activeStreamDeckPtzMotion;
  const elapsed = motion.lastFrameTime ? Math.min((timestamp - motion.lastFrameTime) / 1000, 0.05) : 0;
  motion.lastFrameTime = timestamp;

  if (elapsed > 0) {
    movePtzCameraByVector(motion.camera, motion.vector.x, motion.vector.y, motion.vector.zoomDirection, elapsed);
    renderPtzProjectionCanvases();
  }

  streamDeckPtzAnimationFrame = requestAnimationFrame(tickStreamDeckPtzMotion);
}

const STREAM_DECK_PTZ_DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  upLeft: { x: -1, y: -1 },
  upRight: { x: 1, y: -1 },
  downLeft: { x: -1, y: 1 },
  downRight: { x: 1, y: 1 }
};

// Discrete step tables for the Iris/Shutter Up/Down buttons — real cameras
// step through fixed f-stops/shutter speeds rather than a linear scale, so
// we track an index into these instead of a raw number. "Up" moves toward
// the brighter end (wider aperture / slower shutter) for both, matching how
// "Gain Up" also means brighter — consistent across all three exposure controls.
// Iris: 1/3-stop sequence F1.8–F11 (per Canon XC Control Protocol Specs — the
// exact list is zoom-dependent in the real protocol, which is out of scope
// for this simulation, so this fixed range stands in for it). Shutter: the
// camera's own shutter-speed list (denominator of 1/x seconds).
const STREAM_DECK_IRIS_LABELS = ["F1.8", "F2.0", "F2.2", "F2.4", "F2.8", "F3.2", "F3.5", "F4.0", "F4.5", "F5.0", "F5.6", "F6.3", "F7.1", "F8.0", "F9.0", "F10", "F11"];
const STREAM_DECK_IRIS_DEFAULT_INDEX = 10;
const STREAM_DECK_SHUTTER_LABELS = ["1/60", "1/75", "1/90", "1/100", "1/120", "1/150", "1/180", "1/210", "1/250", "1/300", "1/360", "1/420", "1/500", "1/600", "1/720", "1/840", "1/1000", "1/1200", "1/1400", "1/1700", "1/2000"];
const STREAM_DECK_SHUTTER_DEFAULT_INDEX = 0;

function getStreamDeckIrisLabel(camera) {
  const index = clamp(Number(camera?.irisStepIndex ?? STREAM_DECK_IRIS_DEFAULT_INDEX), 0, STREAM_DECK_IRIS_LABELS.length - 1);
  return STREAM_DECK_IRIS_LABELS[index];
}

function getStreamDeckShutterLabel(camera) {
  const index = clamp(Number(camera?.shutterStepIndex ?? STREAM_DECK_SHUTTER_DEFAULT_INDEX), 0, STREAM_DECK_SHUTTER_LABELS.length - 1);
  return STREAM_DECK_SHUTTER_LABELS[index];
}

// Combined visual range for Gain+Iris+Shutter+AE-Level together — wide
// enough that pushing all three toward one extreme genuinely blows out or
// crushes the image (as it would on a real camera), while still keeping the
// CSS brightness()/HDR exposure multiplier out of numerically silly territory.
const STREAM_DECK_EXPOSURE_EV_LIMIT = 8;

// Gain, Iris and Shutter each independently brighten/darken the picture on a
// real camera, on top of the explicit AE Level (aeBrightness) compensation.
// Converts each control's current step to an EV offset relative to its own
// neutral/default step, so Gain/Iris/Shutter Up/Down buttons actually affect
// the rendered image instead of only updating their on-screen value.
function getStreamDeckExposureContributionEV(camera) {
  // ~6.02dB per stop (doubling of linear gain), the standard photographic
  // dB-to-stops conversion.
  const gainEV = Number(camera?.gainDb ?? 0) / 6.02;

  const fNumber = parseFloat(getStreamDeckIrisLabel(camera).replace("F", ""));
  const neutralFNumber = parseFloat(STREAM_DECK_IRIS_LABELS[STREAM_DECK_IRIS_DEFAULT_INDEX].replace("F", ""));
  const irisEV = 2 * Math.log2(neutralFNumber / fNumber);

  const shutterDenominator = parseFloat(getStreamDeckShutterLabel(camera).split("/")[1]);
  const neutralShutterDenominator = parseFloat(STREAM_DECK_SHUTTER_LABELS[STREAM_DECK_SHUTTER_DEFAULT_INDEX].split("/")[1]);
  const shutterEV = Math.log2(neutralShutterDenominator / shutterDenominator);

  return gainEV + irisEV + shutterEV;
}

// Total exposure EV actually applied to the rendered picture: AE Level
// (aeBrightness, ±1.5EV) plus the Gain/Iris/Shutter contribution above.
function getStreamDeckEffectiveExposureEV(camera) {
  const aeBrightnessEV = clamp(Number(camera?.exposureEV ?? 0), -1.5, 1.5);
  const contributionEV = getStreamDeckExposureContributionEV(camera);
  return clamp(aeBrightnessEV + contributionEV, -STREAM_DECK_EXPOSURE_EV_LIMIT, STREAM_DECK_EXPOSURE_EV_LIMIT);
}

// Color temperature (K) list per Canon XC Control Protocol Specs
// (c.1.wb.kelvin.list) — non-linear, denser toward the warm end.
const STREAM_DECK_KELVIN_LIST = [
  2000, 2020, 2040, 2060, 2080, 2110, 2130, 2150, 2170, 2200, 2220, 2250, 2270, 2300, 2330, 2350, 2380, 2410, 2440,
  2470, 2500, 2530, 2560, 2600, 2630, 2670, 2700, 2740, 2780, 2820, 2860, 2900, 2940, 2990, 3030, 3080, 3130, 3200,
  3230, 3280, 3330, 3390, 3450, 3510, 3570, 3640, 3700, 3770, 3850, 3920, 4000, 4080, 4170, 4300, 4350, 4440, 4550,
  4650, 4760, 4880, 5000, 5130, 5260, 5410, 5600, 5710, 5880, 6060, 6300, 6450, 6670, 6900, 7140, 7410, 7690, 8000,
  8330, 8700, 9090, 9520, 10000, 10530, 11110, 11760, 12500, 13330, 14290, 15000
];
const STREAM_DECK_KELVIN_DEFAULT_INDEX = STREAM_DECK_KELVIN_LIST.indexOf(4760);

// Reads the actually-applied Kelvin value where possible (getStreamDeckEffectiveKelvin
// accounts for whitebalanceMode: "daylight"/"tungsten" use their fixed reference
// value, not the last Kelvin Up/Down step), falling back to the raw stored step
// for modes where no fixed/simulated value applies (auto/manual/wb_a/wb_b) — so
// toggling WB mode (whitebalanceModeToggle) updates this readout too, not only
// the dedicated Kelvin Up/Down buttons.
function getStreamDeckKelvinLabel(camera) {
  const effectiveKelvin = getStreamDeckEffectiveKelvin(camera);

  if (effectiveKelvin !== null) {
    return `${effectiveKelvin}K`;
  }

  const index = clamp(Number(camera?.kelvinStepIndex ?? STREAM_DECK_KELVIN_DEFAULT_INDEX), 0, STREAM_DECK_KELVIN_LIST.length - 1);
  return `${STREAM_DECK_KELVIN_LIST[index]}K`;
}

// "whitebalanceModeToggle" has no options — the real camera cycles through
// its own mode list internally on each press, so we track the same fixed
// order ourselves (per Canon XC Control Protocol Specs' c.1.wb.list).
const STREAM_DECK_WB_MODES = ["auto", "manual", "kelvin", "daylight", "tungsten", "wb_a", "wb_b"];

// ptSpeedU/ptSpeedD carry no options — the real protocol exposes a
// continuous pan/tilt speed ratio (1–1000, zoom-dependent), which is too
// granular to be meaningful as a Stream Deck Up/Down stepper, so this
// simplifies it to a plain 1–24 level (matches common PTZ speed-level
// conventions) rather than modeling the exact ratio.
const STREAM_DECK_PT_SPEED_MIN = 1;
const STREAM_DECK_PT_SPEED_MAX = 24;
const STREAM_DECK_PT_SPEED_DEFAULT = 12;

function getPtzControlledCamera(controller) {
  const cameraNumber = Number(controller?.selectedCamera ?? 1);

  if (!Number.isInteger(cameraNumber) || cameraNumber < 1 || !controller) {
    return null;
  }

  // Camera slot buttons are ordinal positions among whatever cameras this
  // controller can actually reach over the network, not a match against a
  // camera's display name/number, so control works regardless of naming.
  const reachableCameras = getLanReachableCameras(controller);

  return reachableCameras[cameraNumber - 1] ?? null;
}

// PTZ control travels the LAN cabling graph (hopping through any number of
// networkSwitch nodes, which relay between all of their ports) rather than the
// ATEM switcher's video input wiring, since a SKAARHOJ controls whatever camera
// it can actually reach over the network, regardless of where the video goes.
function getLanReachableCameras(controller) {
  const lanConnections = state.connections.filter((connection) => connection.signal === "LAN");
  const visited = new Set([controller.id]);
  const queue = [controller.id];
  const cameras = [];

  while (queue.length) {
    const currentId = queue.shift();
    const neighborIds = new Set();

    lanConnections.forEach((connection) => {
      if (connection.from.nodeId === currentId) {
        neighborIds.add(connection.to.nodeId);
      }
      if (connection.to.nodeId === currentId) {
        neighborIds.add(connection.from.nodeId);
      }
    });

    neighborIds.forEach((neighborId) => {
      if (visited.has(neighborId)) {
        return;
      }
      visited.add(neighborId);

      const neighborNode = getNode(neighborId);

      if (!neighborNode) {
        return;
      }

      if (neighborNode.type === "camera") {
        cameras.push(neighborNode);
      } else if (neighborNode.type === "networkSwitch") {
        queue.push(neighborId);
      }
    });
  }

  // Stable slot order (independent of connection/discovery order): cameras
  // keep the same "Cam N" position for as long as they exist in the project.
  return cameras.sort((a, b) => state.nodes.indexOf(a) - state.nodes.indexOf(b));
}

// maxZoom defaults to the optical-only range (3.2x) — callers that know a
// camera has Digital Zoom enabled pass getStreamDeckMaxZoom(camera) instead,
// everyone else is unaffected.
function normalizePtzState(ptz, maxZoom = 3.2) {
  return {
    pan: clamp(Number(ptz?.pan ?? 0), -180, 180),
    tilt: clamp(Number(ptz?.tilt ?? 0), -75, 75),
    zoom: clamp(Number(ptz?.zoom ?? 1.7), 1.1, maxZoom)
  };
}

const STREAM_DECK_DIGITAL_ZOOM_MAX = 6.0;

function getStreamDeckMaxZoom(camera) {
  return camera?.digitalZoomEnabled ? STREAM_DECK_DIGITAL_ZOOM_MAX : 3.2;
}

// Preset storage lives on the camera itself (not the controller), so any
// controller — the PTZ Pro's numbered keys, or an imported Stream Deck button
// mapped directly to this camera — can save/recall the same memorized shots.
function saveCameraPreset(camera, presetNumber) {
  if (!camera || camera.type !== "camera") {
    return;
  }

  recordUndoSnapshot();
  camera.presets = {
    ...(camera.presets ?? {}),
    [presetNumber]: {
      ...normalizePtzState(camera.ptz),
      // AE-Level, Farbtemperatur und Gain/Iris/Shutter gehören zum "Look"
      // einer Einstellung genauso wie die Bildausrichtung — Preset 1 kann so
      // z.B. +1.5EV/3200K/F1.8 sein und Preset 2 -1.5EV/5600K/F11, ohne dass
      // ein Recall das jeweils andere überschreibt. Jeder Wert wird hier auf
      // seinen (ggf. neutralen Default-)Wert normalisiert statt roh
      // übernommen — eine frisch hinzugefügte Kamera hat z.B. noch nie
      // gesetztes camera.gainDb === undefined; würden wir das ungeprüft
      // speichern, bliebe beim späteren Recall (das undefined-Werte bewusst
      // überspringt) der zu diesem Zeitpunkt zufällig live anliegende Gain
      // stehen, statt deterministisch auf den Preset-Zustand zurückzufallen.
      exposureEV: clamp(Number(camera.exposureEV ?? 0), -1.5, 1.5),
      kelvinStepIndex: clamp(Number(camera.kelvinStepIndex ?? STREAM_DECK_KELVIN_DEFAULT_INDEX), 0, STREAM_DECK_KELVIN_LIST.length - 1),
      whitebalanceMode: camera.whitebalanceMode ?? "auto",
      gainDb: clamp(Number(camera.gainDb ?? 0), 0, 36),
      irisStepIndex: clamp(Number(camera.irisStepIndex ?? STREAM_DECK_IRIS_DEFAULT_INDEX), 0, STREAM_DECK_IRIS_LABELS.length - 1),
      shutterStepIndex: clamp(Number(camera.shutterStepIndex ?? STREAM_DECK_SHUTTER_DEFAULT_INDEX), 0, STREAM_DECK_SHUTTER_LABELS.length - 1)
    }
  };
  render();
}

function recallCameraPreset(camera, presetNumber) {
  const preset = camera?.presets?.[presetNumber];

  if (!preset) {
    return;
  }

  recordUndoSnapshot();

  // Belichtung/Weissabgleich springen sofort (wie am realen Gerät), nur
  // Pan/Tilt/Zoom fahren weiterhin sanft animiert über animatePtzTo.
  if (preset.exposureEV !== undefined) {
    camera.exposureEV = preset.exposureEV;
  }
  if (preset.kelvinStepIndex !== undefined) {
    camera.kelvinStepIndex = preset.kelvinStepIndex;
  }
  if (preset.whitebalanceMode !== undefined) {
    camera.whitebalanceMode = preset.whitebalanceMode;
  }
  if (preset.gainDb !== undefined) {
    camera.gainDb = preset.gainDb;
  }
  if (preset.irisStepIndex !== undefined) {
    camera.irisStepIndex = preset.irisStepIndex;
  }
  if (preset.shutterStepIndex !== undefined) {
    camera.shutterStepIndex = preset.shutterStepIndex;
  }

  animatePtzTo(camera, normalizePtzState(preset));
  render();
}

// PTZ Pro preset keys save/recall the pan/tilt/zoom framing onto whichever
// camera the controller currently has selected — like a real PTZ camera, the
// memorized shots belong to the camera itself, so switching "Cam N" on the
// controller switches to that camera's own set of saved presets too.
function savePtzPreset(controllerId, presetNumber) {
  const controller = getNode(controllerId);

  if (!controller || controller.type !== "ptzController") {
    return;
  }

  saveCameraPreset(getPtzControlledCamera(controller), presetNumber);
}

function recallPtzPreset(controllerId, presetNumber) {
  const controller = getNode(controllerId);

  if (!controller || controller.type !== "ptzController") {
    return;
  }

  recallCameraPreset(getPtzControlledCamera(controller), presetNumber);
}

const PTZ_PRESET_RECALL_MS = 650;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

// Glides the camera's pan/tilt/zoom from wherever it currently is to the
// preset's saved framing, instead of snapping straight there, so the move is
// visible in the panorama preview — like a real PTZ camera easing into a
// memorized shot. Only the panorama canvas is repainted per frame (mirroring
// tickPtzCameraMotion's joystick-drag loop); a full render() only happens
// once the glide settles, since render() rebuilds the whole node DOM and
// would otherwise interrupt the animation every frame.
function cancelPtzPresetRecallAnimation(cameraId) {
  const existingFrame = ptzPresetRecallAnimations.get(cameraId);

  if (existingFrame) {
    cancelAnimationFrame(existingFrame);
    ptzPresetRecallAnimations.delete(cameraId);
  }
}

function animatePtzTo(camera, target) {
  cancelPtzPresetRecallAnimation(camera.id);

  const start = normalizePtzState(camera.ptz);
  const startTime = performance.now();

  const step = (timestamp) => {
    const t = clamp((timestamp - startTime) / PTZ_PRESET_RECALL_MS, 0, 1);
    const eased = easeInOutCubic(t);

    camera.ptz = {
      pan: start.pan + (target.pan - start.pan) * eased,
      tilt: start.tilt + (target.tilt - start.tilt) * eased,
      zoom: start.zoom + (target.zoom - start.zoom) * eased
    };
    renderPtzProjectionCanvases();

    if (t < 1) {
      ptzPresetRecallAnimations.set(camera.id, requestAnimationFrame(step));
      return;
    }

    ptzPresetRecallAnimations.delete(camera.id);
    camera.ptz = target;
    render();
  };

  ptzPresetRecallAnimations.set(camera.id, requestAnimationFrame(step));
}

// A tap (release before the hold delay elapses) recalls the preset; holding
// past the delay saves the camera's current framing into that slot instead.
// The action fires from pointerdown/pointerup timing directly (like the
// audio fader hold-to-repeat controls) rather than from a native click, so
// the two behaviors can't both fire for the same press.
function startPtzPresetPress(button) {
  stopPtzPresetPress(false);

  ptzPresetPressContext = {
    nodeId: button.dataset.nodeId,
    preset: Number(button.dataset.preset),
    longPressFired: false
  };

  ptzPresetPressTimer = window.setTimeout(() => {
    if (!ptzPresetPressContext) {
      return;
    }

    ptzPresetPressContext.longPressFired = true;
    savePtzPreset(ptzPresetPressContext.nodeId, ptzPresetPressContext.preset);
  }, PTZ_PRESET_LONG_PRESS_MS);
}

function stopPtzPresetPress(triggerShortPress = true) {
  window.clearTimeout(ptzPresetPressTimer);
  ptzPresetPressTimer = null;

  const context = ptzPresetPressContext;
  ptzPresetPressContext = null;

  if (triggerShortPress && context && !context.longPressFired) {
    recallPtzPreset(context.nodeId, context.preset);
  }
}

// "Step Progression" buttons (e.g. one AE-mode button cycling Full Auto →
// Scene → Manual) advance to the next of cell.actions.steps on every press —
// tracked here per button (keyed by the cell object itself, since the same
// row/col repeats across every page) rather than on the node, since it's
// purely a display/interaction detail that doesn't need to survive a reload.
const streamDeckButtonStepIndex = new WeakMap();

function getCurrentStreamDeckStep(cell) {
  const steps = cell.actions.steps;
  const index = streamDeckButtonStepIndex.get(cell) ?? 0;
  return steps[index % steps.length];
}

function advanceStreamDeckStep(cell) {
  if (cell.actions.steps.length <= 1) {
    return;
  }

  const index = streamDeckButtonStepIndex.get(cell) ?? 0;
  streamDeckButtonStepIndex.set(cell, (index + 1) % cell.actions.steps.length);
}

// Mirrors the PTZ-preset press pattern above: "down" actions fire immediately,
// each hold-duration group fires (in place of "release") once held that long
// — matching Companion's own short-press-vs-hold buttons (e.g. this file's
// "Recall Presets" on tap vs. "Save Presets" after a 1s hold).
function startStreamDeckPress(button) {
  stopStreamDeckPress(false);

  const nodeId = button.dataset.nodeId;
  const node = getNode(nodeId);
  const cell = getStreamDeckCell(node, button.dataset.row, button.dataset.col);

  if (!node || !cell || cell.kind !== "button") {
    return;
  }

  const step = getCurrentStreamDeckStep(cell);
  runStreamDeckActions(node, step.press);

  const context = { nodeId, cell, step, firedHoldGroup: null };
  streamDeckPressContext = context;

  streamDeckPressTimers = (step.holdGroups ?? []).map((group) => window.setTimeout(() => {
    if (streamDeckPressContext !== context || context.firedHoldGroup) {
      return;
    }

    context.firedHoldGroup = group;
    runStreamDeckActions(getNode(nodeId), group.actions);
  }, group.afterMs));

  advanceStreamDeckStep(cell);
}

function stopStreamDeckPress(triggerRelease = true) {
  // Always stop any continuous PTZ motion a direction button may have
  // started, regardless of whether the button's own release actions include
  // an explicit stop — a held-and-released button must never keep panning.
  stopStreamDeckPtzMotion();

  streamDeckPressTimers.forEach((timer) => window.clearTimeout(timer));
  streamDeckPressTimers = [];

  const context = streamDeckPressContext;
  streamDeckPressContext = null;

  if (triggerRelease && context && !context.firedHoldGroup) {
    const node = getNode(context.nodeId);

    if (node) {
      runStreamDeckActions(node, context.step.release);
    }
  }
}

// --- Stream Deck / Companion integration -----------------------------------
// Imports a Bitfocus Companion ".companionconfig" export and simulates the
// subset of it that maps onto devices this app already models: ATEM
// program/preview/tally and PTZ camera presets. Everything else in the
// export (SuperSource, macros, other integrations) still renders with its
// original label/icon/color but does nothing when pressed — see specs.md.

let pendingStreamDeckImportNodeId = null;

function triggerStreamDeckImport(nodeId) {
  if (state.readOnly) {
    return;
  }

  pendingStreamDeckImportNodeId = nodeId;
  streamDeckImportFile.click();
}

async function handleStreamDeckImportFile(file) {
  const nodeId = pendingStreamDeckImportNodeId;
  pendingStreamDeckImportNodeId = null;
  const node = getNode(nodeId);

  if (!node || node.type !== "streamDeckXL") {
    return;
  }

  let rawConfig;

  try {
    rawConfig = await window.CompanionImport.decompressAndParse(file);
  } catch (error) {
    window.alert(`Companion-Konfiguration konnte nicht gelesen werden: ${error.message}`);
    return;
  }

  const surfaces = window.CompanionImport.listStreamDeckSurfaces(rawConfig).filter(
    (surface) => surface.columns === node.gridColumns && surface.rows === node.gridRows
  );

  if (!surfaces.length) {
    window.alert(`Keine passende Stream-Deck-Surface (${node.gridColumns}x${node.gridRows}) in dieser Konfiguration gefunden.`);
    return;
  }

  recordUndoSnapshot();
  node.companionRawConfig = rawConfig;

  if (surfaces.length === 1) {
    applyStreamDeckSurface(node, surfaces[0].key);
    return;
  }

  node.companionSurfaceChoices = surfaces;
  render();
}

function pickStreamDeckSurface(nodeId, surfaceKey) {
  const node = getNode(nodeId);

  if (!node || node.type !== "streamDeckXL" || !node.companionRawConfig) {
    return;
  }

  recordUndoSnapshot();
  applyStreamDeckSurface(node, surfaceKey);
}

function applyStreamDeckSurface(node, surfaceKey) {
  const normalized = window.CompanionImport.normalizeForSurface(node.companionRawConfig, surfaceKey);
  node.companionImport = normalized;
  node.currentPageId = normalized.startupPageId;
  node.instanceMap = {};
  node.companionSurfaceChoices = null;
  node.companionRawConfig = null;
  autoMapStreamDeckInstances(node);
  render();
}

// Fills in still-unmapped bmd-atem/canon-ptz instances with whatever
// switcher/camera nodes exist in the scene, pairing them in a stable order
// (instance label, node creation order) so re-running this after adding more
// gear only fills gaps rather than reshuffling anything. Never touches an
// instance that already has a mapping — manual choices always win.
function autoMapStreamDeckInstances(node) {
  if (!node || node.type !== "streamDeckXL" || !node.companionImport) {
    return false;
  }

  const relevantModules = { "bmd-atem": "switcher", "canon-ptz": "camera" };
  const usedNodeIds = new Set(Object.values(node.instanceMap ?? {}));

  const instanceEntries = Object.entries(node.companionImport.instances)
    .filter(([, instance]) => relevantModules[instance.moduleId])
    .sort(([, a], [, b]) => a.label.localeCompare(b.label, undefined, { numeric: true }));

  let changed = false;
  const nextInstanceMap = { ...(node.instanceMap ?? {}) };

  instanceEntries.forEach(([instanceId, instance]) => {
    if (nextInstanceMap[instanceId]) {
      return;
    }

    const candidateType = relevantModules[instance.moduleId];
    const candidate = state.nodes.find((candidateNode) => candidateNode.type === candidateType && !usedNodeIds.has(candidateNode.id));

    if (candidate) {
      nextInstanceMap[instanceId] = candidate.id;
      usedNodeIds.add(candidate.id);
      changed = true;
    }
  });

  if (changed) {
    node.instanceMap = nextInstanceMap;
  }

  return changed;
}

function navigateStreamDeckPage(nodeId, direction) {
  const node = getNode(nodeId);

  if (!node || node.type !== "streamDeckXL" || !node.companionImport) {
    return;
  }

  const order = node.companionImport.pageOrder;
  const currentIndex = order.indexOf(node.currentPageId);

  if (currentIndex === -1 || !order.length) {
    return;
  }

  const nextIndex = direction === "up"
    ? (currentIndex - 1 + order.length) % order.length
    : (currentIndex + 1) % order.length;

  node.currentPageId = order[nextIndex];
  render();
}

function toggleStreamDeckMapping(nodeId, open) {
  const node = getNode(nodeId);

  if (!node || node.type !== "streamDeckXL") {
    return;
  }

  node.streamDeckMappingOpen = open;

  if (open) {
    // Catches gear added to the scene after import but before opening this
    // panel — anything still unmapped gets a default now, same rule as import.
    autoMapStreamDeckInstances(node);
  }

  render();
}

function setStreamDeckInstanceMapping(nodeId, instanceId, targetNodeId) {
  const node = getNode(nodeId);

  if (!node || node.type !== "streamDeckXL") {
    return;
  }

  recordUndoSnapshot();
  node.instanceMap = { ...(node.instanceMap ?? {}) };

  if (targetNodeId) {
    node.instanceMap[instanceId] = targetNodeId;
  } else {
    delete node.instanceMap[instanceId];
  }

  render();
}

// Companion buttons often reference "$(<instance label>:cameraName)" in their
// text — a variable Companion itself resolves from a name the user typed into
// its own UI. We don't import that name (it isn't in the button/page data,
// only inside Companion's own per-instance config), so instead we let the
// user set it once per PTZ instance here and substitute it wherever that
// variable appears on any button text.
function setStreamDeckInstanceName(nodeId, instanceId, name) {
  const node = getNode(nodeId);

  if (!node || node.type !== "streamDeckXL") {
    return;
  }

  recordUndoSnapshot();
  node.instanceNames = { ...(node.instanceNames ?? {}) };

  if (name) {
    node.instanceNames[instanceId] = name;
  } else {
    delete node.instanceNames[instanceId];
  }

  render();
}

function getStreamDeckCell(node, row, col) {
  const page = node?.companionImport?.pages?.[node.currentPageId];
  const entry = page?.buttons.find((button) => button.row === Number(row) && button.col === Number(col));
  return entry?.cell ?? null;
}

// Companion custom variables are referenced as "$(internal:custom_<name>)",
// optionally with a trailing "+N"/"-N" (the exact pattern this Companion
// setup uses to compute a target page from a per-camera base page number).
// Anything else is treated as a plain literal (numeric or string).
function evaluateStreamDeckExpression(node, expr) {
  if (expr === undefined || expr === null) {
    return null;
  }

  const str = String(expr).trim();
  const match = str.match(/^\$\(internal:custom_([a-zA-Z0-9_]+)\)\s*([+-]\s*\d+)?$/);

  if (match) {
    const base = Number(node.customVariables?.[match[1]] ?? 0);
    const offset = match[2] ? Number(match[2].replace(/\s+/g, "")) : 0;
    return base + offset;
  }

  const numeric = Number(str);
  return Number.isFinite(numeric) && str !== "" ? numeric : str;
}

// Runs one press/release/hold action list in order — the sequence matters:
// this Companion setup's page-jump buttons first set a base page into one
// custom variable, then derive a target page (base +N) into a second, then
// jump via set_page reading that second variable back out.
function runStreamDeckActions(node, actions) {
  (actions ?? []).forEach((action) => runStreamDeckAction(node, action));
}

function runStreamDeckAction(node, action) {
  if (action.module === "internal" && action.definitionId === "custom_variable_set_value") {
    const value = evaluateStreamDeckExpression(node, action.value);
    node.customVariables = { ...(node.customVariables ?? {}), [action.variableName]: value };
    return;
  }

  if (action.module === "internal" && action.definitionId === "set_page") {
    const targetPageId = String(evaluateStreamDeckExpression(node, action.page) ?? "");

    if (node.companionImport.pages[targetPageId]) {
      node.currentPageId = targetPageId;
      render();
    }

    return;
  }

  const targetNodeId = node.instanceMap?.[action.instanceId];

  if (!targetNodeId) {
    return;
  }

  if (action.module === "bmd-atem") {
    const input = Number(action.input);

    if (action.definitionId === "program" && Number.isFinite(input)) {
      atemController.setProgramInput(targetNodeId, input);
    } else if (action.definitionId === "preview" && Number.isFinite(input)) {
      atemController.setPreviewInput(targetNodeId, input);
    } else if (action.definitionId === "cut") {
      atemController.cut(targetNodeId);
    } else if (action.definitionId === "auto") {
      atemController.auto(targetNodeId);
    }

    return;
  }

  if (action.module === "canon-ptz") {
    const camera = getNode(targetNodeId);

    const direction = STREAM_DECK_PTZ_DIRECTIONS[action.definitionId];

    if (direction) {
      startStreamDeckPtzMotion(camera, direction);
      return;
    }

    if (action.definitionId === "zoomI") {
      startStreamDeckPtzMotion(camera, { zoomDirection: 1 });
      return;
    }

    if (action.definitionId === "zoomO") {
      startStreamDeckPtzMotion(camera, { zoomDirection: -1 });
      return;
    }

    if (["stop", "stopPan", "stopTilt", "zoomS"].includes(action.definitionId)) {
      stopStreamDeckPtzMotion();
      return;
    }

    if (action.definitionId === "home" && camera) {
      recordUndoSnapshot();
      animatePtzTo(camera, { pan: 0, tilt: 0, zoom: normalizePtzState(camera.ptz).zoom });
      return;
    }

    // canon-ptz sends EV in quarter-stops via the same "val" option preset
    // recall/save use (e.g. 6 = +1.5EV, -2 = -0.5EV) — divide by 4 to get EV.
    if (action.definitionId === "aeBrightness" && camera) {
      const quarterStops = Number(action.preset);

      if (Number.isFinite(quarterStops)) {
        recordUndoSnapshot();
        camera.exposureEV = clamp(quarterStops / 4, -1.5, 1.5);
        render();
      }

      return;
    }

    if (action.definitionId === "exposureShootingMode" && camera && action.preset) {
      recordUndoSnapshot();
      camera.exposureMode = String(action.preset);
      render();
      return;
    }

    if (action.definitionId === "aePhotometry" && camera && action.preset) {
      recordUndoSnapshot();
      camera.meteringMode = String(action.preset);
      render();
      return;
    }

    if ((action.definitionId === "gainU" || action.definitionId === "gainD") && camera) {
      recordUndoSnapshot();
      const step = action.definitionId === "gainU" ? 1 : -1;
      camera.gainDb = clamp(Number(camera.gainDb ?? 0) + step, 0, 36);
      render();
      return;
    }

    if (action.definitionId === "gainToggle" && camera) {
      recordUndoSnapshot();
      camera.gainMode = camera.gainMode === "manual" ? "auto" : "manual";
      render();
      return;
    }

    if (action.definitionId === "irisM" && camera) {
      recordUndoSnapshot();
      camera.irisMode = camera.irisMode === "manual" ? "auto" : "manual";
      render();
      return;
    }

    if (action.definitionId === "shutterToggle" && camera) {
      recordUndoSnapshot();
      camera.shutterMode = camera.shutterMode === "manual" ? "auto" : "manual";
      render();
      return;
    }

    if (action.definitionId === "focusToggle" && camera) {
      recordUndoSnapshot();
      camera.focusMode = camera.focusMode === "manual" ? "auto" : "manual";
      render();
      return;
    }

    if ((action.definitionId === "kelvinUp" || action.definitionId === "kelvinDown") && camera) {
      recordUndoSnapshot();
      const current = clamp(Number(camera.kelvinStepIndex ?? STREAM_DECK_KELVIN_DEFAULT_INDEX), 0, STREAM_DECK_KELVIN_LIST.length - 1);
      const step = action.definitionId === "kelvinUp" ? 1 : -1;
      camera.kelvinStepIndex = clamp(current + step, 0, STREAM_DECK_KELVIN_LIST.length - 1);
      render();
      return;
    }

    if (action.definitionId === "aeFlickerReduct" && camera && action.preset) {
      recordUndoSnapshot();
      camera.flickerReduction = String(action.preset);
      render();
      return;
    }

    if (action.definitionId === "whitebalanceModeToggle" && camera) {
      recordUndoSnapshot();
      const currentIndex = STREAM_DECK_WB_MODES.indexOf(camera.whitebalanceMode ?? "auto");
      camera.whitebalanceMode = STREAM_DECK_WB_MODES[(currentIndex + 1) % STREAM_DECK_WB_MODES.length];
      render();
      return;
    }

    if ((action.definitionId === "ptSpeedU" || action.definitionId === "ptSpeedD") && camera) {
      recordUndoSnapshot();
      const step = action.definitionId === "ptSpeedU" ? 1 : -1;
      camera.panTiltSpeedLevel = clamp(Number(camera.panTiltSpeedLevel ?? STREAM_DECK_PT_SPEED_DEFAULT) + step, STREAM_DECK_PT_SPEED_MIN, STREAM_DECK_PT_SPEED_MAX);
      render();
      return;
    }

    // Always flips state rather than trusting the button's own "bol" value —
    // every per-camera Digital Zoom button in this Companion setup sends
    // bol:0 on *both* of its step-progression steps (a copy-paste mistake
    // when the template was duplicated across all 6 cameras), so reading
    // "bol" literally would leave the button permanently stuck on OFF.
    if (action.definitionId === "digitalZoom" && camera) {
      recordUndoSnapshot();
      camera.digitalZoomEnabled = !camera.digitalZoomEnabled;
      render();
      return;
    }

    if (action.definitionId === "zSpeedS" && camera && action.speed !== undefined) {
      recordUndoSnapshot();
      camera.zoomSpeedValue = clamp(Number(action.speed), 0, 127);
      render();
      return;
    }

    if ((action.definitionId === "irisU" || action.definitionId === "irisD") && camera) {
      recordUndoSnapshot();
      const current = clamp(Number(camera.irisStepIndex ?? STREAM_DECK_IRIS_DEFAULT_INDEX), 0, STREAM_DECK_IRIS_LABELS.length - 1);
      const step = action.definitionId === "irisU" ? -1 : 1;
      camera.irisStepIndex = clamp(current + step, 0, STREAM_DECK_IRIS_LABELS.length - 1);
      render();
      return;
    }

    if ((action.definitionId === "shutterUp" || action.definitionId === "shutterDown") && camera) {
      recordUndoSnapshot();
      const current = clamp(Number(camera.shutterStepIndex ?? STREAM_DECK_SHUTTER_DEFAULT_INDEX), 0, STREAM_DECK_SHUTTER_LABELS.length - 1);
      const step = action.definitionId === "shutterUp" ? -1 : 1;
      camera.shutterStepIndex = clamp(current + step, 0, STREAM_DECK_SHUTTER_LABELS.length - 1);
      render();
      return;
    }

    const preset = Number(action.preset);

    if (!Number.isFinite(preset)) {
      return;
    }

    if (action.definitionId === "recallPset") {
      recallCameraPreset(camera, preset);
    } else if (action.definitionId === "savePset") {
      saveCameraPreset(camera, preset);
    }
  }
}

// Live feedback → button style, recomputed on every render from the mapped
// node's current state (tally/bus), mirroring how program_bg/preview_bg and
// tallyPreview/tallyProgram behave on the real Companion setup.
function getStreamDeckButtonStyle(node, cell) {
  let bgcolor = cell.bgcolor;
  const color = cell.color;

  cell.feedbacks.forEach((feedback) => {
    const targetNodeId = node.instanceMap?.[feedback.instanceId];

    if (!targetNodeId) {
      return;
    }

    let active = false;

    if (feedback.module === "bmd-atem") {
      const switcher = getNode(targetNodeId);
      const input = Number(feedback.input);

      if (feedback.definitionId === "program_bg") {
        active = switcher?.programInput === input;
      } else if (feedback.definitionId === "preview_bg") {
        active = switcher?.previewInput === input;
      }
    } else if (feedback.module === "canon-ptz") {
      const camera = getNode(targetNodeId);

      state.nodes.filter((candidate) => candidate.type === "switcher").forEach((switcher) => {
        if (feedback.definitionId === "tallyProgram" && getSwitcherProgramSource(switcher)?.id === camera?.id) {
          active = true;
        }

        if (feedback.definitionId === "tallyPreview" && getSwitcherPreviewSource(switcher)?.id === camera?.id) {
          active = true;
        }
      });
    }

    if (feedback.isInverted) {
      active = !active;
    }

    if (active) {
      bgcolor = feedback.definitionId.includes("preview") || feedback.definitionId === "tallyPreview"
        ? "#0ea5e9"
        : "#ef4444";
    }
  });

  return { bgcolor, color };
}

function renderConnectedMonitorPictures() {
  deviceLayer.querySelectorAll("article.node.monitor").forEach((element) => {
    const monitor = getNode(element.dataset.nodeId);
    const screen = element.querySelector(".monitor-screen");
    const footer = element.querySelector(".monitor-footer span:last-child");

    if (!monitor || !screen) {
      return;
    }

    screen.innerHTML = renderMonitorPicture(monitor);
    if (footer) {
      footer.textContent = getMonitorLabel(monitor);
    }
  });
  renderPtzProjectionCanvases();
}

function renderPtzProjectionCanvases() {
  document.querySelectorAll(".ptz-panorama-canvas").forEach((canvas) => {
    renderPtzProjectionCanvas(canvas);
  });
  renderPtzCameraModels();
}

// Repaints the CSS 3D camera rig's live transform from node.ptz directly
// (skipping the full render() DOM rebuild), the same way the line above keeps
// the panorama canvas in sync — called every frame during joystick drag and
// preset-recall easing so the model visibly turns instead of only updating
// once motion settles.
function renderPtzCameraModels() {
  document.querySelectorAll("[data-ptz-pan-rig]").forEach((panRig) => {
    const node = getNode(panRig.dataset.ptzPanRig);

    if (node) {
      panRig.style.transform = `rotateY(${Number(node.ptz?.pan ?? 0)}deg)`;
    }
  });

  document.querySelectorAll("[data-ptz-head]").forEach((head) => {
    const node = getNode(head.dataset.ptzHead);

    if (node) {
      head.style.transform = `rotateX(${-Number(node.ptz?.tilt ?? 0)}deg)`;
    }
  });

  // The Three.js module loads as an ES module, which can finish initializing
  // after this file's own first render() — until then window.PtzCameraModel3D
  // just isn't there yet, so any real 3D-model cameras stay on nothing this
  // pass and pick up on the module's own catch-up call once it's ready.
  if (window.PtzCameraModel3D) {
    const liveNodeIds = new Set();

    document.querySelectorAll("[data-ptz-model-canvas]").forEach((canvas) => {
      const nodeId = canvas.dataset.ptzModelCanvas;
      const node = getNode(nodeId);

      if (!node) {
        return;
      }

      liveNodeIds.add(nodeId);
      window.PtzCameraModel3D.sync(
        nodeId,
        canvas,
        canvas.dataset.modelUrl,
        Number(node.ptz?.pan ?? 0),
        Number(node.ptz?.tilt ?? 0)
      );
    });

    window.PtzCameraModel3D.pruneExcept(liveNodeIds);
  }
}

function renderPtzProjectionCanvas(canvas) {
  const source = getNode(canvas.dataset.sourceId);
  const url = source?.media?.url;

  if (!source || !url) {
    return;
  }

  // HDR panoramas carry real scene-referred luminance, so exposure/tonemap
  // happen per-pixel in drawEquirectangularProjectionHDR instead of the
  // CSS brightness() filter used for regular (already-tonemapped) images —
  // see renderPtzPanoramaPicture, which skips that filter when isHDR is set.
  if (source.media?.isHDR) {
    const hdr = getHDRPanoramaData(url);

    if (!hdr.loaded) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const resolutionScale = Math.min(1, 420 / Math.max(rect.width, 1));
    const width = Math.max(2, Math.round(rect.width * resolutionScale));
    const height = Math.max(2, Math.round(rect.height * resolutionScale));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    drawEquirectangularProjectionHDR(canvas, hdr, {
      pan: Number(source.ptz?.pan ?? canvas.dataset.pan ?? 0),
      tilt: Number(source.ptz?.tilt ?? canvas.dataset.tilt ?? 0),
      zoom: Number(source.ptz?.zoom ?? canvas.dataset.zoom ?? 1.7),
      maxZoom: getStreamDeckMaxZoom(source)
    }, getStreamDeckEffectiveExposureEV(source));
    return;
  }

  const image = getPtzProjectionImage(url);

  if (!image.complete || !image.naturalWidth || !image.naturalHeight) {
    image.addEventListener("load", () => renderPtzProjectionCanvas(canvas), { once: true });
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const resolutionScale = Math.min(1, 420 / Math.max(rect.width, 1));
  const width = Math.max(2, Math.round(rect.width * resolutionScale));
  const height = Math.max(2, Math.round(rect.height * resolutionScale));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  drawEquirectangularProjection(canvas, image, {
    pan: Number(source.ptz?.pan ?? canvas.dataset.pan ?? 0),
    tilt: Number(source.ptz?.tilt ?? canvas.dataset.tilt ?? 0),
    zoom: Number(source.ptz?.zoom ?? canvas.dataset.zoom ?? 1.7),
    maxZoom: getStreamDeckMaxZoom(source)
  });
}

function getPtzProjectionImage(url) {
  if (ptzProjectionImages.has(url)) {
    return ptzProjectionImages.get(url);
  }

  const image = new Image();
  image.src = url;
  ptzProjectionImages.set(url, image);
  return image;
}

const hdrPanoramaCache = new Map();

// Fetches + parses a .hdr file once per URL (cached), then triggers a repaint
// once decoded — mirrors how getPtzProjectionImage's Image "load" event
// causes a re-render, just via an explicit callback since fetch/parse has no
// native "loaded" flag to poll like HTMLImageElement.complete does.
function getHDRPanoramaData(url) {
  if (hdrPanoramaCache.has(url)) {
    return hdrPanoramaCache.get(url);
  }

  const entry = { width: 0, height: 0, data: null, loaded: false, error: null };
  hdrPanoramaCache.set(url, entry);

  fetch(url)
    .then((response) => response.arrayBuffer())
    .then((buffer) => {
      const parsed = parseRadianceHDR(buffer);
      entry.width = parsed.width;
      entry.height = parsed.height;
      entry.data = parsed.data;
      entry.loaded = true;
      renderPtzProjectionCanvases();
    })
    .catch((error) => {
      entry.error = error;
      console.error("HDR-Panorama konnte nicht gelesen werden:", error);
    });

  return entry;
}

// Decodes a Radiance/RGBE .hdr file (the format used by most free HDRI
// libraries, incl. openfootage.net) into linear-light float RGB. Supports
// the common cases: new-style per-scanline RLE and flat/uncompressed data,
// with the standard "-Y height +X width" (top-to-bottom, left-to-right)
// orientation. Old-style (pre-1991) RLE and rotated orientations aren't
// handled — vanishingly rare in modern exports.
function parseRadianceHDR(buffer) {
  const bytes = new Uint8Array(buffer);
  let pos = 0;
  const decoder = new TextDecoder();

  function readLine() {
    const start = pos;

    while (pos < bytes.length && bytes[pos] !== 0x0a) {
      pos += 1;
    }

    const line = decoder.decode(bytes.subarray(start, pos));
    pos += 1;
    return line;
  }

  const magic = readLine();

  if (!magic.startsWith("#?")) {
    throw new Error("Keine gültige Radiance-HDR-Datei (fehlende #?-Kennung).");
  }

  let headerLine = readLine();

  while (headerLine.trim() !== "") {
    headerLine = readLine();
  }

  const resolutionLine = readLine();
  const resolutionMatch = resolutionLine.match(/-Y\s+(\d+)\s+\+X\s+(\d+)/);

  if (!resolutionMatch) {
    throw new Error(`Nicht unterstützte HDR-Auflösungszeile: "${resolutionLine}"`);
  }

  const height = Number(resolutionMatch[1]);
  const width = Number(resolutionMatch[2]);
  const data = new Float32Array(width * height * 3);
  const scanline = new Uint8Array(width * 4);

  for (let y = 0; y < height; y += 1) {
    const isNewRle = width >= 8 && width < 0x8000
      && bytes[pos] === 2 && bytes[pos + 1] === 2
      && ((bytes[pos + 2] << 8) | bytes[pos + 3]) === width;

    if (isNewRle) {
      pos += 4;

      for (let channel = 0; channel < 4; channel += 1) {
        let x = 0;

        while (x < width) {
          const count = bytes[pos];
          pos += 1;

          if (count > 128) {
            const value = bytes[pos];
            pos += 1;
            const runLength = count - 128;

            for (let i = 0; i < runLength; i += 1) {
              scanline[(x + i) * 4 + channel] = value;
            }

            x += runLength;
          } else {
            for (let i = 0; i < count; i += 1) {
              scanline[(x + i) * 4 + channel] = bytes[pos];
              pos += 1;
            }

            x += count;
          }
        }
      }
    } else {
      for (let x = 0; x < width; x += 1) {
        scanline[x * 4] = bytes[pos];
        scanline[x * 4 + 1] = bytes[pos + 1];
        scanline[x * 4 + 2] = bytes[pos + 2];
        scanline[x * 4 + 3] = bytes[pos + 3];
        pos += 4;
      }
    }

    for (let x = 0; x < width; x += 1) {
      const r = scanline[x * 4];
      const g = scanline[x * 4 + 1];
      const b = scanline[x * 4 + 2];
      const e = scanline[x * 4 + 3];
      const outIndex = (y * width + x) * 3;

      if (e === 0) {
        data[outIndex] = 0;
        data[outIndex + 1] = 0;
        data[outIndex + 2] = 0;
      } else {
        // Standard RGBE decode: shared 8-bit exponent, biased by 128 (sign)
        // and 8 (mantissa bits already folded into r/g/b being 0-255).
        const scale = 2 ** (e - 136);
        data[outIndex] = r * scale;
        data[outIndex + 1] = g * scale;
        data[outIndex + 2] = b * scale;
      }
    }
  }

  return { width, height, data };
}

function bilinearSampleFloatEquirect(data, width, height, x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = (x0 + 1) % width;
  const y1 = Math.min(y0 + 1, height - 1);
  const tx = x - x0;
  const ty = y - y0;
  const ia = (y0 * width + x0) * 3;
  const ib = (y0 * width + x1) * 3;
  const ic = (y1 * width + x0) * 3;
  const id = (y1 * width + x1) * 3;

  return [
    lerp(lerp(data[ia], data[ib], tx), lerp(data[ic], data[id], tx), ty),
    lerp(lerp(data[ia + 1], data[ib + 1], tx), lerp(data[ic + 1], data[id + 1], tx), ty),
    lerp(lerp(data[ia + 2], data[ib + 2], tx), lerp(data[ic + 2], data[id + 2], tx), ty)
  ];
}

// Narkowicz's ACES filmic fit — compresses unbounded linear HDR light into a
// displayable 0-1 range with a filmic highlight rolloff (so a blown-out sky
// eases toward white instead of hard-clipping), rather than the flat clip a
// naive multiply-and-cap would produce.
function acesFilmicTonemap(x) {
  const a = 2.51;
  const b = 0.03;
  const c = 2.43;
  const d = 0.59;
  const e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0, 1);
}

function drawEquirectangularProjectionHDR(canvas, hdr, ptz, exposureEV) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) {
    return;
  }

  const width = canvas.width;
  const height = canvas.height;
  const output = ctx.createImageData(width, height);
  const sourceData = hdr.data;
  const sourceWidth = hdr.width;
  const sourceHeight = hdr.height;
  const yaw = degToRad(Number(ptz.pan ?? 0));
  const pitch = degToRad(clamp(Number(ptz.tilt ?? 0), -84, 84));
  const zoom = clamp(Number(ptz.zoom ?? 1.7), 1.1, ptz.maxZoom ?? 3.2);
  const horizontalFov = degToRad(82 / zoom);
  const verticalFov = 2 * Math.atan(Math.tan(horizontalFov / 2) * (height / width));
  const tanHalfH = Math.tan(horizontalFov / 2);
  const tanHalfV = Math.tan(verticalFov / 2);
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  const exposureMultiplier = 2 ** clamp(Number(exposureEV ?? 0), -STREAM_DECK_EXPOSURE_EV_LIMIT, STREAM_DECK_EXPOSURE_EV_LIMIT);
  const targetData = output.data;

  for (let py = 0; py < height; py += 1) {
    const cameraY = (1 - 2 * ((py + 0.5) / height)) * tanHalfV;

    for (let px = 0; px < width; px += 1) {
      const cameraX = (2 * ((px + 0.5) / width) - 1) * tanHalfH;
      const cameraZ = 1;

      const pitchedY = cameraY * cosPitch + cameraZ * sinPitch;
      const pitchedZ = -cameraY * sinPitch + cameraZ * cosPitch;
      const worldX = cameraX * cosYaw + pitchedZ * sinYaw;
      const worldY = pitchedY;
      const worldZ = -cameraX * sinYaw + pitchedZ * cosYaw;
      const length = Math.hypot(worldX, worldY, worldZ) || 1;
      const longitude = Math.atan2(worldX, worldZ);
      const latitude = Math.asin(clamp(worldY / length, -1, 1));
      const sourceX = modulo((longitude / (Math.PI * 2) + 0.5) * sourceWidth, sourceWidth);
      const sourceY = clamp((0.5 - latitude / Math.PI) * sourceHeight, 0, sourceHeight - 1);

      const [r, g, b] = bilinearSampleFloatEquirect(sourceData, sourceWidth, sourceHeight, sourceX, sourceY);
      const targetIndex = (py * width + px) * 4;

      targetData[targetIndex] = acesFilmicTonemap(r * exposureMultiplier) ** (1 / 2.2) * 255;
      targetData[targetIndex + 1] = acesFilmicTonemap(g * exposureMultiplier) ** (1 / 2.2) * 255;
      targetData[targetIndex + 2] = acesFilmicTonemap(b * exposureMultiplier) ** (1 / 2.2) * 255;
      targetData[targetIndex + 3] = 255;
    }
  }

  ctx.putImageData(output, 0, 0);
}

function drawEquirectangularProjection(canvas, image, ptz) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) {
    return;
  }

  const width = canvas.width;
  const height = canvas.height;
  const output = ctx.createImageData(width, height);
  const sourceCanvas = getPtzProjectionSourceCanvas(image);
  const source = getPtzProjectionSourceData(image, sourceCanvas);
  const sourceData = source.data;
  const sourceWidth = sourceCanvas.width;
  const sourceHeight = sourceCanvas.height;
  const yaw = degToRad(Number(ptz.pan ?? 0));
  const pitch = degToRad(clamp(Number(ptz.tilt ?? 0), -84, 84));
  const zoom = clamp(Number(ptz.zoom ?? 1.7), 1.1, ptz.maxZoom ?? 3.2);
  const horizontalFov = degToRad(82 / zoom);
  const verticalFov = 2 * Math.atan(Math.tan(horizontalFov / 2) * (height / width));
  const tanHalfH = Math.tan(horizontalFov / 2);
  const tanHalfV = Math.tan(verticalFov / 2);
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  const targetData = output.data;

  for (let py = 0; py < height; py += 1) {
    const cameraY = (1 - 2 * ((py + 0.5) / height)) * tanHalfV;

    for (let px = 0; px < width; px += 1) {
      const cameraX = (2 * ((px + 0.5) / width) - 1) * tanHalfH;
      const cameraZ = 1;

      const pitchedY = cameraY * cosPitch + cameraZ * sinPitch;
      const pitchedZ = -cameraY * sinPitch + cameraZ * cosPitch;
      const worldX = cameraX * cosYaw + pitchedZ * sinYaw;
      const worldY = pitchedY;
      const worldZ = -cameraX * sinYaw + pitchedZ * cosYaw;
      const length = Math.hypot(worldX, worldY, worldZ) || 1;
      const longitude = Math.atan2(worldX, worldZ);
      const latitude = Math.asin(clamp(worldY / length, -1, 1));
      const sourceX = modulo((longitude / (Math.PI * 2) + 0.5) * sourceWidth, sourceWidth);
      const sourceY = clamp((0.5 - latitude / Math.PI) * sourceHeight, 0, sourceHeight - 1);
      const sample = sampleEquirectangularPixel(sourceData, sourceWidth, sourceHeight, sourceX, sourceY);
      const targetIndex = (py * width + px) * 4;

      targetData[targetIndex] = sample[0];
      targetData[targetIndex + 1] = sample[1];
      targetData[targetIndex + 2] = sample[2];
      targetData[targetIndex + 3] = 255;
    }
  }

  ctx.putImageData(output, 0, 0);
}

function getPtzProjectionSourceCanvas(image) {
  if (image.__ptzProjectionCanvas) {
    return image.__ptzProjectionCanvas;
  }

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  canvas.getContext("2d").drawImage(image, 0, 0);
  image.__ptzProjectionCanvas = canvas;
  return canvas;
}

function getPtzProjectionSourceData(image, canvas) {
  if (image.__ptzProjectionData) {
    return image.__ptzProjectionData;
  }

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  image.__ptzProjectionData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return image.__ptzProjectionData;
}

function sampleEquirectangularPixel(data, width, height, x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = (x0 + 1) % width;
  const y1 = Math.min(y0 + 1, height - 1);
  const tx = x - x0;
  const ty = y - y0;
  const a = getImageDataPixel(data, width, x0, y0);
  const b = getImageDataPixel(data, width, x1, y0);
  const c = getImageDataPixel(data, width, x0, y1);
  const d = getImageDataPixel(data, width, x1, y1);

  return [
    lerp(lerp(a[0], b[0], tx), lerp(c[0], d[0], tx), ty),
    lerp(lerp(a[1], b[1], tx), lerp(c[1], d[1], tx), ty),
    lerp(lerp(a[2], b[2], tx), lerp(c[2], d[2], tx), ty)
  ];
}

function getImageDataPixel(data, width, x, y) {
  const index = (y * width + x) * 4;
  return [data[index], data[index + 1], data[index + 2]];
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

function modulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function degToRad(value) {
  return value * Math.PI / 180;
}

async function setDroppedFileMedia(nodeId, file) {
  const node = getNode(nodeId);

  if (!node || !file) {
    return;
  }

  revokeNodeMediaUrl(node);

  // Browsers never set an image/* MIME type for .hdr (they can't decode it
  // natively), so this has to be checked by extension before the MIME-based
  // branch below — it would otherwise fall through to the generic "file" case.
  if (/\.hdr$/i.test(file.name)) {
    const url = await fileToDataUrl(file);
    node.media = {
      kind: "image",
      name: file.name,
      url,
      embedded: true,
      isHDR: true,
      isEquirectangular: true
    };
  } else if (file.type.startsWith("image/")) {
    const url = await fileToDataUrl(file);
    const imageInfo = await getImageInfo(url);
    node.media = {
      kind: "image",
      name: file.name,
      url,
      embedded: true,
      width: imageInfo.width,
      height: imageInfo.height,
      isEquirectangular: isEquirectangularImage(file.name, imageInfo.width, imageInfo.height)
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

function getImageInfo(url) {
  return new Promise((resolve) => {
    const image = new Image();

    image.addEventListener("load", () => resolve({
      width: image.naturalWidth,
      height: image.naturalHeight
    }), { once: true });
    image.addEventListener("error", () => resolve({ width: 0, height: 0 }), { once: true });
    image.src = url;
  });
}

function isEquirectangularImage(name, width, height) {
  if (/panorama|equirect|360/i.test(name ?? "")) {
    return true;
  }

  if (!width || !height) {
    return false;
  }

  const ratio = width / height;
  return ratio >= 1.85 && ratio <= 2.15;
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

function getSelectedNodeIds() {
  const selectedIds = state.selectedNodeIds?.length
    ? state.selectedNodeIds
    : state.selectedNodeId ? [state.selectedNodeId] : [];
  const existingIds = new Set(state.nodes.map((node) => node.id));

  return selectedIds.filter((nodeId) => existingIds.has(nodeId));
}

function isNodeSelected(nodeId) {
  return getSelectedNodeIds().includes(nodeId);
}

function setSelectedNodes(nodeIds, primaryNodeId = nodeIds[0] ?? null) {
  const existingIds = new Set(state.nodes.map((node) => node.id));
  const uniqueIds = [...new Set(nodeIds)].filter((nodeId) => existingIds.has(nodeId));

  state.selectedNodeIds = uniqueIds;
  state.selectedNodeId = primaryNodeId && uniqueIds.includes(primaryNodeId)
    ? primaryNodeId
    : uniqueIds[0] ?? null;
  state.selectedConnectionIndex = null;
  state.selectedSocket = null;
}

function addNodeToSelection(nodeId) {
  setSelectedNodes([...getSelectedNodeIds(), nodeId], nodeId);
}

function removeNodeFromSelection(nodeId) {
  const nextSelection = getSelectedNodeIds().filter((selectedNodeId) => selectedNodeId !== nodeId);

  setSelectedNodes(nextSelection, nextSelection[0] ?? null);
}

function clearSelection() {
  state.selectedNodeId = null;
  state.selectedNodeIds = [];
  state.selectedConnectionIndex = null;
  state.selectedSocket = null;
}

function selectAllNodes() {
  if (state.readOnly) {
    return;
  }

  setSelectedNodes(state.nodes.map((node) => node.id), state.nodes[0]?.id ?? null);
  render();
}

function selectNode(nodeId) {
  if (state.readOnly) {
    return;
  }

  setSelectedNodes([nodeId], nodeId);
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

  recordUndoSnapshot();
  const node = createNodeFromClipboardSnapshot(copiedNodeSnapshot);
  state.nodes.push(node);
  state.nextId += 1;
  setSelectedNodes([node.id], node.id);

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
    mediaPools: node.mediaPools ? cloneSwitcherMediaPools(node.mediaPools) : node.mediaPools,
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
    mediaPools: snapshot.mediaPools ? cloneSwitcherMediaPools(snapshot.mediaPools) : snapshot.mediaPools,
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
    ensureSwitcherMediaPools(node);
    ensureSwitcherAudioState(node);
  }

  if (isDisplaySourceNode(node)) {
    const sourceLook = getUnusedSourceLook(state.nextId, node.id);
    node.sourceColor = sourceLook.color;
    node.pattern = sourceLook.pattern;
  }

  return node;
}

function isTypingTarget(target) {
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function isDialogOpen() {
  return Boolean(document.querySelector("dialog[open]"));
}

function isValidConnection(from, to) {
  if (from.nodeId === to.nodeId || from.signal !== to.signal) {
    return false;
  }

  if (from.signal === "LAN") {
    // LAN jacks are bidirectional, so any two LAN ports may be cabled
    // together (e.g. switch-to-switch uplinks), unlike video signals.
    return true;
  }

  return from.direction === "output" && to.direction === "input";
}

function isPortConnected(nodeId, portId) {
  return state.connections.some((connection) => (
    (connection.from.nodeId === nodeId && connection.from.portId === portId)
    || (connection.to.nodeId === nodeId && connection.to.portId === portId)
  ));
}

function removeNode(nodeId) {
  removeNodes([nodeId]);
}

function removeNodes(nodeIds) {
  const removeIds = new Set(nodeIds);

  if (!removeIds.size) {
    return;
  }

  recordUndoSnapshot();
  state.nodes
    .filter((node) => removeIds.has(node.id))
    .forEach(revokeNodeMediaUrl);

  state.nodes = state.nodes.filter((node) => !removeIds.has(node.id));
  state.connections = state.connections.filter((connection) => (
    !removeIds.has(connection.from.nodeId) && !removeIds.has(connection.to.nodeId)
  ));

  if (removeIds.has(state.activeSwitcherId)) {
    state.activeSwitcherId = getActiveSwitcher()?.id ?? null;
  }

  state.selectedConnectionIndex = null;
  state.selectedNodeIds = getSelectedNodeIds().filter((nodeId) => !removeIds.has(nodeId));
  state.selectedNodeId = state.selectedNodeIds[0] ?? null;
  render();
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
    editable: node.type === "custom",
    inputs: node.inputs.map((port) => ({ ...port })),
    outputs: node.outputs.map((port) => ({ ...port }))
  };
  editGearHeading.textContent = node.title;
  editGearName.value = node.title;
  renderEditPortList();
  updatePortDirectionVisibility(editPortDirectionField, editPortDirectionSelect, editPortSignalSelect);
  editGearDialog.showModal();
}

// Predefined devices ship with a fixed set of sockets; only user-created
// Custom Gear may have its ports added, removed, relabeled, or reordered.
function renderPortRows(rows, editable) {
  if (!editable) {
    return rows.map((port) => `
      <div class="port-row">
        <span>${port.direction === "input" ? "Input" : "Output"}</span>
        <strong>${port.label}</strong>
        <em>${port.signal}</em>
      </div>
    `).join("");
  }

  return rows.map((port) => `
    <div class="port-row is-editable" draggable="true" data-port-direction="${port.direction}" data-port-id="${port.id}">
      <span class="port-drag-handle" title="Ziehen zum Sortieren" aria-hidden="true">${uiIcons.dragHandle}</span>
      <span>${port.direction === "input" ? "Input" : "Output"}</span>
      <input class="port-row-label" type="text" value="${escapeHtml(port.label)}" data-port-direction="${port.direction}" data-port-id="${port.id}">
      <em>${port.signal}</em>
      <button class="small-button icon-button danger" type="button" data-remove-port="${port.direction}:${port.id}" title="Entfernen" aria-label="Entfernen">
        ${uiIcons.minus}
      </button>
    </div>
  `).join("");
}

function setupPortListInteractions(listElement, getDraft, rerender) {
  let dragPort = null;

  listElement.addEventListener("input", (event) => {
    const input = event.target.closest(".port-row-label");
    const draft = getDraft();

    if (!input || !draft) {
      return;
    }

    const key = input.dataset.portDirection === "input" ? "inputs" : "outputs";
    const port = draft[key].find((candidate) => candidate.id === input.dataset.portId);

    if (port) {
      port.label = input.value;
    }
  });

  // Clearing a label out entirely falls back to an auto-numbered "<Signal> N"
  // name, same as leaving the "Label" field blank when first adding a port.
  listElement.addEventListener("focusout", (event) => {
    const input = event.target.closest(".port-row-label");
    const draft = getDraft();

    if (!input || !draft || input.value.trim()) {
      return;
    }

    const key = input.dataset.portDirection === "input" ? "inputs" : "outputs";
    const port = draft[key].find((candidate) => candidate.id === input.dataset.portId);

    if (!port) {
      return;
    }

    port.label = makePortLabel(draft[key].filter((candidate) => candidate.id !== port.id), port.signal);
    input.value = port.label;
  });

  listElement.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-port]");
    const draft = getDraft();

    if (!button || !draft) {
      return;
    }

    const [direction, portId] = button.dataset.removePort.split(":");
    const key = direction === "input" ? "inputs" : "outputs";

    draft[key] = draft[key].filter((port) => port.id !== portId);
    normalizePortPositions(draft.inputs);
    normalizePortPositions(draft.outputs);
    rerender();
  });

  listElement.addEventListener("dragstart", (event) => {
    const row = event.target.closest(".port-row[draggable='true']");

    if (!row) {
      return;
    }

    dragPort = { direction: row.dataset.portDirection, portId: row.dataset.portId };
    event.dataTransfer.effectAllowed = "move";
    row.classList.add("is-dragging");
  });

  listElement.addEventListener("dragend", (event) => {
    event.target.closest(".port-row")?.classList.remove("is-dragging");
    dragPort = null;
  });

  listElement.addEventListener("dragover", (event) => {
    const row = event.target.closest(".port-row[draggable='true']");

    if (!dragPort || !row || row.dataset.portDirection !== dragPort.direction) {
      return;
    }

    event.preventDefault();
  });

  listElement.addEventListener("drop", (event) => {
    const row = event.target.closest(".port-row[draggable='true']");
    const draft = getDraft();

    if (!dragPort || !row || !draft || row.dataset.portDirection !== dragPort.direction) {
      return;
    }

    event.preventDefault();

    const key = dragPort.direction === "input" ? "inputs" : "outputs";
    const ports = draft[key];
    const fromIndex = ports.findIndex((port) => port.id === dragPort.portId);
    const toIndex = ports.findIndex((port) => port.id === row.dataset.portId);

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      return;
    }

    const [moved] = ports.splice(fromIndex, 1);
    ports.splice(toIndex, 0, moved);
    normalizePortPositions(ports);
    rerender();
  });
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

  editPortList.innerHTML = renderPortRows(rows, editDraft.editable);
  editPortAddRow.classList.toggle("is-hidden", !editDraft.editable);
  editPortLockedNote.classList.toggle("is-hidden", editDraft.editable);
}

// LAN jacks are bidirectional (see isValidConnection), so asking for a port's
// direction is meaningless once "LAN" is chosen as the category - hide the
// picker and settle on a fixed value instead of forcing a false choice.
function updatePortDirectionVisibility(directionField, directionSelect, signalSelect) {
  const isLan = signalSelect.value === "LAN";

  directionField.classList.toggle("is-hidden", isLan);
  if (isLan) {
    directionSelect.value = "input";
  }
}

function addPortToEditDraft() {
  if (!editDraft?.editable) {
    return;
  }

  const direction = editPortDirectionSelect.value;
  const signal = editPortSignalSelect.value;
  const labelField = document.querySelector("#editPortLabel");
  const ports = direction === "input" ? editDraft.inputs : editDraft.outputs;
  const portId = makePortId(direction);
  const label = labelField.value.trim() || makePortLabel(ports, signal);

  ports.push({ id: portId, label, signal, top: 50 });
  labelField.value = "";
  normalizePortPositions(editDraft.inputs);
  normalizePortPositions(editDraft.outputs);
  renderEditPortList();
}

function resetCustomGearDraft() {
  customGearDraft = { inputs: [], outputs: [] };
  renderCustomGearPortList();
  updatePortDirectionVisibility(customGearPortDirectionField, customGearPortDirectionSelect, customGearPortSignalSelect);
}

function renderCustomGearPortList() {
  const rows = [
    ...customGearDraft.inputs.map((port) => ({ ...port, direction: "input" })),
    ...customGearDraft.outputs.map((port) => ({ ...port, direction: "output" }))
  ];

  customGearPortList.innerHTML = renderPortRows(rows, true);
}

function addPortToCustomGearDraft() {
  const direction = customGearPortDirectionSelect.value;
  const signal = customGearPortSignalSelect.value;
  const labelField = document.querySelector("#customGearPortLabel");
  const ports = direction === "input" ? customGearDraft.inputs : customGearDraft.outputs;
  const portId = makePortId(direction);
  const label = labelField.value.trim() || makePortLabel(ports, signal);

  ports.push({ id: portId, label, signal, top: 50 });
  labelField.value = "";
  normalizePortPositions(customGearDraft.inputs);
  normalizePortPositions(customGearDraft.outputs);
  renderCustomGearPortList();
}

function saveEditGear() {
  const node = editDraft ? getNode(editDraft.nodeId) : null;

  if (!node) {
    return;
  }

  const inputIds = new Set(editDraft.inputs.map((port) => port.id));
  const outputIds = new Set(editDraft.outputs.map((port) => port.id));

  recordUndoSnapshot();
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
    // A Stream Deck's imported Companion data can run into megabytes (icons
    // embedded as base64 per button, across every page) — leaving it out of
    // undo snapshots and project export/share keeps both fast and small.
    // The trade-off: undo across an import, or loading a shared project,
    // requires re-importing the .companionconfig on that node.
    nodes: state.nodes.map((node) => {
      // instanceMap/instanceNames are kept: Companion instance ids are stable
      // (baked into the .companionconfig), so a mapping/name survives even
      // though companionImport itself has to be dropped and re-imported.
      const { companionImport, companionRawConfig, companionSurfaceChoices, customVariables, ...rest } = node;
      return {
        ...rest,
        media: node.media?.url?.startsWith("blob:")
          ? { kind: "file", label: node.media.label ?? "File", name: node.media.name }
          : node.media
      };
    }),
    connections: state.connections
  };
}

function recordUndoSnapshot() {
  if (state.readOnly || isRestoringUndo) {
    return;
  }

  const snapshot = JSON.stringify(serializeSetup());

  if (undoStack.at(-1) === snapshot) {
    return;
  }

  undoStack.push(snapshot);
  if (undoStack.length > UNDO_HISTORY_LIMIT) {
    undoStack.shift();
  }
}

function undoLastChange() {
  if (state.readOnly || !undoStack.length) {
    return;
  }

  const snapshot = undoStack.pop();

  isRestoringUndo = true;
  loadSetup(JSON.parse(snapshot), state.readOnly);
  isRestoringUndo = false;
}

function loadSetup(setup, readOnly = state.readOnly) {
  state.nextId = setup.nextId ?? 1;
  state.zoom = setup.zoom ?? 1;
  state.activeSwitcherId = setup.activeSwitcherId ?? null;
  state.nodes = (setup.nodes ?? []).map((node) => ({
    ...node,
    rotation: node.rotation ?? 0,
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
  clearSelection();
  if (!isRestoringUndo) {
    undoStack = [];
  }
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

function getWorkspaceContentBounds(padding = 60) {
  if (!state.nodes.length) {
    return { x: 0, y: 0, width: 800, height: 600 };
  }

  const edges = state.nodes.map((node) => {
    const { width, height } = getNodeBounds(node);
    return {
      left: node.position.x,
      top: node.position.y,
      right: node.position.x + width,
      bottom: node.position.y + height
    };
  });

  const left = Math.max(0, Math.min(...edges.map((edge) => edge.left)) - padding);
  const top = Math.max(0, Math.min(...edges.map((edge) => edge.top)) - padding);
  const right = Math.max(...edges.map((edge) => edge.right)) + padding;
  const bottom = Math.max(...edges.map((edge) => edge.bottom)) + padding;

  return { x: left, y: top, width: right - left, height: bottom - top };
}

function printWorkspace() {
  const bounds = getWorkspaceContentBounds();
  const root = document.documentElement.style;

  root.setProperty("--print-offset-x", `${-bounds.x}px`);
  root.setProperty("--print-offset-y", `${-bounds.y}px`);
  root.setProperty("--print-width", `${bounds.width}px`);
  root.setProperty("--print-height", `${bounds.height}px`);

  // @page size can't be driven by a CSS custom property, so the page is sized
  // to the content in a freshly injected stylesheet instead — that's what
  // forces the whole plan onto a single page rather than being tiled across
  // several pages at a fixed paper size.
  const pixelsPerInch = 96;
  const pageStyle = document.createElement("style");
  pageStyle.textContent = `@page { size: ${bounds.width / pixelsPerInch}in ${bounds.height / pixelsPerInch}in; margin: 0; }`;
  document.head.appendChild(pageStyle);
  document.body.classList.add("is-print-export");

  const cleanup = () => {
    document.body.classList.remove("is-print-export");
    pageStyle.remove();
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);
  window.print();
}

// Canvas and video elements lose their rendered pixels on cloneNode(), so the
// live element (still attached to the page) is snapshotted to a data-URL
// image before the clone is serialized into the export SVG.
function snapshotCanvasToImage(canvasEl) {
  const img = document.createElement("img");
  img.className = canvasEl.className;
  img.setAttribute("style", canvasEl.getAttribute("style") ?? "");
  img.width = canvasEl.width;
  img.height = canvasEl.height;
  img.src = canvasEl.toDataURL("image/png");
  return img;
}

function snapshotVideoToImage(videoEl) {
  const canvas = document.createElement("canvas");
  canvas.width = videoEl.videoWidth || videoEl.clientWidth || 1;
  canvas.height = videoEl.videoHeight || videoEl.clientHeight || 1;

  const ctx = canvas.getContext("2d");
  try {
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  } catch {
    // Frame not yet available (e.g. video still loading); export a blank frame instead of failing.
  }

  const img = document.createElement("img");
  img.className = videoEl.className;
  img.setAttribute("style", videoEl.getAttribute("style") ?? "");
  img.src = canvas.toDataURL("image/png");
  return img;
}

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Chrome taints a canvas drawn from an SVG image the moment that SVG contains
// ANY external image reference — even a same-origin one that loads fine. The
// only way to keep the export canvas readable (toDataURL/toBlob) is to inline
// every raster image as a self-contained base64 data URI before serializing,
// so the browser never has to fetch anything while rendering the foreignObject.
async function inlineClonedImages(root) {
  const imgs = Array.from(root.querySelectorAll("img"));

  await Promise.all(imgs.map(async (imgEl) => {
    const src = imgEl.getAttribute("src");

    if (!src || src.startsWith("data:")) {
      return;
    }

    try {
      const blob = await fetch(src).then((response) => response.blob());
      imgEl.setAttribute("src", await readBlobAsDataUrl(blob));
    } catch {
      // Leave the (now unreachable) original src rather than failing the whole export.
    }
  }));
}

async function buildExportClone(bounds) {
  const cableClone = cableLayer.cloneNode(true);
  const deviceClone = deviceLayer.cloneNode(true);

  [[cableLayer, cableClone], [deviceLayer, deviceClone]].forEach(([originalRoot, clonedRoot]) => {
    const originalCanvases = originalRoot.querySelectorAll("canvas");
    clonedRoot.querySelectorAll("canvas").forEach((canvasClone, index) => {
      canvasClone.replaceWith(snapshotCanvasToImage(originalCanvases[index]));
    });

    const originalVideos = originalRoot.querySelectorAll("video");
    clonedRoot.querySelectorAll("video").forEach((videoClone, index) => {
      videoClone.replaceWith(snapshotVideoToImage(originalVideos[index]));
    });

    // Resolve every <img src> to an absolute URL so it can be fetched for inlining below.
    clonedRoot.querySelectorAll("img").forEach((imgEl) => {
      imgEl.setAttribute("src", imgEl.src);
    });
  });

  deviceClone.querySelectorAll(".node-actions").forEach((el) => el.remove());
  deviceClone.querySelectorAll(".node.is-selected").forEach((el) => el.classList.remove("is-selected"));

  const inner = document.createElement("div");
  inner.setAttribute("style", `position:absolute; left:${-bounds.x}px; top:${-bounds.y}px; width:12000px; height:8000px;`);
  inner.appendChild(cableClone);
  inner.appendChild(deviceClone);

  // styles.css only declares font-family/color on the `body` selector; this
  // clone has no <body> for that rule to match, so both are restated here
  // directly to stop every element from falling back to the browser's
  // default (serif) font.
  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.setAttribute("style", `position:relative; width:${bounds.width}px; height:${bounds.height}px; overflow:hidden; background:transparent; font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color:${cssVar("--text")};`);
  wrapper.appendChild(inner);

  await inlineClonedImages(wrapper);

  return wrapper;
}

async function exportWorkspaceAsPng() {
  if (!state.nodes.length) {
    window.alert("Es sind noch keine Geräte im Plan.");
    return;
  }

  const exportButton = document.querySelector("#exportPng");
  exportButton.disabled = true;

  try {
    const bounds = getWorkspaceContentBounds();
    const cssText = await fetch("styles.css").then((response) => response.text());
    const wrapper = await buildExportClone(bounds);

    const styleEl = document.createElement("style");
    styleEl.textContent = cssText;

    const svgNS = "http://www.w3.org/2000/svg";
    const foreignObject = document.createElementNS(svgNS, "foreignObject");
    foreignObject.setAttribute("width", "100%");
    foreignObject.setAttribute("height", "100%");
    foreignObject.appendChild(styleEl);
    foreignObject.appendChild(wrapper);

    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("xmlns", svgNS);
    svg.setAttribute("width", bounds.width);
    svg.setAttribute("height", bounds.height);
    svg.appendChild(foreignObject);

    // A blob: URL here would mark the canvas as tainted the moment it's drawn
    // (a Chrome quirk specific to SVG-as-image loaded from a blob: URL), even
    // though every resource inside is already same-origin/inlined. A data:
    // URI does not trigger that check, so it's used instead.
    const svgString = new XMLSerializer().serializeToString(svg);
    const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;

    const scale = 2;
    const image = new Image();

    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("SVG konnte nicht gerendert werden."));
      image.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bounds.width * scale);
    canvas.height = Math.round(bounds.height * scale);

    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = `broadcast-setup-${new Date().toISOString().slice(0, 10)}.png`;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error(error);
    window.alert("PNG-Export ist fehlgeschlagen. Bitte erneut versuchen.");
  } finally {
    exportButton.disabled = false;
  }
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

function openGearLibrary() {
  if (state.readOnly) {
    return;
  }

  if (!gearDialog.open) {
    resetCustomGearDraft();
    gearDialog.showModal();
  }
}

document.querySelector("#openGearLibrary").addEventListener("click", openGearLibrary);
document.querySelector(".action-menu")?.addEventListener("click", (event) => {
  if (event.target.closest(".action-submenu-summary")) {
    return;
  }

  if (event.target.closest(".action-menu-item")) {
    event.currentTarget.removeAttribute("open");
    document.querySelector(".action-submenu")?.removeAttribute("open");
  }
});

// <details> content is hidden via an internal UA mechanism tied to the
// `open` attribute, not a plain CSS display toggle, so hover-to-open can't
// be done with CSS alone — the attribute is flipped directly on
// mouseenter/mouseleave instead. A short close delay bridges the few
// pixels of gap between a summary and its panel so the menu doesn't snap
// shut while the pointer is travelling from one to the other.
function setupHoverToOpen(element) {
  if (!element) {
    return;
  }

  let closeTimer = null;

  element.addEventListener("mouseenter", () => {
    clearTimeout(closeTimer);
    element.setAttribute("open", "");
  });

  element.addEventListener("mouseleave", () => {
    closeTimer = setTimeout(() => {
      element.removeAttribute("open");
      if (element.matches(".action-menu")) {
        element.querySelector(".action-submenu")?.removeAttribute("open");
      }
    }, 250);
  });
}

setupHoverToOpen(document.querySelector(".action-menu"));
setupHoverToOpen(document.querySelector(".action-submenu"));

gearList.addEventListener("click", (event) => {
  if (state.readOnly) {
    return;
  }

  const button = event.target.closest("[data-add-gear]");

  if (!button) {
    return;
  }

  if (button.dataset.addGear === "rodeWirelessGo2Set") {
    addRodeWirelessSet();
  } else if (button.dataset.addGear === "behringerC2Set") {
    addBehringerC2Set();
  } else if (button.dataset.addGear === "streamDeckXL") {
    addStreamDeckXLWithDefaultConfig();
  } else {
    addGear(button.dataset.addGear);
  }
});

gearSearch.addEventListener("input", (event) => {
  gearFilter = event.target.value;
  renderGearList();
});

document.querySelector("#exportSetup").addEventListener("click", exportSetup);

document.querySelector("#exportPdf").addEventListener("click", printWorkspace);

document.querySelector("#exportPng").addEventListener("click", exportWorkspaceAsPng);

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

streamDeckImportFile.addEventListener("change", (event) => {
  const file = event.target.files?.[0];

  if (file) {
    handleStreamDeckImportFile(file);
  }

  event.target.value = "";
});

document.querySelector("#shareSetup").addEventListener("click", createShareLink);

document.querySelector("#openAboutDialog")?.addEventListener("click", () => {
  aboutDialog?.showModal();
});

document.querySelector("#addCustomGear").addEventListener("click", () => {
  if (state.readOnly) {
    return;
  }

  const name = document.querySelector("#customGearName").value.trim() || "Custom Gear";

  if (!customGearDraft.inputs.length && !customGearDraft.outputs.length) {
    return;
  }

  const customTemplate = {
    type: "custom",
    title: name,
    kicker: "Custom",
    width: 280,
    inputs: customGearDraft.inputs.map((port) => ({ ...port })),
    outputs: customGearDraft.outputs.map((port) => ({ ...port }))
  };

  addGear(`custom-${state.nextId}`, customTemplate);
  document.querySelector("#customGearName").value = "";
  resetCustomGearDraft();
});

document.querySelector("#addCustomGearPort").addEventListener("click", addPortToCustomGearDraft);

setupPortListInteractions(customGearPortList, () => customGearDraft, renderCustomGearPortList);

customGearPortSignalSelect.addEventListener("change", () => {
  updatePortDirectionVisibility(customGearPortDirectionField, customGearPortDirectionSelect, customGearPortSignalSelect);
});

editPortSignalSelect.addEventListener("change", () => {
  updatePortDirectionVisibility(editPortDirectionField, editPortDirectionSelect, editPortSignalSelect);
});

document.querySelector("#addEditPort").addEventListener("click", addPortToEditDraft);

document.querySelector("#saveEditGear").addEventListener("click", saveEditGear);

setupPortListInteractions(editPortList, () => editDraft, renderEditPortList);

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

alignControls.addEventListener("click", (event) => {
  const alignButton = event.target.closest("[data-align]");

  if (alignButton && !alignButton.disabled) {
    const mode = alignButton.dataset.align;

    if (mode === "distribute-h") {
      distributeSelectedNodes("horizontal");
    } else if (mode === "distribute-v") {
      distributeSelectedNodes("vertical");
    } else {
      alignSelectedNodes(mode);
    }
    return;
  }

  const rotateButton = event.target.closest("[data-rotate]");

  if (rotateButton && !rotateButton.disabled) {
    rotateSelectedNodes(rotateButton.dataset.rotate);
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

  if (suppressNextNodeClick) {
    suppressNextNodeClick = false;
    return;
  }

  if (!state.readOnly && clickedNode && (event.shiftKey || event.altKey)) {
    if (event.altKey) {
      removeNodeFromSelection(clickedNode.dataset.nodeId);
    } else {
      addNodeToSelection(clickedNode.dataset.nodeId);
    }
    render();
    event.preventDefault();
    return;
  }

  if (!state.readOnly && clickedNode) {
    setSelectedNodes([clickedNode.dataset.nodeId], clickedNode.dataset.nodeId);
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
      setSelectedNodes([clickedNode.dataset.nodeId], clickedNode.dataset.nodeId);
      render();
      return;
    }

    if (!state.readOnly && getSelectedNodeIds().length) {
      clearSelection();
      render();
    }

    return;
  }

  const action = actionTarget.dataset.action;
  const allowedReadOnlyActions = ["select-preview", "cut", "auto"];

  if (state.readOnly && !allowedReadOnlyActions.includes(action)) {
    return;
  }

  if (actionTarget.dataset.mediaPlayer && event.detail >= 2) {
    atemMediaController.open(actionTarget.dataset.nodeId, actionTarget.dataset.mediaPlayer);
    event.preventDefault();
    return;
  }

  if (action === "socket") {
    if (suppressNextSocketClick) {
      suppressNextSocketClick = false;
      return;
    }

    const socket = connectionController.getSocketData(actionTarget);

    if (state.selectedSocket) {
      connectionController.connectSockets(state.selectedSocket, socket);
    } else {
      state.selectedSocket = socket;
      render();
    }
  }

  if (action === "select-preview") {
    atemController.selectPreview(actionTarget.dataset.nodeId, actionTarget.dataset.input);
  }

  if (action === "open-media-pool") {
    atemMediaController.open(actionTarget.dataset.nodeId, actionTarget.dataset.mediaPlayer);
  }

  if (action === "set-audio-source") {
    atemAudioController.setSourceMode(actionTarget.dataset.nodeId, Number(actionTarget.dataset.input), actionTarget.dataset.mode);
  }

  if (action === "adjust-audio-fader") {
    if (suppressNextGainClick) {
      suppressNextGainClick = false;
      return;
    }
    atemAudioController.adjustInputFader(actionTarget.dataset.nodeId, Number(actionTarget.dataset.input), actionTarget.dataset.direction);
  }

  if (action === "set-mic-audio") {
    atemAudioController.setMicMode(actionTarget.dataset.nodeId, actionTarget.dataset.mic, actionTarget.dataset.mode);
  }

  if (action === "adjust-mic-fader") {
    if (suppressNextGainClick) {
      suppressNextGainClick = false;
      return;
    }
    atemAudioController.adjustMicFader(actionTarget.dataset.nodeId, actionTarget.dataset.mic, actionTarget.dataset.direction);
  }

  if (action === "set-headphone-audio") {
    atemAudioController.setHeadphoneMode(actionTarget.dataset.nodeId, actionTarget.dataset.mode);
  }

  if (action === "adjust-headphone-fader") {
    if (suppressNextGainClick) {
      suppressNextGainClick = false;
      return;
    }
    atemAudioController.adjustHeadphoneFader(actionTarget.dataset.nodeId, actionTarget.dataset.direction);
  }

  if (action === "set-transition-duration") {
    atemController.setTransitionDuration(actionTarget.dataset.nodeId, actionTarget.dataset.duration);
  }

  if (action === "set-switcher-status") {
    atemController.setStatus(actionTarget.dataset.nodeId, actionTarget.dataset.status, actionTarget.dataset.enabled);
  }

  if (action === "set-multiview-output") {
    atemController.setMultiviewOutput(actionTarget.dataset.nodeId, actionTarget.dataset.viewMode, actionTarget.dataset.input);
  }

  if (action === "set-pip-enabled") {
    atemController.setPipEnabled(actionTarget.dataset.nodeId, actionTarget.dataset.enabled);
  }

  if (action === "set-pip-preset") {
    atemController.setPipPreset(actionTarget.dataset.nodeId, actionTarget.dataset.pipPreset);
  }

  if (action === "cycle-source-view") {
    cycleSourceView(actionTarget.dataset.nodeId);
  }

  if (action === "random-media") {
    setRandomMedia(actionTarget.dataset.nodeId);
  }

  if (action === "select-ptz-camera") {
    selectPtzCamera(actionTarget.dataset.nodeId, Number(actionTarget.dataset.camera));
  }

  if (action === "cut") {
    atemController.cut(actionTarget.dataset.nodeId);
  }

  if (action === "auto") {
    atemController.auto(actionTarget.dataset.nodeId);
  }

  if (action === "ftb") {
    atemController.fadeToBlack(actionTarget.dataset.nodeId);
  }

  if (action === "toggle-switcher-bus-mode") {
    atemController.toggleBusMode(actionTarget.dataset.nodeId);
  }

  if (action === "remove-node") {
    removeNode(actionTarget.dataset.nodeId);
  }

  if (action === "edit-node") {
    openEditGear(actionTarget.dataset.nodeId);
  }

  if (action === "streamdeck-import") {
    triggerStreamDeckImport(actionTarget.dataset.nodeId);
  }

  if (action === "streamdeck-pick-surface") {
    pickStreamDeckSurface(actionTarget.dataset.nodeId, actionTarget.dataset.surfaceKey);
  }

  if (action === "streamdeck-page-nav") {
    navigateStreamDeckPage(actionTarget.dataset.nodeId, actionTarget.dataset.direction);
  }

  if (action === "streamdeck-map-instances") {
    toggleStreamDeckMapping(actionTarget.dataset.nodeId, true);
  }

  if (action === "streamdeck-close-mapping") {
    toggleStreamDeckMapping(actionTarget.dataset.nodeId, false);
  }
});

deviceLayer.addEventListener("change", (event) => {
  const select = event.target.closest('[data-action="streamdeck-set-mapping"]');

  if (select) {
    setStreamDeckInstanceMapping(select.dataset.nodeId, select.dataset.instanceId, select.value);
    return;
  }

  const nameInput = event.target.closest('[data-action="streamdeck-set-camera-name"]');

  if (nameInput) {
    setStreamDeckInstanceName(nameInput.dataset.nodeId, nameInput.dataset.instanceId, nameInput.value.trim());
  }
});

deviceLayer.addEventListener("dblclick", (event) => {
  if (state.readOnly) {
    return;
  }

  const mediaPlayerButton = event.target.closest("[data-media-player][data-node-id]");

  if (!mediaPlayerButton || !deviceLayer.contains(mediaPlayerButton)) {
    return;
  }

  event.preventDefault();
  atemMediaController.open(mediaPlayerButton.dataset.nodeId, mediaPlayerButton.dataset.mediaPlayer);
});

cableLayer.addEventListener("dblclick", (event) => {
  if (state.readOnly) {
    return;
  }

  const cableTarget = event.target.closest("[data-connection-index]");

  if (!cableTarget) {
    return;
  }

  const connectionIndex = Number(cableTarget.dataset.connectionIndex);

  if (!Number.isInteger(connectionIndex)) {
    return;
  }

  connectionController.removeConnection(connectionIndex);
});

cableLayer.addEventListener("click", (event) => {
  if (state.readOnly) {
    return;
  }

  const cableTarget = event.target.closest("[data-connection-index]");

  if (!cableTarget) {
    return;
  }

  connectionController.selectConnection(Number(cableTarget.dataset.connectionIndex));
});

cableLayer.addEventListener("pointerdown", (event) => {
  if (state.readOnly) {
    return;
  }

  if (event.target.closest("[data-connection-index]")) {
    event.stopPropagation();
    return;
  }

  if (event.target !== cableLayer) {
    return;
  }

  event.stopPropagation();
  startMarqueeDrag(event);
});

deviceLayer.addEventListener("pointerover", (event) => {
  const audioTarget = event.target.closest("[data-audio-input][data-node-id]");

  if (!audioTarget || !deviceLayer.contains(audioTarget)) {
    return;
  }

  showAudioMeterFromHover(
    audioTarget.dataset.nodeId,
    audioTarget.dataset.audioInput,
    audioTarget.dataset.audioKind ?? "source",
    getAudioMeterAnchorElement(audioTarget)
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
      atemAudioController.toggleMicFaderLock(lockButton.dataset.nodeId, lockButton.dataset.audioInput);
    } else {
      atemAudioController.toggleInputFaderLock(lockButton.dataset.nodeId, Number(lockButton.dataset.input));
    }
  }
});

mediaPoolDialog?.addEventListener("close", () => {
  atemMediaController.handleDialogClose();
});

document.querySelector("#pickMediaPoolImage")?.addEventListener("click", () => {
  atemMediaController.openFilePicker();
});

mediaPoolFileInput?.addEventListener("change", async (event) => {
  await atemMediaController.handleFileInputChange(event);
});

mediaPoolGrid?.addEventListener("click", (event) => {
  atemMediaController.handleGridClick(event);
});

mediaPoolGrid?.addEventListener("dragover", (event) => {
  atemMediaController.handleGridDragOver(event);
});

mediaPoolGrid?.addEventListener("drop", async (event) => {
  await atemMediaController.handleGridDrop(event);
});

document.addEventListener("pointermove", (event) => {
  atemMediaController.updateCursor(event);
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

workspace.addEventListener("pointerdown", (event) => {
  if (state.readOnly || event.target.closest("article.node")) {
    return;
  }

  startMarqueeDrag(event);
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

  const ptzJoystick = event.target.closest("[data-action='move-ptz-joystick']");

  if (ptzJoystick) {
    startPtzJoystickDrag(event, ptzJoystick);
    return;
  }

  const ptzPresetButton = event.target.closest("[data-action='ptz-preset']");

  if (ptzPresetButton) {
    startPtzPresetPress(ptzPresetButton);
    return;
  }

  const streamDeckButton = event.target.closest("[data-action='streamdeck-button']");

  if (streamDeckButton) {
    startStreamDeckPress(streamDeckButton);
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
    connectionController.startCableDrag(event, socketButton);
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

  if (event.shiftKey || event.altKey) {
    return;
  }

  const nodeId = node.dataset.nodeId;

  if (!getNodePosition(nodeId)) {
    return;
  }

  if (!isNodeSelected(nodeId)) {
    setSelectedNodes([nodeId], nodeId);
  } else {
    state.selectedNodeId = nodeId;
    state.selectedSocket = null;
  }

  const draggedNodeIds = getSelectedNodeIds();
  const draggedNodes = draggedNodeIds.map((selectedNodeId) => {
    const selectedNode = getNode(selectedNodeId);
    const selectedElement = deviceLayer.querySelector(`article.node[data-node-id="${selectedNodeId}"]`);
    const rect = selectedElement?.getBoundingClientRect();

    if (!selectedNode || !selectedElement || !rect) {
      return null;
    }

    return {
      nodeId: selectedNode.id,
      element: selectedElement,
      originX: selectedNode.position.x,
      originY: selectedNode.position.y,
      width: rect.width / state.zoom,
      height: rect.height / state.zoom
    };
  }).filter(Boolean);

  const bounds = draggedNodes.reduce((currentBounds, draggedNode) => ({
    minX: Math.min(currentBounds.minX, draggedNode.originX),
    minY: Math.min(currentBounds.minY, draggedNode.originY),
    maxX: Math.max(currentBounds.maxX, draggedNode.originX + draggedNode.width),
    maxY: Math.max(currentBounds.maxY, draggedNode.originY + draggedNode.height)
  }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

  node.setPointerCapture(event.pointerId);
  draggedNodes.forEach((draggedNode) => draggedNode.element.classList.add("is-dragging"));

  activeDrag = {
    type: "node",
    nodeId,
    node,
    nodes: draggedNodes,
    bounds,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    moved: false
  };
});

deviceLayer.addEventListener("pointermove", (event) => {
  if (!activeDrag || activeDrag.pointerId !== event.pointerId) {
    return;
  }

  if (activeDrag.type === "cable") {
    connectionController.updateCableDrag(event);
    return;
  }

  const requestedDx = (event.clientX - activeDrag.startX) / state.zoom;
  const requestedDy = (event.clientY - activeDrag.startY) / state.zoom;
  const dx = clamp(requestedDx, -activeDrag.bounds.minX, WORLD_WIDTH - activeDrag.bounds.maxX);
  const dy = clamp(requestedDy, -activeDrag.bounds.minY, WORLD_HEIGHT - activeDrag.bounds.maxY);

  const hasMoved = Math.abs(requestedDx) > 1 || Math.abs(requestedDy) > 1;
  if (hasMoved && !activeDrag.moved) {
    recordUndoSnapshot();
  }
  activeDrag.moved = activeDrag.moved || hasMoved;
  activeDrag.nodes.forEach((draggedNode) => {
    const nextX = draggedNode.originX + dx;
    const nextY = draggedNode.originY + dy;

    setNodePosition(draggedNode.nodeId, nextX, nextY);
    draggedNode.element.style.transform = `translate(${nextX}px, ${nextY}px)`;
  });
  renderLines();
});

deviceLayer.addEventListener("pointerup", endDrag);
deviceLayer.addEventListener("pointercancel", endDrag);
deviceLayer.addEventListener("pointerleave", stopFaderHold);
deviceLayer.addEventListener("pointerleave", () => stopPtzPresetPress(false));
deviceLayer.addEventListener("pointerleave", () => stopStreamDeckPress(false));
document.addEventListener("pointermove", (event) => {
  if (activeDrag?.type === "marquee" && activeDrag.pointerId === event.pointerId) {
    updateMarqueeDrag(event);
    return;
  }

  if (activeGainDrag && activeGainDrag.pointerId === event.pointerId) {
    updateInputGainDrag(event);
  }

  if (activeChannelFaderDrag && activeChannelFaderDrag.pointerId === event.pointerId) {
    updateChannelFaderDrag(event);
    return;
  }

  if (activePtzJoystickDrag && activePtzJoystickDrag.pointerId === event.pointerId) {
    updatePtzJoystickDrag(event);
  }
});
document.addEventListener("pointerup", (event) => {
  stopFaderHold();
  stopPtzPresetPress(true);
  stopStreamDeckPress(true);
  endInputGainDrag(event);
  endChannelFaderDrag(event);
  endPtzJoystickDrag(event);
  endDrag(event);
});
document.addEventListener("pointercancel", (event) => {
  stopFaderHold();
  stopPtzPresetPress(false);
  stopStreamDeckPress(false);
  endInputGainDrag(event);
  endChannelFaderDrag(event);
  endPtzJoystickDrag(event);
  endDrag(event);
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
    atemAudioController.setMicChannelFader(
      activeChannelFaderDrag.switcherId,
      activeChannelFaderDrag.input,
      activeChannelFaderDrag.channel,
      value
    );
    return;
  }

  if (activeChannelFaderDrag.kind === "headphone") {
    atemAudioController.setHeadphoneFader(activeChannelFaderDrag.switcherId, value);
    return;
  }

  atemAudioController.setInputChannelFader(activeChannelFaderDrag.switcherId, activeChannelFaderDrag.input, activeChannelFaderDrag.channel, value);
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
    startGain: atemAudioController.getAudioGain(switcher, kind, input)
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
  atemAudioController.setAudioGain(switcher, activeGainDrag.kind, activeGainDrag.input, activeGainDrag.startGain + delta);
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

function startMarqueeDrag(event) {
  const start = getWorkspacePoint(event);

  event.preventDefault();
  event.currentTarget.setPointerCapture?.(event.pointerId);
  activeDrag = {
    type: "marquee",
    pointerId: event.pointerId,
    captureTarget: event.currentTarget,
    start,
    current: start,
    moved: false
  };
  updateSelectionMarquee(start, start);
}

function updateMarqueeDrag(event) {
  const current = getWorkspacePoint(event);

  activeDrag.current = current;
  activeDrag.moved = activeDrag.moved
    || Math.abs(current.x - activeDrag.start.x) > 6 / state.zoom
    || Math.abs(current.y - activeDrag.start.y) > 6 / state.zoom;
  updateSelectionMarquee(activeDrag.start, current);

  if (activeDrag.moved) {
    const selectedIds = getNodesInRect(getRectFromPoints(activeDrag.start, current));
    setSelectedNodes(selectedIds, selectedIds[0] ?? null);
    renderDeviceSelectionClasses();
  }
}

function updateSelectionMarquee(start, end) {
  const rect = getRectFromPoints(start, end);

  selectionMarquee.classList.remove("is-hidden");
  selectionMarquee.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
  selectionMarquee.style.width = `${rect.width}px`;
  selectionMarquee.style.height = `${rect.height}px`;
}

function hideSelectionMarquee() {
  selectionMarquee.classList.add("is-hidden");
  selectionMarquee.style.width = "0";
  selectionMarquee.style.height = "0";
}

function getRectFromPoints(start, end) {
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const right = Math.max(start.x, end.x);
  const bottom = Math.max(start.y, end.y);

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top
  };
}

function getNodeBounds(node) {
  const element = deviceLayer.querySelector(`article.node[data-node-id="${node.id}"]`);
  const width = (element?.getBoundingClientRect().width ?? node.width) / state.zoom;
  const height = (element?.getBoundingClientRect().height ?? 220) / state.zoom;

  return { node, width, height };
}

function alignSelectedNodes(mode) {
  if (state.readOnly) {
    return;
  }

  const nodes = getSelectedNodeIds().map(getNode).filter(Boolean);

  if (nodes.length < 2) {
    return;
  }

  recordUndoSnapshot();
  const bounds = nodes.map(getNodeBounds);

  if (mode === "left") {
    const target = Math.min(...bounds.map((b) => b.node.position.x));
    bounds.forEach((b) => { b.node.position.x = target; });
  } else if (mode === "center-h") {
    const min = Math.min(...bounds.map((b) => b.node.position.x));
    const max = Math.max(...bounds.map((b) => b.node.position.x + b.width));
    const center = (min + max) / 2;
    bounds.forEach((b) => { b.node.position.x = center - b.width / 2; });
  } else if (mode === "right") {
    const target = Math.max(...bounds.map((b) => b.node.position.x + b.width));
    bounds.forEach((b) => { b.node.position.x = target - b.width; });
  } else if (mode === "top") {
    const target = Math.min(...bounds.map((b) => b.node.position.y));
    bounds.forEach((b) => { b.node.position.y = target; });
  } else if (mode === "middle-v") {
    const min = Math.min(...bounds.map((b) => b.node.position.y));
    const max = Math.max(...bounds.map((b) => b.node.position.y + b.height));
    const center = (min + max) / 2;
    bounds.forEach((b) => { b.node.position.y = center - b.height / 2; });
  } else if (mode === "bottom") {
    const target = Math.max(...bounds.map((b) => b.node.position.y + b.height));
    bounds.forEach((b) => { b.node.position.y = target - b.height; });
  }

  render();
}

function distributeSelectedNodes(axis) {
  if (state.readOnly) {
    return;
  }

  const nodes = getSelectedNodeIds().map(getNode).filter(Boolean);

  if (nodes.length < 3) {
    return;
  }

  recordUndoSnapshot();
  const bounds = nodes.map(getNodeBounds);
  const sizeKey = axis === "horizontal" ? "width" : "height";
  const positionKey = axis === "horizontal" ? "x" : "y";
  const sorted = [...bounds].sort((a, b) => a.node.position[positionKey] - b.node.position[positionKey]);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const span = (last.node.position[positionKey] + last[sizeKey]) - first.node.position[positionKey];
  const totalSize = sorted.reduce((sum, b) => sum + b[sizeKey], 0);
  const gap = (span - totalSize) / (sorted.length - 1);

  let cursor = first.node.position[positionKey] + first[sizeKey];
  for (let i = 1; i < sorted.length - 1; i += 1) {
    cursor += gap;
    sorted[i].node.position[positionKey] = cursor;
    cursor += sorted[i][sizeKey];
  }

  render();
}

function rotateSelectedNodes(direction) {
  if (state.readOnly) {
    return;
  }

  const nodes = getSelectedNodeIds().map(getNode).filter(Boolean);

  if (!nodes.length) {
    return;
  }

  recordUndoSnapshot();
  const delta = direction === "cw" ? 90 : -90;
  nodes.forEach((node) => {
    node.rotation = ((node.rotation ?? 0) + delta + 360) % 360;
  });

  render();
}

function updateAlignControlsState() {
  const selectedCount = getSelectedNodeIds().length;

  alignControls.querySelectorAll("[data-align]").forEach((button) => {
    const needsThree = button.dataset.align.startsWith("distribute");
    button.disabled = state.readOnly || selectedCount < (needsThree ? 3 : 2);
  });

  alignControls.querySelectorAll("[data-rotate]").forEach((button) => {
    button.disabled = state.readOnly || selectedCount < 1;
  });
}

function getNodesInRect(selectionRect) {
  return state.nodes
    .filter((node) => {
      const element = deviceLayer.querySelector(`article.node[data-node-id="${node.id}"]`);
      const width = (element?.getBoundingClientRect().width ?? node.width) / state.zoom;
      const height = (element?.getBoundingClientRect().height ?? 220) / state.zoom;
      const nodeRect = {
        left: node.position.x,
        top: node.position.y,
        right: node.position.x + width,
        bottom: node.position.y + height
      };

      return selectionRect.left <= nodeRect.right
        && selectionRect.right >= nodeRect.left
        && selectionRect.top <= nodeRect.bottom
        && selectionRect.bottom >= nodeRect.top;
    })
    .map((node) => node.id);
}

function renderDeviceSelectionClasses() {
  const selectedIds = new Set(getSelectedNodeIds());

  deviceLayer.querySelectorAll("article.node").forEach((nodeElement) => {
    nodeElement.classList.toggle("is-selected", selectedIds.has(nodeElement.dataset.nodeId));
  });
}

function endDrag(event) {
  if (!activeDrag || activeDrag.pointerId !== event.pointerId) {
    return;
  }

  if (activeDrag.type === "marquee") {
    const wasMoved = activeDrag.moved;

    hideSelectionMarquee();
    try {
      activeDrag.captureTarget?.releasePointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }
    activeDrag = null;

    if (!wasMoved) {
      clearSelection();
    }
    render();
    return;
  }

  if (activeDrag.type === "cable") {
    connectionController.endCableDrag(event);
    return;
  }

  activeDrag.nodes?.forEach((draggedNode) => draggedNode.element.classList.remove("is-dragging"));
  suppressNextNodeClick = activeDrag.moved;
  activeDrag.node.releasePointerCapture(event.pointerId);
  activeDrag = null;
  render();
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
  updateActivePtzModifierState(event);

  if (isTypingTarget(event.target) || isDialogOpen()) {
    return;
  }

  if (event.key === "Escape") {
    if (getSelectedNodeIds().length || state.selectedSocket) {
      clearSelection();
      render();
      event.preventDefault();
    }
    return;
  }

  if ((event.key === "Delete" || event.key === "Backspace" || event.key.toLowerCase() === "x") && !event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey) {
    const selectedNodeIds = getSelectedNodeIds();

    if (!state.readOnly && selectedNodeIds.length) {
      removeNodes(selectedNodeIds);
      event.preventDefault();
    } else if (!state.readOnly && state.selectedConnectionIndex !== null) {
      connectionController.removeConnection(state.selectedConnectionIndex);
      event.preventDefault();
    }
    return;
  }

  if (event.key.toLowerCase() === "a" && event.shiftKey && !event.metaKey && !event.altKey && !event.ctrlKey) {
    openGearLibrary();
    event.preventDefault();
    return;
  }

  if (event.key.toLowerCase() === "e" && event.shiftKey && !event.metaKey && !event.altKey && !event.ctrlKey) {
    exportSetup();
    event.preventDefault();
    return;
  }

  if (event.key.toLowerCase() === "i" && event.shiftKey && !event.metaKey && !event.altKey && !event.ctrlKey) {
    if (!state.readOnly) {
      importSetupFile.click();
    }
    event.preventDefault();
    return;
  }

  if (!event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
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

  if (event.key.toLowerCase() === "z") {
    undoLastChange();
    event.preventDefault();
  }

  if (event.key.toLowerCase() === "x") {
    const selectedNodeIds = getSelectedNodeIds();

    if (selectedNodeIds.length) {
      removeNodes(selectedNodeIds);
    } else if (state.selectedConnectionIndex !== null) {
      connectionController.removeConnection(state.selectedConnectionIndex);
    }
    event.preventDefault();
  }

  if (event.key.toLowerCase() === "a") {
    selectAllNodes();
    event.preventDefault();
  }
});
document.addEventListener("keyup", updateActivePtzModifierState);

workspaceViewport.addEventListener("scroll", renderLines);
window.addEventListener("resize", renderLines);

if (!loadSetupFromHash()) {
  render();
}
