class PlateSocket extends CBlock.MaleSocket {
  constructor() {
    super("PlateSocket", true);
  }

  $Init() {
    this.AddPin(
      [
        GridPin.Create('ToPlate', this.configs.type, this.configs.init),
      ]
    );
  }
  
  static $DefaultConfigs() {
    return {
      id: `plate_${this.guid}`,
      type: 'bool',
      init: 'false'
    }
  }

  $ExternalPins() { return [ PlatePin.Create(this.configs.id, this.configs.type, this.configs.init) ]; }

  $GenerateConnection(toPin) {
    return null;
  }

  $GenerateSource() {
    let toPlatePin = this.pin.ToPlate;
    let pinWire = toPlatePin.wire;

    var source = toPlatePin.init;

    if (pinWire != null) {
      let srcPlate = pinWire.platePin;
      
      if (srcPlate.block instanceof CBlock.Socket) {
        source = srcPlate.block.$GenerateConnection(srcPlate);
        //source = srcPlate.block.configs.id;
      } else {
        source = mainGenerator.AccessDirect(
          mainGenerator.AccessDirect(
            mainGenerator.AccessIndirect('data', srcPlate.block.guid),
            'outputs'
          ),
          srcPlate.name
        );
      }
    }

    let genMarshalledPlate = mainGenerator.GenerateAssignment(
      source,
      mainGenerator.AccessReference(this.configs.id)
    );

    return {
      source: genMarshalledPlate
    };
  }
}

class GridSocket extends CBlock.FemaleSocket {
  constructor() {
    super("GridSocket", false);
  }

  $Init() {
    this.AddPin(
      [
        PlatePin.Create('FromGrid', this.configs.type, this.configs.init)
      ]
    );
  }

  static $DefaultConfigs() {
    return {
      id: `grid_${this.guid}`,
      type: 'bool',
      init: 'false'
    }
  }

  $ExternalPins() { return [ GridPin.Create(this.configs.id, this.configs.type, this.configs.init) ]; }

  $GenerateSource() {
    return null;
  }

  $GenerateConnection(toPin) {
    return this.configs.id;
  }
}


class StepDefaultPlateSocket extends CBlock.MaleSocket {
  constructor() {
    super("StepDefaultPlateSocket", true);
  }

  $Init() {
    this.AddPin(
      []
    );
  }

  static $DefaultConfigs() {
    return {
      id: `StepDefaultPlateSocket`,
      exits: []
    };
  }

  $ExternalPins() {
    return [
      PlatePin.Create('IsActive', 'bool', 'false')
    ];
  }

  $GenerateSource() {
    let genCode = `
      *IsActive = data->active;
      if (${this.configs.exits.map(e => mainGenerator.AccessReference(e)).join(' || ')}) data->active = false;
    `;

    return {
      source: genCode
    };
  }
}

class StepDefaultGridSocket extends CBlock.FemaleSocket {
  constructor() {
    super("StepDefaultGridSocket", false);
  }

  $Init() {
    this.AddPin(
      [
        PlatePin.Create('Active', 'bool', 'false'),
        PlatePin.Create('EntryShot', 'bool', 'false'),
        PlatePin.Create('ExitShot', 'bool', 'false')
      ]
    );
  }

  static $DefaultConfigs() {
    return {
      id: `StepDefaultGridSocket`
    };
  }

  $ExternalPins() {
    return [
      GridPin.Create('Activate', 'bool', 'false')
    ];
  }

  $GenerateSource() {
    let genCode = `
      bool Active = Activate;
      bool EntryShot = !data->active && Activate;
      bool ExitShot = data->active && !Activate;
      if (Active) data->active = true;
    `;

    return {
      source: genCode
    };
  }

  $GenerateConnection(toPin) {
    return toPin.name;
  }
}
