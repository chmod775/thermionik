class Plug extends CBlock {
  constructor(name) {
    super(name);
    this.id = null;
    this.block = null;
    this.isPlate = false;
  }
  
  SetBlock(block) { this.block = block; }

  Init() {
    this.id = this.configs.id;
  }
}

class PlugPlate extends Plug {
  constructor() {
    super("PlugPlate");
    this.isPlate = true;
  }

  Init() {
    super.Init();
    this.SetPins(
      [
        PinGrid.Create('ToPlate', this.configs.type, this.configs.init),
        PinPlate.Create(this.id, this.configs.type, this.configs.init)
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
}

class PlugGrid extends Plug {
  constructor() {
    super("PlugGrid");
    this.isPlate = false;
  }

  Init() {
    super.Init();
    this.SetPins(
      [
        PinGrid.Create(this.id, this.configs.type, this.configs.init),
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
}