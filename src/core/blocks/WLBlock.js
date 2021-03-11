class WLInternalSocket extends CBlock.Socket {
  constructor(name, isPlate) {
    super(name, isPlate);
  }
}

class PlateSocket extends WLInternalSocket {
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
}

class GridSocket extends WLInternalSocket {
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
}

class WLBlock extends CBlock {
  static lang() { return 'WLBlock' };

  constructor(name) {
    super(name);
  
    this.plug = { plate: {}, plates: [], grid: {}, grids: [] };

    this.blocks = [];
    this.wires = [];

    this.dependencies = {};
  }

  AddBlock(block) {
    if (Array.isArray(block)) {
      for (var b of block)
        this.AddBlock(b);
      return;
    }

    this.blocks.push(block);
  }

  RemoveBlock(block) {
    if (Array.isArray(block)) {
      for (var b of block)
        this.RemoveBlock(b);
      return;
    }

    block.Destroy();

    this.blocks = this.blocks.filter(t => !t.IsEqual(block));
    this.CleanEmptyWires();
  }

  /* ### Plugs management ### */
  AddPlug(plug) {
    if (Array.isArray(plug)) {
      for (var p of plug)
        this.AddPlug(p);
      return;
    }

    if (!plug.IsValidPlug()) { console.error("Block is not a valid Plug.", plug); return null; }

    let pId = plug.configs.id ?? plug.guid;

    this.plug[pId] = plug;
    if (plug.IsPlatePlug()) {
      this.plug.plate[pId] = plug;
      this.plug.plates.push(plug);
    } else {
      this.plug.grid[pId] = plug;
      this.plug.grids.push(plug);
    }

    // Plug is also a Socket
    if (plug instanceof CSocket)
      this.AddPin(plug.$ExternalPins());
  }

  RemovePlug(plug) {
    if (Array.isArray(plug)) {
      for (var p of plug)
        this.RemovePlug(p);
      return;
    }

    let pId = plug.configs.id ?? plug.guid;

    delete this.plug[pId];
    delete this.plug.plate[pId];
    delete this.plug.grids[pId];

    this.plug.plates = this.plug.plates.filter(p => p.guid != plug.guid);
    this.plug.grids = this.plug.grids.filter(p => p.guid != plug.guid);

    // Plug is also a Socket
    if (plug instanceof CSocket)
      this.RemovePin(plug.$ExternalPins());
  }

  /* ### Wirings ### */
  CleanEmptyWires() {
    this.wires = this.wires.filter(w => (w.platePin != null) || (w.gridPins.length > 0));
  }

  ConnectWire(items) {
    // Get pins from items (direct Pin or Plugs)
    let pins = [];
    for (var i of items) {
      if (i instanceof Pin) pins.push(i);
      if (i instanceof WLInternalSocket) {
        if (i.IsPlatePlug())
          pins.push(i.pin.grids[0]);
        else
          pins.push(i.pin.plates[0]);
      }
    }

    // Search plate and grids in pins
    let foundPlates = [];
    let foundGrids = [];

    for (var p of pins) {
      if (!this.blocks.includes(p.block))
        if (!this.plug.plates.includes(p.block))
          if (!this.plug.grids.includes(p.block))
            { console.error("Pin block's is not present in blocks list.", p.block, p); return null; }

      if (p.isPlate)
        foundPlates.push(p);
      else
        foundGrids.push(p);
    }

    if (foundPlates.length > 1) { console.error("Multiple Plates found."); return null; }
    let foundPlate = foundPlates[0] ?? null;

    // Get already connected wire (if present)
    var destWire = null;
    for (var g of foundGrids) { // If connected to Grids
      if (g.wire != null) {
        destWire = destWire ?? g.wire;
        if (destWire != g.wire) { console.error("WTF? This is not supposed to happen."); return null; }
      }
    }
    if (destWire == null) {
      destWire = foundPlate.wire; // If connected to Plate

      if (destWire == null) { // Create new one if not connected
        if (foundPlate == null) { console.error("New wire require a Plate."); return null; }
        destWire = new Wire(foundPlate);
      }
    }

    if (destWire.gridPins.length == 0)
      if (foundGrids.length == 0) { console.error("New wire require at least 1 Grid."); return null; }

    // Attach Plate to Wire
    if (foundPlate) {
      if (destWire.platePin)
        if (destWire.platePin != foundPlate) { console.error("Wire already connected to a Plate."); return null; }
      destWire.SetPlate(foundPlate);
    }

    // Attach Grids to Wire
    for (var pg of foundGrids)
      destWire.ConnectGrid(pg);

    // Add to wires list
    if (!this.wires.includes(destWire))
      this.wires.push(destWire);

    // Return wire
    return destWire;
  }

  $GenerateSource() {
    let uName = this.UniqueName();

    let genChildrensDataElements = [];
    let genChildrensSetupCall = [];
    let genChildrensLoopCall = [];

    this.dependencies = {};
    this.Data = [];

    // Create block sequence (GridPlugs - Blocks - PlatePlugs)
    let gridPlugs = this.plug.grids.filter(p => !(p instanceof WLInternalSocket));
    let platePlugs = this.plug.plates.filter(p => !(p instanceof WLInternalSocket));

    let sequence = gridPlugs.concat(this.blocks.concat(platePlugs));

    // Scan all blocks inside
    for (var bIdx in sequence) {
      let b = sequence[bIdx];
      let cacheKey = b.UniqueName();

      // Generate dependencies
      var blockCode = this.dependencies[cacheKey];
      if (!blockCode) {
        blockCode = b.$GenerateSource();
        this.dependencies[cacheKey] = blockCode;
      }

      // Add to instance structure
      this.Data.push({
        name: b.guid,
        type: blockCode.codes.instanceStructure.name
      });

      let helpDataAccess = mainGenerator.AccessIndirect('data', b.guid);
      let dataIndirectReference = mainGenerator.GetReference(
        mainGenerator.AccessDirect(
          helpDataAccess,
          'data'
        )
      );

      // Generate setup function call
      let genSetupCallArgs = [
        dataIndirectReference
      ];
      let genSetupCall = mainGenerator.GenerateFunctionCall(blockCode.codes.setupFunction.name, genSetupCallArgs);
      genChildrensSetupCall.push(genSetupCall);

      // Generate loop function call
      let genLoopCallArgs = [
        dataIndirectReference
      ];

      for (var pi of b.pin.grids) {
        let plateConnected = pi.wire ? pi.wire.platePin : null;
        
        if (plateConnected) {
          if (plateConnected.block instanceof GridSocket) {
            genLoopCallArgs.push(plateConnected.block.configs.id);
          } else {
            let plateConnected_bId = plateConnected.block.guid;

            genLoopCallArgs.push(
              mainGenerator.AccessDirect(
                mainGenerator.AccessDirect(
                  mainGenerator.AccessIndirect(
                    'data',
                    plateConnected_bId
                  ),
                  'outputs'
                ),
                plateConnected.name
              )
            );
          }
        } else {
          genLoopCallArgs.push(pi.init);
        }
      }

      for (var po of b.pin.plates) {
        genLoopCallArgs.push(
          mainGenerator.GetReference(
            mainGenerator.AccessDirect(
              mainGenerator.AccessDirect(
                helpDataAccess,
                'outputs'
              ),
              po.name
            )
          )
        );
      }

      let genLoopCall = mainGenerator.GenerateFunctionCall(blockCode.codes.loopFunction.name, genLoopCallArgs, true);
      genChildrensLoopCall.push(genLoopCall);
    }

    // Generate plate plugs marshalling
    let internalPlates = this.plug.plates.filter(p => p instanceof PlateSocket);
    for (var po of internalPlates) {
      let toPlatePin = po.pin.ToPlate;
      let pinWire = toPlatePin.wire;

      var source = toPlatePin.init;

      if (pinWire != null) {
        let srcPlate = pinWire.platePin;
        
        if (srcPlate.block instanceof GridSocket) {
          source = srcPlate.block.configs.id;
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
        mainGenerator.AccessReference(po.configs.id)
      );

      genChildrensLoopCall.push(genMarshalledPlate);
    }

    // Generate init code
    this.InitCode = null;

    // Generate setup code
    this.SetupCode = genChildrensSetupCall.join('\n');

    // Generate loop code
    this.LoopCode = genChildrensLoopCall.join('\n');
    
    // Call super generator
    return super.$GenerateSource();
  }

  $GenerateClass() {
    let generator = new JSGenerator();

    let genConstructorCode = generator.GenerateFunctionCall('super', [ generator.StringLiteral(this.name) ], false);
    let genConstructorFunction = generator.GenerateFunction('constructor', null, [], genConstructorCode);

    // Plugs
    let genPlugsComment = generator.GenerateComment('### PLUGS ###');
    let genInitPlugs = [];
    let genAddPlugs = [];

    for (var pg of this.plug.grids) {
      let pgConfigs = JSON.stringify(pg.configs).replace(/"(\w+)"\s*:/g, '$1:');
      let genPlugCreatorCode = generator.GenerateConst(
        pg.guid,
        '',
        generator.AccessDirect(
          pg.constructor.name,
          generator.GenerateFunctionCall('Create', [ pgConfigs ], false)
        )
      );
      genInitPlugs.push(genPlugCreatorCode);
      genAddPlugs.push(pg.guid);
    }

    for (var pp of this.plug.plates) {
      let ppConfigs = JSON.stringify(pp.configs).replace(/"(\w+)"\s*:/g, '$1:');
      let genPlugCreatorCode = generator.GenerateConst(
        pp.guid,
        '',
        generator.AccessDirect(
          pp.constructor.name,
          generator.GenerateFunctionCall('Create', [ ppConfigs ], false)
        )
      );
      genInitPlugs.push(genPlugCreatorCode);
      genAddPlugs.push(pp.guid);
    }

    let genInitPlugsCode = genInitPlugs.join('\n');
    let genAddPlugsCode = generator.GenerateFunctionCall('this.AddPlug', [ `[${genAddPlugs.join(', ')}]` ]);

    // Blocks
    let genBlocksComment = generator.GenerateComment('### BLOCKS ###');
    let genInitBlocks = [];
    let genAddBlocks = [];
    for (var b of this.blocks) {
      let bConfigs = JSON.stringify(b.configs).replace(/"(\w+)"\s*:/g, '$1:');
      let genBlockCreatorCode = generator.GenerateConst(
        b.guid,
        '',
        generator.AccessDirect(
          b.constructor.name,
          generator.GenerateFunctionCall('Create', [ bConfigs ], false)
        )
      );
      genInitBlocks.push(genBlockCreatorCode);
      genAddBlocks.push(b.guid);
    }

    let genInitBlocksCode = genInitBlocks.join('\n');
    let genAddBlocksCode = generator.GenerateFunctionCall('this.AddBlock', [ `[${genAddBlocks.join(', ')}]` ]);

    // Wiring
    let genWiringComment = generator.GenerateComment('### WIRING ###');
    let genWires = [];
    for (var w of this.wires) {
      let wPins = w.GetConnectedPins();

      let genPins = [];
      for (var p of wPins) {
        let genPinAccessCode = generator.AccessDirect(p.block.guid, generator.AccessDirect('pin', p.name));
        genPins.push(genPinAccessCode);
      }

      let genWireCreatorCode = generator.GenerateFunctionCall('this.ConnectWire', [ `[${genPins.join(', ')}]` ]);
      genWires.push(genWireCreatorCode);
    }

    let genWiresCode = genWires.join('\n');

    // Init function
    let genInitCode = [
      genPlugsComment,
      genInitPlugsCode,
      genAddPlugsCode,

      genBlocksComment,
      genInitBlocksCode,
      genAddBlocksCode,

      genWiringComment,
      genWiresCode
    ].join('\n');
    let genInitFunction = generator.GenerateFunction('$Init', null, [], genInitCode);

    // Class
    let genClassCode = [
      genConstructorFunction,
      genInitFunction
    ].join('\n');

    let genClassName = this.name.replace(/\W/g, '');
    let genClass = generator.GenerateClass(`WLBlock_${genClassName}`, 'WLBlock', genClassCode);

    return genClass;
  }
}

/* ##### CL Step ##### */



WLBlock.Step = null;