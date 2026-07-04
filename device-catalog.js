window.BroadcastDeviceCatalog = (() => {
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
      capabilities: ["playback-source", "video-source", "audio-line-output", "file-preview"],
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
      capabilities: ["signal-distribution"],
      width: 280,
      inputs: [{ id: "input-1", label: "HDMI In", signal: "HDMI", top: 50 }],
      outputs: makeNumberedPorts("output", 5, "HDMI", "HDMI", 24, 13)
    },
    monitor: {
      type: "monitor",
      title: "Program Monitor",
      kicker: "Monitor",
      capabilities: ["signal-monitor", "monitor-loop-through", "signal-cross-conversion"],
      width: 320,
      inputs: [
        { id: "sdi-in", label: "SDI In", signal: "SDI", top: 42 },
        { id: "hdmi-in", label: "HDMI In", signal: "HDMI", top: 58 }
      ],
      outputs: [
        { id: "sdi-out", label: "SDI Out", signal: "SDI", top: 42 },
        { id: "hdmi-out", label: "HDMI Out", signal: "HDMI", top: 58 }
      ]
    },
    skaarhojPtzPro: makePtzControllerTemplate("SKAARHOJ PTZ Pro", "pro"),
    skaarhojPtzFly: makePtzControllerTemplate("SKAARHOJ PTZ Fly", "fly")
  };

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
    ["monitor", "Monitoring", "Program Monitor", "SDI/HDMI Input und Loop-Out"],
    ["skaarhojPtzPro", "SKAARHOJ PTZ", "PTZ Pro", "1G Ethernet mit PoE, Joystick, Kamera-Auswahl"],
    ["skaarhojPtzFly", "SKAARHOJ PTZ", "PTZ Fly", "1G Ethernet mit PoE, kompakter Joystick-Controller"]
  ];

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
      capabilities: ["video-source", "camera-source", "network-control"],
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
      width: inputCount > 4 ? 1894 : 1140
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
      width: inputCount > 4 ? 1894 : 1140
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
      capabilities: [
        "video-switcher",
        "audio-mixer",
        "media-player",
        "picture-in-picture",
        "fade-to-black",
        "multiview",
        "record-stream-control"
      ],
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

  function makePtzControllerTemplate(title, variant) {
    return {
      type: "ptzController",
      title,
      kicker: "PTZ Controller",
      capabilities: ["ptz-control", "network-control", "poe-powered"],
      width: variant === "pro" ? 520 : 430,
      variant,
      selectedCamera: 1,
      inputs: [
        { id: "poe", label: "PoE / LAN", signal: "RJ45", top: 50 }
      ],
      outputs: []
    };
  }

  function makeNumberedPorts(prefix, count, signal, labelPrefix, firstTop, step) {
    return Array.from({ length: count }, (_, index) => ({
      id: `${prefix}-${index + 1}`,
      label: `${labelPrefix} ${index + 1}`,
      number: index + 1,
      signal,
      top: firstTop + index * step
    }));
  }

  return {
    gearLibrary,
    gearEntries,
    legacyGearAliases,
    switcherMediaSources,
    pipPresets,
    makeNumberedPorts
  };
})();
