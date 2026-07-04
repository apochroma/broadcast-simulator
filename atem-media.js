(function () {
  class AtemMediaPoolController {
    constructor({ callbacks, config, elements, state }) {
      this.callbacks = callbacks;
      this.config = config;
      this.elements = elements;
      this.state = state;
    }

    open(switcherId, playerId) {
      const switcher = this.callbacks.getNode(switcherId);

      if (switcher?.type !== "switcher" || !["mp1", "mp2"].includes(playerId)) {
        return;
      }

      this.callbacks.selectPreview(switcherId, playerId);
      this.callbacks.ensureSwitcherMediaPools(switcher);
      this.state.activeMediaPool = { switcherId, playerId };
      this.state.pendingMediaPoolImage = null;
      this.updateCursor();
      this.renderDialog();
      this.elements.dialog?.showModal();
    }

    close() {
      this.state.activeMediaPool = null;
      this.state.pendingMediaPoolImage = null;
      this.updateCursor();
      if (this.elements.dialog?.open) {
        this.elements.dialog.close();
      }
    }

    getActivePool() {
      const activePool = this.state.activeMediaPool;
      const switcher = activePool ? this.callbacks.getNode(activePool.switcherId) : null;

      if (switcher?.type !== "switcher" || !["mp1", "mp2"].includes(activePool.playerId)) {
        return null;
      }

      this.callbacks.ensureSwitcherMediaPools(switcher);
      return {
        switcher,
        playerId: activePool.playerId,
        pool: switcher.mediaPools[activePool.playerId]
      };
    }

    renderDialog() {
      const { dialog, grid, heading } = this.elements;

      if (!dialog || !grid || !heading) {
        return;
      }

      const activePool = this.getActivePool();

      if (!activePool) {
        grid.innerHTML = "";
        return;
      }

      const { switcher, playerId, pool } = activePool;
      heading.textContent = `${switcher.title} ${playerId.toUpperCase()}`;
      grid.innerHTML = pool.slots.map((slot, index) => this.renderSlot(slot, index, pool.selectedSlot === index)).join("");
    }

    renderSlot(slot, index, isSelected) {
      const slotContent = slot
        ? `<img src="${slot.url}" alt="${slot.name}"><span>${index + 1}</span>`
        : `<strong>${index + 1}</strong><em>Leer</em>`;

      return `
        <button class="media-pool-slot ${isSelected ? "is-selected" : ""} ${slot ? "has-media" : ""}"
          type="button"
          data-action="set-media-pool-slot"
          data-slot-index="${index}"
          aria-pressed="${isSelected}">
          ${slotContent}
        </button>
      `;
    }

    async createImageMediaFromFile(file) {
      return {
        kind: "image",
        name: file.name,
        url: await this.callbacks.fileToDataUrl(file)
      };
    }

    async preparePendingImage(file) {
      if (!file?.type.startsWith("image/")) {
        return;
      }

      this.state.pendingMediaPoolImage = await this.createImageMediaFromFile(file);
      this.updateCursor();
    }

    async putImageInSlot(slotIndex, fileOrMedia = this.state.pendingMediaPoolImage) {
      const activePool = this.getActivePool();

      if (!activePool || !Number.isInteger(slotIndex)) {
        return;
      }

      const media = typeof File !== "undefined" && fileOrMedia instanceof File
        ? await this.createImageMediaFromFile(fileOrMedia)
        : fileOrMedia;

      if (!media) {
        activePool.pool.selectedSlot = this.callbacks.clamp(slotIndex, 0, this.config.slotCount - 1);
        this.callbacks.render();
        return;
      }

      activePool.pool.slots[slotIndex] = { ...media };
      activePool.pool.selectedSlot = slotIndex;
      this.state.pendingMediaPoolImage = null;
      this.updateCursor();
      this.callbacks.render();
    }

    updateCursor(event = null) {
      const cursor = this.elements.cursor;

      if (!cursor) {
        return;
      }

      const media = this.state.pendingMediaPoolImage;
      cursor.classList.toggle("is-hidden", !media);

      if (!media) {
        cursor.innerHTML = "";
        return;
      }

      cursor.innerHTML = `<img src="${media.url}" alt="">`;
      if (event) {
        cursor.style.transform = `translate(${event.clientX + 16}px, ${event.clientY + 16}px)`;
      }
    }

    handleDialogClose() {
      this.state.activeMediaPool = null;
      this.state.pendingMediaPoolImage = null;
      this.updateCursor();
    }

    openFilePicker() {
      this.elements.fileInput?.click();
    }

    async handleFileInputChange(event) {
      const file = event.target.files?.[0];

      if (file) {
        await this.preparePendingImage(file);
      }

      event.target.value = "";
    }

    handleGridClick(event) {
      const slot = event.target.closest("[data-action='set-media-pool-slot']");

      if (!slot) {
        return;
      }

      this.putImageInSlot(Number(slot.dataset.slotIndex));
    }

    handleGridDragOver(event) {
      if (!event.dataTransfer?.types.includes("Files")) {
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }

    async handleGridDrop(event) {
      const slot = event.target.closest("[data-action='set-media-pool-slot']");
      const file = event.dataTransfer?.files?.[0];

      if (!slot || !file?.type.startsWith("image/")) {
        return;
      }

      event.preventDefault();
      await this.putImageInSlot(Number(slot.dataset.slotIndex), file);
    }
  }

  window.BroadcastAtemMedia = {
    AtemMediaPoolController
  };
})();
