class Plug extends CBlock {
  constructor(name, isPlate) {
    super(name);
    this.isPlate = isPlate;
  }

  SetPins(pins) {
    let platePins = Pin.FilterPlatePins(pins);
    let gridPins = Pin.FilterGridPins(pins);

    if (this.isPlate && (platePins.length > 0)) { console.error("Plate plug can contain ONLY grid pins."); return null; }
    if (!this.isPlate && (gridPins.length > 0)) { console.error("Grid plug can contain ONLY plate pins."); return null; }

    super.SetPins(pins);
  }
}

class PlugPlate extends Plug {
  constructor() {
    super("PlugPlate", true);
  }

  Init() {
    this.SetPins(
      [
        PinGrid.Create('ToPlate', this.configs.type, this.configs.init),
      ]
    );
  }
  
  static DefaultConfigs() {
    return {
      id: `plate_${this.guid}`,
      type: 'bool',
      init: 'false'
    }
  }

  AsPin() { return PinPlate.Create(this.configs.id, this.configs.type, this.configs.init); }
}

class PlugGrid extends Plug {
  constructor() {
    super("PlugGrid", false);
  }

  Init() {
    this.SetPins(
      [
        PinPlate.Create('FromGrid', this.configs.type, this.configs.init)
      ]
    );
  }

  static DefaultConfigs() {
    return {
      id: `grid_${this.guid}`,
      type: 'bool',
      init: 'false'
    }
  }

  AsPin() { return PinGrid.Create(this.configs.id, this.configs.type, this.configs.init); }
}