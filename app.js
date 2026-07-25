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
  Wireless: cssVar("--signal-wireless")
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
const audioMeterPopover = document.querySelector("#audioMeterPopover");
const emptyState = document.querySelector("#emptyState");
const programStatus = document.querySelector("#programStatus");
const zoomReadout = document.querySelector("#zoomReadout");
const gearDialog = document.querySelector("#gearDialog");
const gearList = document.querySelector("#gearList");
const gearSearch = document.querySelector("#gearSearch");
const importSetupFile = document.querySelector("#importSetupFile");
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
    pattern: sourceLook.pattern
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

function renderPtzPanoramaPicture(source) {
  const ptz = normalizePtzState(source.ptz);
  const zoom = clamp(Number(ptz.zoom ?? 1.7), 1.1, 3.2);

  return `
    <div class="ptz-panorama-view">
      <canvas class="ptz-panorama-canvas"
        data-source-id="${source.id}"
        data-pan="${ptz.pan}"
        data-tilt="${ptz.tilt}"
        data-zoom="${zoom}"></canvas>
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

  const current = normalizePtzState(camera.ptz);
  const panVelocity = Math.sign(x) * Math.pow(Math.abs(x), 1.35) * 82;
  const tiltVelocity = Math.sign(y) * Math.pow(Math.abs(y), 1.35) * 48;
  const zoomVelocity = zoomDirection * 0.85;

  camera.ptz = {
    ...current,
    pan: clamp(current.pan + panVelocity * elapsed, -180, 180),
    tilt: clamp(current.tilt - tiltVelocity * elapsed, -75, 75),
    zoom: clamp(current.zoom + zoomVelocity * elapsed, 1.1, 3.2)
  };
}

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

function normalizePtzState(ptz) {
  return {
    pan: clamp(Number(ptz?.pan ?? 0), -180, 180),
    tilt: clamp(Number(ptz?.tilt ?? 0), -75, 75),
    zoom: clamp(Number(ptz?.zoom ?? 1.7), 1.1, 3.2)
  };
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
}

function renderPtzProjectionCanvas(canvas) {
  const source = getNode(canvas.dataset.sourceId);
  const url = source?.media?.url;

  if (!source || !url) {
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
    zoom: Number(source.ptz?.zoom ?? canvas.dataset.zoom ?? 1.7)
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
  const zoom = clamp(Number(ptz.zoom ?? 1.7), 1.1, 3.2);
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

  if (file.type.startsWith("image/")) {
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
    nodes: state.nodes.map((node) => ({
      ...node,
      media: node.media?.url?.startsWith("blob:")
        ? { kind: "file", label: node.media.label ?? "File", name: node.media.name }
        : node.media
    })),
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
  if (event.target.closest(".action-menu-item")) {
    event.currentTarget.removeAttribute("open");
  }
});

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
  } else {
    addGear(button.dataset.addGear);
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
  endInputGainDrag(event);
  endChannelFaderDrag(event);
  endPtzJoystickDrag(event);
  endDrag(event);
});
document.addEventListener("pointercancel", (event) => {
  stopFaderHold();
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

  if ((event.key === "Delete" || event.key === "Backspace") && !event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey) {
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
