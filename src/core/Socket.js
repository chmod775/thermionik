class Socket extends CBlock {
  constructor(name, isPlate) {
    super(name);
    this.plugConfigs = { isPlate: isPlate };
  }

  ExternalPins() { console.error("ExternalPins NOT IMPLEMENTED."); return null; }
}