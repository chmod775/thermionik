class CBlockCode {
  constructor() {
    this.content = '';
    this.asJS = false;
  }
}

class CBlock extends Block {
  static lang() { return 'CBlock' };
  $Prefix() { return 'b' };

  constructor(name, advanced) {
    super(name);

    this.author = 'TROMBETTA';
    this.advanced = (advanced != false);
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

    this.pin.plates = this.pin.plates.filter(p => p.name != pName);
    this.pin.grids = this.pin.grids.filter(p => p.name != pName);
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

  $GenerateClass() {
    let generator = new JSGenerator();

    if (this.advanced) {

    } else {
      let genConstructorCode = generator.GenerateFunctionCall('super', [ generator.StringLiteral(this.name), false ], false);
      let genConstructorFunction = generator.GenerateFunction('constructor', null, [], genConstructorCode);
  
      // Author
      let genAuthorAssignmentCode = generator.GenerateAssignment(
        generator.StringLiteral(this.author),
        'this.author'
      );

      // Pins
      let genPinsComment = generator.GenerateComment('### PINS ###');
      let genInitPins = [];
      let genAddPins = [];

      for (var pg of this.pin.grids) {
        let pgId = `p_${pg.name}`;
        let pgArgs = [
          generator.StringLiteral(pg.name),
          generator.StringLiteral(pg.type),
          generator.StringLiteral(pg.init)
        ];
        let genPinCreatorCode = generator.GenerateConst(
          pgId,
          '',
          generator.AccessDirect(
            pg.constructor.name,
            generator.GenerateFunctionCall('Create', pgArgs, false)
          )
        );
        genInitPins.push(genPinCreatorCode);
        genAddPins.push(pgId);
      }

      for (var pp of this.pin.plates) {
        let ppId = `p_${pp.name}`;
        let ppArgs = [
          pp.name,
          pp.type,
          pp.init
        ];
        let genPinCreatorCode = generator.GenerateConst(
          ppId,
          '',
          generator.AccessDirect(
            pp.constructor.name,
            generator.GenerateFunctionCall('Create', ppArgs, false)
          )
        );
        genInitPins.push(genPinCreatorCode);
        genAddPins.push(ppId);
      }

      let genInitPinsCode = genInitPins.join('\n');
      let genAddPinsCode = generator.GenerateFunctionCall('this.AddPin', [ `[${genAddPins.join(', ')}]` ]);

      // Init function
      let genInitFunctionCode = [
        genAuthorAssignmentCode,
        null,
        genPinsComment,
        genInitPinsCode,
        genAddPinsCode
      ].join('\n');
      let genInitFunction = generator.GenerateFunction('$Init', null, [], genInitFunctionCode);

      // Init code
      let genInitCode = (this.InitCode instanceof Function) ? this.InitCode() : this.InitCode;
      let genInitCodeFunction = generator.GenerateFunction(
        'InitCode',
        '',
        [],
        genInitCode ? generator.GenerateFunctionReturn(
          JSON.stringify(genInitCode)
        ) : ''
      );

      // Setup code
      let genSetupCode = (this.SetupCode instanceof Function) ? this.SetupCode() : this.SetupCode;
      let genSetupCodeFunction = generator.GenerateFunction(
        'SetupCode',
        '',
        [],
        genSetupCode ? generator.GenerateFunctionReturn(
          JSON.stringify(genSetupCode)
        ) : ''
      );

      // Loop code
      let genLoopCode = (this.LoopCode instanceof Function) ? this.LoopCode() : this.LoopCode;
      let genLoopCodeFunction = generator.GenerateFunction(
        'LoopCode',
        '',
        [],
        genLoopCode ? generator.GenerateFunctionReturn(
          JSON.stringify(genLoopCode)
        ) : ''
      );

      // Data
      let genDataContent = ((this.Data instanceof Function) ? this.Data() : this.Data) ?? [];
      let genDataOBJ = JSON.stringify(genDataContent).replace(/"(\w+)"\s*:/g, '$1:');
      let genDataCode = generator.GenerateFunction(
        'Data',
        '',
        [],
        generator.GenerateFunctionReturn(genDataOBJ)
      );

      // Default Settings
      let genDefSettingsContent = this.constructor.$DefaultSettings() ?? {};
      let genDefSettingsOBJ = JSON.stringify(genDefSettingsContent).replace(/"(\w+)"\s*:/g, '$1:');
      let genDefSettingsCode = generator.GenerateFunction(
        '$DefaultSettings',
        'static',
        [],
        generator.GenerateFunctionReturn(genDefSettingsOBJ)
      );

      // Default Configs
      let genDefConfigsContent = this.constructor.$DefaultConfigs() ?? {};
      let genDefConfigsOBJ = JSON.stringify(genDefConfigsContent).replace(/"(\w+)"\s*:/g, '$1:');
      let genDefConfigsCode = generator.GenerateFunction(
        '$DefaultConfigs',
        'static',
        [],
        generator.GenerateFunctionReturn(genDefConfigsOBJ)
      );

      // Class
      let genClassCode = [
        genConstructorFunction,
        genInitFunction,

        genDataCode,

        genInitCodeFunction,
        genSetupCodeFunction,
        genLoopCodeFunction,

        genDefSettingsCode,
        genDefConfigsCode
      ].join('\n');

      let genClassName = `CBlock_${this.name.replace(/\W/g, '')}`;
      let genClass = generator.GenerateClass(genClassName, 'CBlock', genClassCode);

      return `(${genClass})`;
    }
  }

  /* ### Utilities ### */
  IsGridPlug() {
    let hasPlates = this.pin.plates.length > 0;
    let hasGrids = this.pin.grids.length > 0;
    return (hasPlates && !hasGrids);
  }

  IsPlatePlug() {
    let hasPlates = this.pin.plates.length > 0;
    let hasGrids = this.pin.grids.length > 0;
    return (!hasPlates && hasGrids);
  }

  IsValidPlug() {
    return this.IsGridPlug() || this.IsPlatePlug();
  }

  $GenerateGUID() {
    if (this.IsValidPlug()) {
      console.log(this.properties);
      return (this.IsPlatePlug() ? 'PP_' : 'PG_') + this.properties.row;
    } else {
      return Helpers.posToRef(this.properties);
    }
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
    super(name, true);
  }

  $ExternalPins() { console.error("$ExternalPins NOT IMPLEMENTED."); return null; }
}

CBlock.Socket = CSocket;

CBlock.Step = null;