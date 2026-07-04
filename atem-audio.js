(function () {
  class AtemAudioController {
    constructor({ callbacks }) {
      this.callbacks = callbacks;
    }

    getSwitcher(switcherId) {
      const switcher = this.callbacks.getNode(switcherId);
      return switcher?.type === "switcher" ? switcher : null;
    }

    setSourceMode(switcherId, input, mode) {
      const switcher = this.getSwitcher(switcherId);

      if (!switcher) {
        return;
      }

      this.callbacks.ensureSwitcherAudioState(switcher);
      if (mode === "reset") {
        switcher.audio.faders[input] = 0;
        switcher.audio.channelFaders[input] = this.callbacks.createAudioChannelFaderState();
        switcher.audio.gains[input] = 0;
      } else {
        switcher.audio.sources[input] = mode;
      }
      this.callbacks.showAudioMeter(switcherId, input);
      this.callbacks.render();
    }

    setInputChannelFader(switcherId, input, channel, value) {
      const switcher = this.getSwitcher(switcherId);

      if (!switcher) {
        return;
      }

      this.callbacks.ensureSwitcherAudioState(switcher);
      const channelFader = this.callbacks.getSwitcherInputChannelFaders(switcher, input);
      this.callbacks.updateChannelFaderState(channelFader, channel, value);
      switcher.audio.faders[input] = Math.round(((channelFader.left + channelFader.right) / 2) * 10) / 10;
      this.callbacks.showAudioMeter(switcherId, input, { autoHide: false });
      this.callbacks.renderAudioMeterPopover();
    }

    toggleInputFaderLock(switcherId, input) {
      const switcher = this.getSwitcher(switcherId);

      if (!switcher) {
        return;
      }

      this.callbacks.ensureSwitcherAudioState(switcher);
      const channelFader = this.callbacks.getSwitcherInputChannelFaders(switcher, input);
      channelFader.locked = !channelFader.locked;
      switcher.audio.faders[input] = Math.round(((channelFader.left + channelFader.right) / 2) * 10) / 10;
      this.callbacks.showAudioMeter(switcherId, input, { autoHide: false });
      this.callbacks.renderAudioMeterPopover();
    }

    toggleMicFaderLock(switcherId, micId) {
      const switcher = this.getSwitcher(switcherId);

      if (!switcher) {
        return;
      }

      this.callbacks.ensureSwitcherAudioState(switcher);
      const channelFader = this.callbacks.getSwitcherMicFaders(switcher, micId);
      channelFader.locked = !channelFader.locked;
      this.callbacks.showAudioMeter(switcherId, micId, { kind: "mic", autoHide: false });
      this.callbacks.renderAudioMeterPopover();
    }

    adjustInputFader(switcherId, input, direction) {
      const switcher = this.getSwitcher(switcherId);

      if (!switcher) {
        return;
      }

      const delta = direction === "up" ? 0.1 : -0.1;
      this.callbacks.setSwitcherInputFader(
        switcher,
        input,
        this.callbacks.getSwitcherInputFader(switcher, input) + delta
      );
      this.callbacks.showAudioMeter(switcherId, input, { autoHide: true });
      this.callbacks.render();
    }

    setMicMode(switcherId, micId, mode) {
      const switcher = this.getSwitcher(switcherId);

      if (!switcher) {
        return;
      }

      this.callbacks.ensureSwitcherAudioState(switcher);
      switcher.audio.mics[micId] = mode;
      this.callbacks.showAudioMeter(switcherId, micId, { kind: "mic" });
      this.callbacks.render();
    }

    adjustMicFader(switcherId, micId, direction) {
      const switcher = this.getSwitcher(switcherId);

      if (!switcher) {
        return;
      }

      const delta = direction === "up" ? 0.1 : -0.1;
      const channelFader = this.callbacks.getSwitcherMicFaders(switcher, micId);
      const minDelta = -60 - Math.min(channelFader.left, channelFader.right);
      const maxDelta = 6 - Math.max(channelFader.left, channelFader.right);
      const safeDelta = this.callbacks.clamp(delta, minDelta, maxDelta);
      channelFader.left = Math.round((channelFader.left + safeDelta) * 10) / 10;
      channelFader.right = Math.round((channelFader.right + safeDelta) * 10) / 10;
      this.callbacks.showAudioMeter(switcherId, micId, { kind: "mic", autoHide: true });
      this.callbacks.render();
    }

    setMicChannelFader(switcherId, micId, channel, value) {
      const switcher = this.getSwitcher(switcherId);

      if (!switcher) {
        return;
      }

      this.callbacks.ensureSwitcherAudioState(switcher);
      this.callbacks.updateChannelFaderState(this.callbacks.getSwitcherMicFaders(switcher, micId), channel, value);
      this.callbacks.showAudioMeter(switcherId, micId, { kind: "mic", autoHide: false });
      this.callbacks.renderAudioMeterPopover();
    }

    setHeadphoneMode(switcherId, mode) {
      const switcher = this.getSwitcher(switcherId);

      if (!switcher) {
        return;
      }

      this.callbacks.ensureSwitcherAudioState(switcher);
      if (mode === "reset") {
        switcher.audio.headphone.fader = 0;
        switcher.audio.headphone.muted = false;
      } else if (mode === "mute") {
        switcher.audio.headphone.muted = !switcher.audio.headphone.muted;
      }
      this.callbacks.showAudioMeter(switcherId, "headphone", { kind: "headphone" });
      this.callbacks.render();
    }

    adjustHeadphoneFader(switcherId, direction) {
      const switcher = this.getSwitcher(switcherId);

      if (!switcher) {
        return;
      }

      const delta = direction === "up" ? 0.1 : -0.1;
      this.setHeadphoneFader(switcherId, this.callbacks.getSwitcherHeadphoneFader(switcher) + delta);
      this.callbacks.showAudioMeter(switcherId, "headphone", { kind: "headphone", autoHide: true });
      this.callbacks.render();
    }

    setHeadphoneFader(switcherId, value) {
      const switcher = this.getSwitcher(switcherId);

      if (!switcher) {
        return;
      }

      this.callbacks.ensureSwitcherAudioState(switcher);
      switcher.audio.headphone.fader = this.callbacks.clamp(Math.round(Number(value) * 10) / 10, -60, 6);
      this.callbacks.showAudioMeter(switcherId, "headphone", { kind: "headphone", autoHide: false });
      this.callbacks.renderAudioMeterPopover();
    }

    setAudioGain(switcher, kind, input, gain) {
      if (kind === "mic") {
        this.callbacks.setSwitcherMicGain(switcher, input, gain);
        return;
      }

      this.callbacks.setSwitcherInputGain(switcher, Number(input), gain);
    }

    getAudioGain(switcher, kind, input) {
      return kind === "mic"
        ? this.callbacks.getSwitcherMicGain(switcher, input)
        : this.callbacks.getSwitcherInputGain(switcher, Number(input));
    }
  }

  window.BroadcastAtemAudio = {
    AtemAudioController
  };
})();
