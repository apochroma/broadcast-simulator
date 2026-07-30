(function () {
  const SUPPORTED_ACTIONS = {
    "bmd-atem": new Set(["program", "preview", "cut", "auto"]),
    "canon-ptz": new Set([
      "recallPset", "savePset",
      "up", "down", "left", "right", "upLeft", "upRight", "downLeft", "downRight",
      "home", "stop", "stopPan", "stopTilt"
    ]),
    internal: new Set(["set_page", "custom_variable_set_value"])
  };

  const SUPPORTED_FEEDBACKS = {
    "bmd-atem": new Set(["program_bg", "preview_bg"]),
    "canon-ptz": new Set(["tallyPreview", "tallyProgram"])
  };

  async function decompressAndParse(file) {
    if (!("DecompressionStream" in window)) {
      throw new Error("Dieser Browser unterstützt keine native Gzip-Dekomprimierung (DecompressionStream fehlt).");
    }

    const stream = file.stream().pipeThrough(new DecompressionStream("gzip"));
    const text = await new Response(stream).text();
    return JSON.parse(text);
  }

  function listStreamDeckSurfaces(rawConfig) {
    const surfaces = rawConfig?.surfaces ?? {};

    return Object.entries(surfaces)
      .filter(([, surface]) => surface?.integrationType === "elgato-streamdeck")
      .map(([key, surface]) => ({
        key,
        name: surface.name || surface.type || key,
        type: surface.type ?? "Elgato Stream Deck",
        columns: surface.gridSize?.columns ?? 0,
        rows: surface.gridSize?.rows ?? 0,
        xOffset: surface.config?.xOffset ?? 0,
        yOffset: surface.config?.yOffset ?? 0,
        startupPage: surface.groupConfig?.startup_page ?? 1
      }));
  }

  function moduleForConnection(rawConfig, connectionId) {
    if (connectionId === "internal") {
      return "internal";
    }

    return rawConfig.instances?.[connectionId]?.moduleId ?? connectionId;
  }

  function normalizeActionsList(rawConfig, actions, out) {
    if (!Array.isArray(actions)) {
      return;
    }

    actions.forEach((action) => {
      const module = moduleForConnection(rawConfig, action.connectionId);
      const definitionId = action.definitionId;
      const options = action.options ?? {};

      if (module === "internal" && definitionId === "set_page") {
        out.push({
          module,
          definitionId,
          page: options.page?.value,
          surfaceId: options.surfaceId?.value
        });
      } else if (module === "internal" && definitionId === "custom_variable_set_value") {
        out.push({
          module,
          definitionId,
          variableName: options.name?.value,
          value: options.value?.value
        });
      } else if (SUPPORTED_ACTIONS[module]?.has(definitionId)) {
        out.push({
          module,
          instanceId: action.connectionId,
          definitionId,
          mixeffect: Number(options.mixeffect?.value ?? 0),
          input: options.input?.value,
          preset: options.val?.value
        });
      }

      const children = action.children ?? {};
      Object.values(children).forEach((group) => normalizeActionsList(rawConfig, group, out));
    });
  }

  // Companion action_sets always has "down" (fires on press) and "up" (fires
  // on release, if released before any hold threshold). A button with a
  // long-press behavior (e.g. "release after 1000ms") adds extra numeric-ms
  // keys instead — those fire in place of "up" once held that long, mirroring
  // this app's existing PTZ-preset long-press pattern.
  function normalizeButtonActions(rawConfig, control) {
    const actionSets = control.steps?.["0"]?.action_sets ?? {};

    const press = [];
    normalizeActionsList(rawConfig, actionSets.down, press);

    const release = [];
    normalizeActionsList(rawConfig, actionSets.up, release);

    const holdGroups = Object.keys(actionSets)
      .map(Number)
      .filter((ms) => Number.isFinite(ms))
      .sort((a, b) => a - b)
      .map((ms) => {
        const groupActions = [];
        normalizeActionsList(rawConfig, actionSets[String(ms)], groupActions);
        return { afterMs: ms, actions: groupActions };
      });

    return { press, release, holdGroups };
  }

  function normalizeButtonFeedbacks(rawConfig, control) {
    const feedbacks = [];

    (control.feedbacks ?? []).forEach((feedback) => {
      const module = moduleForConnection(rawConfig, feedback.connectionId);
      const definitionId = feedback.definitionId;

      if (!SUPPORTED_FEEDBACKS[module]?.has(definitionId)) {
        return;
      }

      const options = feedback.options ?? {};
      feedbacks.push({
        module,
        instanceId: feedback.connectionId,
        definitionId,
        mixeffect: Number(options.mixeffect?.value ?? 0),
        input: options.input?.value,
        isInverted: feedback.isInverted?.value === true
      });
    });

    return feedbacks;
  }

  // The camera-selector button in this Companion setup's "menu" row has a
  // white bgcolor baked in; its two siblings (jump to Exposure, jump to
  // Recall/Save Presets) use the exact same GoToPage-from-initPage pattern
  // but were left black. Detecting that shared pattern lets us align all
  // three visually without hardcoding page/button positions.
  function isCameraPageShortcutAction(action) {
    return action.module === "internal"
      && action.definitionId === "custom_variable_set_value"
      && action.variableName === "GoToPage"
      && typeof action.value === "string"
      && action.value.startsWith("$(internal:custom_initPage)");
  }

  function isCameraPageShortcutButton(actions) {
    const allActions = [
      ...actions.press,
      ...actions.release,
      ...actions.holdGroups.flatMap((group) => group.actions)
    ];

    return allActions.some(isCameraPageShortcutAction);
  }

  function rgbIntToCss(value) {
    if (typeof value !== "number") {
      return null;
    }

    const r = (value >> 16) & 0xff;
    const g = (value >> 8) & 0xff;
    const b = value & 0xff;
    return `rgb(${r}, ${g}, ${b})`;
  }

  function normalizeCell(rawConfig, cell) {
    if (!cell || typeof cell !== "object") {
      return null;
    }

    if (cell.type === "pageup" || cell.type === "pagedown" || cell.type === "pagenum") {
      return { kind: "pagenav", direction: cell.type.replace("page", "") };
    }

    if (cell.type !== "button") {
      return null;
    }

    const style = cell.style ?? {};
    const actions = normalizeButtonActions(rawConfig, cell);
    const forceWhiteBg = (style.bgcolor === 0 || style.bgcolor == null) && isCameraPageShortcutButton(actions);

    return {
      kind: "button",
      text: style.text ?? "",
      png64: style.png64 ?? null,
      bgcolor: forceWhiteBg ? "rgb(255, 255, 255)" : rgbIntToCss(style.bgcolor),
      color: forceWhiteBg ? "rgb(0, 0, 0)" : rgbIntToCss(style.color),
      actions,
      feedbacks: normalizeButtonFeedbacks(rawConfig, cell)
    };
  }

  function normalizeForSurface(rawConfig, surfaceKey) {
    const surface = rawConfig.surfaces?.[surfaceKey];

    if (!surface) {
      throw new Error(`Surface ${surfaceKey} nicht in der Konfiguration gefunden.`);
    }

    const columns = surface.gridSize?.columns ?? 8;
    const rows = surface.gridSize?.rows ?? 4;
    const xOffset = surface.config?.xOffset ?? 0;
    const yOffset = surface.config?.yOffset ?? 0;

    const pageIds = Object.keys(rawConfig.pages ?? {}).sort((a, b) => Number(a) - Number(b));
    const pages = {};

    pageIds.forEach((pageId) => {
      const page = rawConfig.pages[pageId];
      const controls = page.controls ?? {};
      const buttons = [];
      let hasContent = false;

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < columns; col += 1) {
          const sourceRow = controls[String(row + yOffset)] ?? {};
          const cell = normalizeCell(rawConfig, sourceRow[String(col + xOffset)]);

          if (cell) {
            hasContent = true;
          }

          buttons.push({ row, col, cell });
        }
      }

      if (hasContent) {
        pages[pageId] = { name: page.name ?? `Page ${pageId}`, buttons };
      }
    });

    const instances = {};
    Object.entries(rawConfig.instances ?? {}).forEach(([id, instance]) => {
      instances[id] = { moduleId: instance.moduleId, label: instance.label };
    });

    const startupPageId = String(surface.groupConfig?.startup_page ?? pageIds[0] ?? "1");

    return {
      surfaceKey,
      surfaceName: surface.name || surface.type,
      columns,
      rows,
      pageOrder: Object.keys(pages).sort((a, b) => Number(a) - Number(b)),
      startupPageId: pages[startupPageId] ? startupPageId : Object.keys(pages)[0] ?? null,
      pages,
      instances
    };
  }

  window.CompanionImport = {
    decompressAndParse,
    listStreamDeckSurfaces,
    normalizeForSurface
  };
})();
