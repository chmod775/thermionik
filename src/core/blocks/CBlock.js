class CBlockCode {
  constructor() {
    this.content = '';
    this.asJS = false;
  }
}

class CBlock extends Block {
  static lang() { return 'CBlock' };
  $Prefix() { return 'b' };

  constructor(name) {
    super(name);

    this.requirements = [];

    this.pin = { plate: {}, plates: [], grid: {}, grids: [] };
  }

  $Deinit() {
    for (var p of this.pin.plates) {
      if (p.wire)
        p.wire.DisconnectPin(p);
    }
    for (var p of this.pin.grids) {
      if (p.wire)
        p.wire.DisconnectPin(p);
    }
  }

  AddPin(pin) {
    if (Array.isArray(pin)) {
      for (var p of pin)
        this.AddPin(p);
      return;
    }

    pin.SetBlock(this);

    let pName = pin.name;

    this.pin[pName] = pin;
    if (pin.isPlate) {
      this.pin.plate[pName] = pin;
      this.pin.plates.push(pin);
    } else {
      this.pin.grid[pName] = pin;
      this.pin.grids.push(pin);
    }
  }

  RemovePin(pin) {
    if (Array.isArray(pin)) {
      for (var p of pin)
        this.RemovePin(p);
      return;
    }

    pin.SetBlock(null);

    let pName = pin.name;
    delete this.pin[pName];
    delete this.pin.plate[pName];
    delete this.pin.grids[pName];

    this.pin.plates = this.pin.plates.filter(p => p != pin);
    this.pin.grids = this.pin.grids.filter(p => p != pin);
  }

  $GenerateSource() {
    let uName = this.UniqueName();

    let platePins = this.pin.plates;
    let gridPins = this.pin.grids;

    // Generate header comment
    let genHeaderComment = mainGenerator.GenerateComment(`##### block ${uName} by ${this.author || 'Anonymous'} #####`);

    // Generate init code
    let genInitCode = (this.InitCode instanceof Function) ? this.InitCode() : this.InitCode;

    // Generate data structure
    let genDataName = `_s_data_${uName}`;
    let genDataStructure = mainGenerator.GenerateStructure(genDataName, (this.Data instanceof Function) ? this.Data() : this.Data);

    // Generate outputs structure
    let genOutputsElements = [];
    for (var po of platePins) {
      genOutputsElements.push( {
        name: po.name,
        type: po.type
      });
    }
    let genOutputsName = `_s_outputs_${uName}`;
    let genOutputsStructure = mainGenerator.GenerateStructure(genOutputsName, genOutputsElements);

    // Generate instance structure
    let genInstanceElements = [
      { name: 'data', type: genDataName },
      { name: 'outputs', type: genOutputsName }
    ];
    let genInstanceName = `_s_instance_${uName}`;
    let genInstanceStructure = mainGenerator.GenerateStructure(genInstanceName, genInstanceElements);

    // Generate setup code
    let genSetupCodeName = `setup_${uName}`;
    let genSetupCode = (this.SetupCode instanceof Function) ? this.SetupCode() : this.SetupCode;
    let genSetupCodeParameters = [];
    genSetupCodeParameters.push({
      name: 'data',
      type: `${genDataName}*`
    });

    let genSetupCodeFunction = mainGenerator.GenerateFunction(
      genSetupCodeName,   // Name
      'void',                 // Return type
      genSetupCodeParameters, // Parameters
      genSetupCode || ''      // SetupCode
    );

    // Generate loop code
    let genLoopCodeName = `loop_${uName}`;
    let genLoopCode = (this.LoopCode instanceof Function) ? this.LoopCode() : this.LoopCode;
    let genLoopCodeParameters = [];
    genLoopCodeParameters.push({
      name: 'data',
      type: `${genDataName}*`
    });
    for (var pi of gridPins) {
      genLoopCodeParameters.push({
        name: pi.name,
        type: pi.type
      });
    }
    for (var po of platePins) {
      genLoopCodeParameters.push({
        name: po.name,
        type: `${po.type}*`
      });
    }

    let genLoopCodeFunction = mainGenerator.GenerateFunction(
      genLoopCodeName,    // Name
      'void',                 // Return type
      genLoopCodeParameters,  // Parameters
      genLoopCode || ''       // LoopCode
    );

    // Join generated parts
    let genSource = [
      genHeaderComment,
      
      genDataStructure,
      genOutputsStructure,
      
      genInstanceStructure,

      genSetupCodeFunction,
      genLoopCodeFunction
    ].join('\n');

    return {
      source: genSource,
      codes: {
        init: BlockCode.Create('init', genInitCode),

        dataStructure: BlockCode.Create(genDataName, genDataStructure),
        outputsStructure: BlockCode.Create(genOutputsName, genOutputsStructure),
        
        instanceStructure: BlockCode.Create(genInstanceName, genInstanceStructure),

        setupFunction: BlockCode.Create(genSetupCodeName, genSetupCodeFunction),
        loopFunction: BlockCode.Create(genLoopCodeName, genLoopCodeFunction)
      }
    }
  }

  /* ### Utilities ### */
  IsGridPlug() {
    let hasPlates = this.pin.plates.length > 0;
    let hasGrids = this.pin.grids.length > 0;
    return (!hasPlates && hasGrids);
  }

  IsPlatePlug() {
    let hasPlates = this.pin.plates.length > 0;
    let hasGrids = this.pin.grids.length > 0;
    return (hasPlates && !hasGrids);
  }

  IsValidPlug() {
    return this.IsGridPlug() || this.IsPlatePlug();
  }

  /* ### Requirements ### */
  InitCode() {
    console.error("InitCode NOT IMPLEMENTED."); return TODO;
  }
  SetupCode() { console.error("SetupCode NOT IMPLEMENTED."); return TODO; }
  LoopCode() { console.error("LoopCode NOT IMPLEMENTED."); return TODO; }
  Data() { return []; }
}

class CSocket extends CBlock {
  constructor(name) {
    super(name);
  }

  $ExternalPins() { console.error("$ExternalPins NOT IMPLEMENTED."); return null; }
}

CBlock.Socket = CSocket;

CBlock.Step = null;