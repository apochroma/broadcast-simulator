window.BroadcastDeviceCatalog = (() => {
  const SWITCH_PORT_PITCH = 30;
  const SWITCH_PORT_HEADER_OFFSET = 83;

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
        { id: "rj45", label: "LAN", signal: "LAN", top: 72 },
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
    microConverterBidiSdiHdmi12g: {
      type: "converter",
      title: "Micro Converter",
      kicker: "Konverter",
      capabilities: ["signal-cross-conversion"],
      width: 260,
      inputs: [
        { id: "sdi-in", label: "SDI In", signal: "SDI", top: 62, edge: "right" },
        { id: "hdmi-in", label: "HDMI In", signal: "HDMI", top: 62, edge: "left" }
      ],
      outputs: [
        { id: "sdi-out", label: "SDI Out", signal: "SDI", top: 38, edge: "right" },
        { id: "hdmi-out", label: "HDMI Out", signal: "HDMI", top: 38, edge: "left" }
      ]
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
    skaarhojPtzFly: makePtzControllerTemplate("SKAARHOJ PTZ Fly", "fly"),
    networkSwitch8: makeNetworkSwitchTemplate("PoE Netzwerk-Switch 8-Port", 8),
    networkSwitch16: makeNetworkSwitchTemplate("PoE Netzwerk-Switch 16-Port", 16),
    networkSwitch24: makeNetworkSwitchTemplate("PoE Netzwerk-Switch 24-Port", 24),
    unifiCloudGatewayUltra: {
      type: "networkGateway",
      title: "UniFi Cloud Gateway Ultra",
      kicker: "Router / Gateway",
      capabilities: ["network-gateway", "router"],
      width: 300,
      // `top` on a port is a PERCENTAGE of the whole card's height (see
      // renderSockets), not pixels — spread across a wide band so all 5
      // ports land clear of both the header above and the taller
      // network-gateway-face content below instead of bunching near 100%.
      inputs: [
        { id: "wan", label: "WAN (2.5GbE)", signal: "LAN", top: 30 },
        { id: "lan-1", label: "LAN 1", signal: "LAN", top: 42 },
        { id: "lan-2", label: "LAN 2", signal: "LAN", top: 54 },
        { id: "lan-3", label: "LAN 3", signal: "LAN", top: 66 },
        { id: "lan-4", label: "LAN 4", signal: "LAN", top: 78 }
      ],
      outputs: []
    },
    router: {
      type: "router",
      title: "Router",
      kicker: "Router",
      capabilities: ["network-gateway", "router"],
      width: 300,
      // WAN + LAN cluster on the left (input side, same "leaf cables plug
      // into me" role as the Cloud Gateway's ports); a single separate
      // "Internet" jack on the right (output side) so the cable toward the
      // internet cloud can leave from the opposite edge instead of doubling
      // back past the local LAN cabling.
      inputs: [
        { id: "wan", label: "WAN", signal: "LAN", top: 32 },
        { id: "lan-1", label: "LAN 1", signal: "LAN", top: 46 },
        { id: "lan-2", label: "LAN 2", signal: "LAN", top: 60 },
        { id: "lan-3", label: "LAN 3", signal: "LAN", top: 74 }
      ],
      outputs: [
        { id: "internet", label: "Internet", signal: "LAN", top: 50 }
      ]
    },
    poeInjectorAt: {
      type: "poeInjector",
      title: "PoE+ Injector",
      kicker: "PoE Injector",
      capabilities: ["poe-injector"],
      width: 220,
      // "LAN" plugs into an upstream switch/gateway (same role as a camera's
      // own LAN port, hence output-typed to match its input-typed jacks);
      // "PoE+" is where the powered downstream device's own LAN output
      // plugs in (same role as a switch's/gateway's ports).
      outputs: [
        { id: "lan-in", label: "LAN", signal: "LAN", top: 35 }
      ],
      inputs: [
        { id: "poe-out", label: "PoE+", signal: "LAN", top: 65 }
      ]
    },
    internetCloud: {
      type: "internetCloud",
      title: "Internet",
      kicker: "WAN / VPN",
      capabilities: ["internet-uplink"],
      width: 260,
      // No discrete ports at all — a cable snaps onto the nearest point of
      // the cloud's own SVG outline (see connections.js' contour-snap logic
      // and renderNode's chromeless "internetCloud" branch in
      // device-renderers.js), compatible with LAN/Breitband/Glasfaser.
      inputs: [],
      outputs: []
    },
    rodeWirelessGo2Receiver: {
      type: "wirelessReceiver",
      title: "RODE Wireless GO II Receiver",
      kicker: "Funkempfänger",
      capabilities: ["audio-source", "wireless-receiver"],
      width: 220,
      inputs: [
        { id: "wireless-in-1", label: "CH 1", signal: "Wireless", top: 38 },
        { id: "wireless-in-2", label: "CH 2", signal: "Wireless", top: 62 }
      ],
      outputs: [
        { id: "mic-out", label: "Mic Out", signal: "Mic 3.5mm", top: 50 }
      ]
    },
    rodeWirelessGo2Transmitter: {
      type: "wirelessTransmitter",
      title: "RODE Wireless GO II Transmitter",
      kicker: "Funkmikrofon",
      capabilities: ["audio-source", "wireless-transmitter"],
      width: 220,
      inputs: [],
      outputs: [
        { id: "wireless-out", label: "Wireless", signal: "Wireless", top: 50 }
      ]
    },
    teradekAce500Receiver: {
      type: "videoWirelessReceiver",
      title: "Teradek ACE 500 RX",
      kicker: "Funkempfänger Video",
      capabilities: ["signal-cross-conversion", "wireless-receiver"],
      width: 240,
      inputs: [
        { id: "wireless-in", label: "Wireless", signal: "Wireless", top: 50 }
      ],
      outputs: [
        { id: "hdmi-out", label: "HDMI Out", signal: "HDMI", top: 50 }
      ]
    },
    teradekAce500Transmitter: {
      type: "videoWirelessTransmitter",
      title: "Teradek ACE 500 TX",
      kicker: "Funksender Video",
      capabilities: ["signal-cross-conversion", "wireless-transmitter"],
      width: 240,
      inputs: [
        { id: "hdmi-in", label: "HDMI In", signal: "HDMI", top: 50 }
      ],
      outputs: [
        { id: "wireless-out", label: "Wireless", signal: "Wireless", top: 50 }
      ]
    },
    soundDevicesMixPre3: {
      type: "audioRecorder",
      title: "Sound Devices MixPre-3 II",
      kicker: "Recorder / Mixer",
      image: "assets/mixpre3.png",
      capabilities: ["audio-source", "audio-mixer", "audio-recorder"],
      width: 300,
      inputs: [
        { id: "mic-line-1", label: "Mic/Line 1", signal: "XLR", top: 15 },
        { id: "mic-line-2", label: "Mic/Line 2", signal: "XLR", top: 30 },
        { id: "mic-line-3", label: "Mic/Line 3", signal: "XLR", top: 45 },
        { id: "aux-in", label: "Aux In", signal: "Mic 3.5mm", top: 60 },
        { id: "tc-in", label: "TC In", signal: "Timecode", top: 75 }
      ],
      outputs: [
        { id: "line-out", label: "Line Out", signal: "Mic 3.5mm", top: 25 },
        { id: "headphone-out", label: "Phones", signal: "Headphone 3.5mm", top: 50 },
        { id: "usb-c-out", label: "USB-C", signal: "USB-C", top: 75 }
      ]
    },
    behringerC2: {
      type: "microphone",
      title: "Behringer C-2",
      kicker: "Mikrofon",
      capabilities: ["audio-source", "condenser-microphone"],
      width: 200,
      inputs: [],
      outputs: [
        { id: "xlr-out", label: "XLR Out", signal: "XLR", top: 50 }
      ]
    },
    streamDeckXL: {
      type: "streamDeckXL",
      title: "Elgato Stream Deck XL",
      kicker: "Control Surface",
      capabilities: ["control-surface", "companion-import"],
      width: 460,
      gridColumns: 8,
      gridRows: 4,
      inputs: [],
      outputs: [
        { id: "usb-c", label: "USB-C", signal: "USB-C", top: 50 }
      ]
    }
  };

  const gearEntries = [
    ["canonCrn100", "Canon", "Canon CR-N100", "HDMI Out, SDI Out, LAN"],
    ["canonCrn300", "Canon", "Canon CR-N300", "HDMI Out, SDI Out, LAN"],
    ["canonCrn500", "Canon", "Canon CR-N500", "HDMI Out, SDI Out, LAN"],
    ["canonCrn700", "Canon", "Canon CR-N700", "HDMI Out, SDI Out, LAN"],
    ["atemMiniPro", "Blackmagic ATEM Mini", "ATEM Mini Pro", "4 HDMI Inputs, HDMI Out, USB-C, 2x Mic"],
    ["atemMiniProIso", "Blackmagic ATEM Mini", "ATEM Mini Pro ISO", "4 HDMI Inputs, HDMI Out, USB-C, 2x Mic"],
    ["atemMiniExtreme", "Blackmagic ATEM Mini", "ATEM Mini Extreme", "8 HDMI Inputs, 2x HDMI Out, 2x USB-C, Phones"],
    ["atemMiniExtremeIso", "Blackmagic ATEM Mini", "ATEM Mini Extreme ISO", "8 HDMI Inputs, 2x HDMI Out, 2x USB-C, Phones"],
    ["atemSdiProIso", "Blackmagic ATEM SDI", "ATEM SDI Pro ISO", "4 SDI Inputs, SDI Out, USB-C, 2x Mic"],
    ["atemSdiExtremeIso", "Blackmagic ATEM SDI", "ATEM SDI Extreme ISO", "8 SDI Inputs, 2x SDI Out, 2x USB-C, Phones"],
    ["computer", "Playback", "Computer / Playback", "HDMI, USB-C, LAN und 3.5mm Line-Out mit Datei-Preview"],
    ["hdmiSplitter", "Distribution", "HDMI Splitter 1x5", "1 HDMI Input, 5 HDMI Outputs"],
    ["microConverterBidiSdiHdmi12g", "Blackmagic Micro Converter", "BiDirectional SDI/HDMI 12G", "SDI In/Out, HDMI In/Out, wandelt beide Richtungen gleichzeitig"],
    ["monitor", "Monitoring", "Program Monitor", "SDI/HDMI Input und Loop-Out"],
    ["skaarhojPtzPro", "SKAARHOJ PTZ", "PTZ Pro", "1G Ethernet mit PoE, Joystick, Kamera-Auswahl"],
    ["skaarhojPtzFly", "SKAARHOJ PTZ", "PTZ Fly", "1G Ethernet mit PoE, kompakter Joystick-Controller"],
    ["networkSwitch8", "Netzwerk", "PoE Netzwerk-Switch 8-Port", "8x LAN"],
    ["networkSwitch16", "Netzwerk", "PoE Netzwerk-Switch 16-Port", "16x LAN"],
    ["networkSwitch24", "Netzwerk", "PoE Netzwerk-Switch 24-Port", "24x LAN"],
    ["unifiCloudGatewayUltra", "Ubiquiti UniFi", "Cloud Gateway Ultra", "1x WAN 2.5GbE, 4x LAN 1GbE, UniFi OS Controller"],
    ["router", "Netzwerk", "Router", "1x WAN, 3x LAN, 1x Internet-Anschluss auf der Gegenseite"],
    ["poeInjectorAt", "Ubiquiti UniFi", "PoE+ Injector", "1x LAN In, 1x PoE+ Out, 802.3at, Gigabit"],
    ["internetCloud", "Netzwerk", "Internet", "Generischer WAN/VPN-Uplink, verbindet LAN, Breitband oder Glasfaser"],
    ["rodeWirelessGo2Set", "RODE", "Wireless GO II (Set)", "1x Receiver + 2x Transmitter, 3.5mm Mic Out, koppelt drahtlos"],
    ["teradekAce500Set", "Teradek", "ACE 500 TX/RX Set", "1x Sender (HDMI In) + 1x Empfänger (HDMI Out), koppelt drahtlos"],
    ["soundDevicesMixPre3", "Sound Devices", "MixPre-3 II", "3x XLR Mic/Line, Aux In, TC In, Line-/Kopfhörer-Out, USB-C"],
    ["behringerC2Set", "Behringer", "C-2 Stereoset", "2x Kondensatormikrofon, XLR Out, Niere, paarweise abgeglichen"],
    ["streamDeckXL", "Elgato", "Stream Deck XL", "8x4 Tasten, USB-C, Companion-Konfiguration importierbar"]
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
      model3d: "assets/CanonCRN300.glb",
      capabilities: ["video-source", "camera-source", "network-control"],
      width: 270,
      inputs: [
        { id: "mic-in", label: "Mic In", signal: "Mic 3.5mm", top: 58 }
      ],
      outputs: [
        { id: "hdmi-out", label: "HDMI Out", signal: "HDMI", top: 42 },
        { id: "sdi-out", label: "SDI Out", signal: "SDI", top: 58 },
        { id: "rj45", label: "LAN", signal: "LAN", top: 74 }
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
      inputs: [],
      outputs: [
        { id: "poe", label: "LAN", signal: "LAN", top: 50 }
      ]
    };
  }

  function makeNetworkSwitchTemplate(title, portCount) {
    return {
      type: "networkSwitch",
      title,
      kicker: "Netzwerk",
      capabilities: ["network-switch", "poe-powered"],
      width: 300,
      portCount,
      portColumnPitch: SWITCH_PORT_PITCH,
      inputs: makeLeftEdgePorts("port", portCount, "LAN"),
      outputs: []
    };
  }

  function makeLeftEdgePorts(prefix, count, signal) {
    return Array.from({ length: count }, (_, index) => ({
      id: `${prefix}-${index + 1}`,
      label: `${index + 1}`,
      number: index + 1,
      signal,
      // 90° CCW rotation of the former top-edge row: port 1 lands at the bottom, port N at the top
      topPx: SWITCH_PORT_HEADER_OFFSET + (count - 1 - index) * SWITCH_PORT_PITCH
    }));
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
