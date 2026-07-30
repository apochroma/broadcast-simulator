(function () {
  class AtemController {
    constructor({ callbacks, state }) {
      this.callbacks = callbacks;
      this.state = state;
    }

    getSwitcher(switcherId) {
      const switcher = this.callbacks.getNode(switcherId);
      return switcher?.type === "switcher" ? switcher : null;
    }

    selectPreview(switcherId, input) {
      const switcher = this.getSwitcher(switcherId);

      if (!switcher) {
        return;
      }

      this.state.activeSwitcherId = switcher.id;
      const source = this.callbacks.normalizeSwitcherBusSource(input);

      if (this.callbacks.getSwitcherBusMode(switcher) === "cutBus") {
        const previousProgram = switcher.programInput;
        switcher.programInput = source;
        switcher.isFadeToBlackActive = source === "black";
        this.callbacks.beginAudioFadeForProgramChange(switcher, previousProgram, source);
      } else {
        switcher.previewInput = source;
      }

      this.callbacks.render();
    }

    // Direct bus writes for external control surfaces (e.g. an imported Stream
    // Deck/Companion button) that address program/preview independently of
    // this app's own PGM/PRV-vs-CUT bus-mode toggle, mirroring how a real ATEM
    // panel's dedicated PGM/PRV button rows behave regardless of transition style.
    setProgramInput(switcherId, input) {
      const switcher = this.getSwitcher(switcherId);

      if (!switcher) {
        return;
      }

      this.state.activeSwitcherId = switcher.id;
      const source = this.callbacks.normalizeSwitcherBusSource(input);
      const previousProgram = switcher.programInput;
      switcher.programInput = source;
      switcher.isFadeToBlackActive = source === "black";
      this.callbacks.beginAudioFadeForProgramChange(switcher, previousProgram, source);
      this.callbacks.render();
    }

    setPreviewInput(switcherId, input) {
      const switcher = this.getSwitcher(switcherId);

      if (!switcher) {
        return;
      }

      this.state.activeSwitcherId = switcher.id;
      switcher.previewInput = this.callbacks.normalizeSwitcherBusSource(input);
      this.callbacks.render();
    }

    toggleBusMode(switcherId) {
      const switcher = this.getSwitcher(switcherId);

      if (!switcher) {
        return;
      }

      switcher.busMode = this.callbacks.getSwitcherBusMode(switcher) === "cutBus" ? "pgmPrv" : "cutBus";
      this.state.activeSwitcherId = switcher.id;
      this.callbacks.render();
    }

    setTransitionDuration(switcherId, duration) {
      const switcher = this.getSwitcher(switcherId);
      const nextDuration = Number(duration);

      if (!switcher || ![0.5, 1, 1.5, 2].includes(nextDuration)) {
        return;
      }

      switcher.transitionDuration = nextDuration;
      this.state.activeSwitcherId = switcher.id;
      this.callbacks.render();
    }

    setStatus(switcherId, status, enabled) {
      const switcher = this.getSwitcher(switcherId);

      if (!switcher) {
        return;
      }

      if (status === "recording") {
        switcher.isRecording = enabled === "true";
      }

      if (status === "streaming") {
        switcher.isStreaming = enabled === "true";
      }

      this.state.activeSwitcherId = switcher.id;
      this.callbacks.render();
    }

    setMultiviewOutput(switcherId, mode, input = "") {
      const switcher = this.getSwitcher(switcherId);

      if (!switcher || !["multiview", "program", "preview", "clean", "input"].includes(mode)) {
        return;
      }

      switcher.multiviewMode = mode;
      switcher.multiviewInput = mode === "input"
        ? this.callbacks.clamp(Number(input), 1, Math.max(switcher.inputCount ?? 1, 1))
        : null;
      this.state.activeSwitcherId = switcher.id;
      this.callbacks.render();
    }

    setPipEnabled(switcherId, enabled) {
      const switcher = this.getSwitcher(switcherId);

      if (!switcher) {
        return;
      }

      switcher.pipEnabled = enabled === true || enabled === "true";
      switcher.pipPreset = this.callbacks.getSwitcherPipPreset(switcher);
      this.state.activeSwitcherId = switcher.id;
      this.callbacks.render();
    }

    setPipPreset(switcherId, presetId) {
      const switcher = this.getSwitcher(switcherId);

      if (!switcher || !this.callbacks.hasPipPreset(presetId)) {
        return;
      }

      switcher.pipPreset = presetId;
      this.state.activeSwitcherId = switcher.id;
      this.callbacks.render();
    }

    cut(switcherId) {
      const switcher = this.getSwitcher(switcherId);

      if (!switcher?.previewInput) {
        return;
      }

      this.state.activeSwitcherId = switcher.id;
      const previousProgram = switcher.programInput;
      switcher.programInput = switcher.previewInput;
      switcher.isFadeToBlackActive = switcher.programInput === "black";
      switcher.previewInput = previousProgram ?? switcher.previewInput;
      this.callbacks.beginAudioFadeForProgramChange(switcher, previousProgram, switcher.programInput);
      switcher.cutFlashing = true;
      this.callbacks.render();

      window.setTimeout(() => {
        switcher.cutFlashing = false;
        this.callbacks.render();
      }, 300);
    }

    auto(switcherId) {
      const switcher = this.getSwitcher(switcherId);

      if (!switcher?.previewInput || switcher.isTransitioning) {
        return;
      }

      this.state.activeSwitcherId = switcher.id;
      const previousProgram = switcher.programInput;
      const nextProgram = switcher.previewInput;
      const durationMs = this.callbacks.getSwitcherTransitionDurationMs(switcher);
      switcher.transition = {
        switcherId: switcher.id,
        fromInput: previousProgram,
        toInput: nextProgram,
        fromSource: previousProgram ? this.callbacks.getSwitcherInputSource(switcher, previousProgram) : null,
        toSource: this.callbacks.getSwitcherInputSource(switcher, nextProgram),
        durationMs
      };
      this.state.activeTransition = switcher.transition;
      switcher.isTransitioning = true;
      this.callbacks.render();

      window.setTimeout(() => {
        switcher.programInput = nextProgram;
        switcher.isFadeToBlackActive = nextProgram === "black";
        switcher.previewInput = previousProgram ?? switcher.previewInput;
        this.callbacks.beginAudioFadeForProgramChange(switcher, previousProgram, nextProgram);
        switcher.isTransitioning = false;
        switcher.transition = null;
        this.state.activeTransition = null;
        this.callbacks.render();
      }, durationMs);
    }

    fadeToBlack(switcherId) {
      const switcher = this.getSwitcher(switcherId);

      if (!switcher || switcher.isTransitioning) {
        return;
      }

      this.state.activeSwitcherId = switcher.id;
      const durationMs = this.callbacks.getSwitcherTransitionDurationMs(switcher);
      const blackSource = this.callbacks.getSwitcherMediaSource("black");

      if (switcher.isFadeToBlackActive || switcher.programInput === "black") {
        const nextProgram = switcher.fadeToBlackReturnInput ?? switcher.previewInput;

        if (!nextProgram || nextProgram === "black") {
          return;
        }

        switcher.transition = {
          switcherId: switcher.id,
          fromInput: "black",
          toInput: nextProgram,
          fromSource: blackSource,
          toSource: this.callbacks.getSwitcherInputSource(switcher, nextProgram),
          durationMs
        };
        this.state.activeTransition = switcher.transition;
        switcher.isTransitioning = true;
        switcher.isFadingToBlack = true;
        this.callbacks.render();

        window.setTimeout(() => {
          switcher.programInput = nextProgram;
          switcher.isFadeToBlackActive = false;
          switcher.isTransitioning = false;
          switcher.isFadingToBlack = false;
          switcher.transition = null;
          switcher.fadeToBlackReturnInput = null;
          this.state.activeTransition = null;
          this.callbacks.render();
        }, durationMs);

        return;
      }

      const previousProgram = switcher.programInput;
      this.callbacks.beginAudioFadeToBlack(switcher, durationMs);
      switcher.fadeToBlackReturnInput = previousProgram;
      switcher.transition = {
        switcherId: switcher.id,
        fromInput: previousProgram,
        toInput: "black",
        fromSource: previousProgram ? this.callbacks.getSwitcherInputSource(switcher, previousProgram) : null,
        toSource: blackSource,
        durationMs
      };
      this.state.activeTransition = switcher.transition;
      switcher.isTransitioning = true;
      switcher.isFadingToBlack = true;
      switcher.isFadeToBlackActive = false;
      this.callbacks.render();

      window.setTimeout(() => {
        switcher.programInput = "black";
        switcher.isFadeToBlackActive = true;
        switcher.isTransitioning = false;
        switcher.isFadingToBlack = false;
        switcher.transition = null;
        this.state.activeTransition = null;
        this.callbacks.render();
      }, durationMs);
    }
  }

  window.BroadcastAtem = {
    AtemController
  };
})();
