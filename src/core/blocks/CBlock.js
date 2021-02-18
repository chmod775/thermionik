class CBlockCode {
  constructor() {
    this.content = '';
    this.asJS = false;
  }
}

class CBlock extends Block {
  constructor(name) {
    super(name);

    this._lang = 'C';

    this.requirements = [];

    this.pins = [];
  }

  SetPins(pins) {
    if (this.plugConfigs) {
      let platePins = Pin.FilterPlatePins(pins);
      let gridPins = Pin.FilterGridPins(pins);
  
      if (this.plugConfigs.isPlate && (platePins.length > 0)) { console.error(this, "Plate plug can contain ONLY grid pins."); return null; }
      if (!this.plugConfigs.isPlate && (gridPins.length > 0)) { console.error(this, "Grid plug can contain ONLY plate pins."); return null; }
    }

    this.pins = pins;

    this.pin = { plate: {}, plates: [], grid: {}, grids: [] };

    for (var p of this.pins) {
      p.SetBlock(this);
      this.pin[p.name] = p;
      if (p.isPlate) {
        this.pin.plate[p.name] = p;
        this.pin.plates.push(p);
      } else {
        this.pin.grid[p.name] = p;
        this.pin.grids.push(p);
      }
    }
  }

  GenerateSource() {
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

  /* ### Requirements ### */
  InitCode() { console.error("InitCode NOT IMPLEMENTED."); return TODO; }
  SetupCode() { console.error("SetupCode NOT IMPLEMENTED."); return TODO; }
  LoopCode() { console.error("LoopCode NOT IMPLEMENTED."); return TODO; }
  Data() { return []; }
}

class CPlug_Plate extends CBlock {
  constructor(name) {
    super(name);
    this.plugConfigs = { isPlate: true };
  }
}

class CPlug_Grid extends CBlock {
  constructor(name) {
    super(name);
    this.plugConfigs = { isPlate: false };
  }
}

CBlock.PlatePlug = CPlug_Plate;
CBlock.GridPlug = CPlug_Grid;