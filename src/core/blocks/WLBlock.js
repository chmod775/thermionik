class WLBlock extends CBlock {
  static lang() { return 'WLBlock' };

  constructor(name) {
    super(name, true);
  
    this.Data = [];

    this.plug = { all: [], plate: {}, plates: [], grid: {}, grids: [] };

    this.blocks = [];
    this.wires = [];
  }

  /* ### Blocks management ### */
  AddBlock(block) {
    if (Array.isArray(block)) {
      for (var b of block)
        this.AddBlock(b);
      return;
    }
    
    this.blocks.push(block);

    this.ClearCache();
  }

  RemoveBlock(block) {
    if (Array.isArray(block)) {
      for (var b of block)
        this.RemoveBlock(b);
      return;
    }

    this.blocks = this.blocks.filter(t => !t.IsEqual(block));

    this.ClearCache();
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

    this.plug.all.push(plug);
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

    this.ClearCache();
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

    this.plug.all = this.plug.all.filter(p => p.guid != plug.guid);
    this.plug.plates = this.plug.plates.filter(p => p.guid != plug.guid);
    this.plug.grids = this.plug.grids.filter(p => p.guid != plug.guid);

    // Plug is also a Socket
    if (plug instanceof CSocket)
      this.RemovePin(plug.$ExternalPins());

    this.ClearCache();
  }

  /* ### Wirings ### */
  DisconnectWire(items) {
    // Get pins from items (direct Pin or Plugs)
    let pins = [];
    for (var i of items) {
      if (i instanceof Pin) pins.push(i);
      if (i instanceof CBlock.Socket) {
        if (i.IsPlatePlug())
          pins.push(i.pin.grids[0]);
        else
          pins.push(i.pin.plates[0]);
      }
    }

    let removedConnections = [];

    // Disconnect wires
    for (var p of pins) {
      let wire = p.wire;
      if (wire) {
        var connection = removedConnections.find(c => c.wire == wire);
        if (!connection) {
          connection = {
            wire: wire,
            pins: []
          };
          removedConnections.push(connection);
        }

        connection.pins.push(p);

        wire.DisconnectPin(p);
      }
    }

    // Find 'useless' wires
    let uselessWires = this.wires.filter(w => w.IsUseless());

    for (var w of uselessWires) {
      var connection = removedConnections.find(c => c.wire == w);
      if (!connection) {
        connection = {
          wire: w,
          refPin: null,
          pins: []
        };
        removedConnections.push(connection);
      }

      for (var p of w.GetConnectedPins()) {
        connection.pins.push(p);
        w.DisconnectPin(p);
      }
    }

    // Remove useless (and now empty) wires from list
    this.wires = this.wires.filter(w => !w.IsEmpty());

    this.ClearCache();

    return removedConnections;
  }

  ConnectWire(items) {
    // Get pins from items (direct Pin or Plugs)
    let pins = [];
    for (var i of items) {
      if (i instanceof Pin) pins.push(i);
      if (i instanceof CBlock.Socket) {
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

    this.ClearCache();

    // Return wire
    return destWire;
  }

  $GenerateSource() {
    let uName = this.UniqueName();

    let genChildrensDataElements = [];
    let genChildrensSetupCall = [];
    let genChildrensLoopCall = [];

    this.dependencies = {};

    this.Data = this.Data.filter(d => !d.isInstance);

    // Generate grid sockets marshalling
    let gridSockets = this.plug.grids.filter(p => p instanceof CBlock.Socket);
    for (var pg of gridSockets) {
      let pgSource = pg.GetSource();
      if (pgSource)
        genChildrensLoopCall.push(pgSource.source);
    }

    // Create block sequence (GridPlugs - Blocks - PlatePlugs)
    let gridPlugs = this.plug.grids.filter(p => !(p instanceof CBlock.Socket));
    let platePlugs = this.plug.plates.filter(p => !(p instanceof CBlock.Socket));

    let sequence = gridPlugs.concat(this.blocks.concat(platePlugs));

    // Scan all blocks inside
    for (var bIdx in sequence) {
      let b = sequence[bIdx];
      let cacheKey = b.UniqueName();

      // Generate dependencies
      var blockCode = b.GetSource();
      this.dependencies[cacheKey] = {
        block: b,
        code: blockCode
      };

      // Add to instance structure
      this.Data.push({
        name: b.guid,
        type: blockCode.codes.instanceStructure.name,
        isInstance: true
      });

      // Data instance
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
          if (plateConnected.block instanceof CBlock.Socket) {
            genLoopCallArgs.push(plateConnected.block.$GenerateConnection(plateConnected));
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

    // Generate plate sockets marshalling
    let plateSockets = this.plug.plates.filter(p => p instanceof CBlock.Socket);
    for (var pp of plateSockets) {
      let ppSource = pp.GetSource();
      if (ppSource)
        genChildrensLoopCall.push(ppSource.source);
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
      let pgConfigs = Helpers.JSONClean(pg.configs);
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
      let ppConfigs = Helpers.JSONClean(pp.configs);
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
      let bConfigs = Helpers.JSONClean(b.configs);
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

    // Data
    let genDataContent = ((this.Data instanceof Function) ? this.Data() : this.Data) ?? [];
    let genDataOBJ = Helpers.JSONClean(genDataContent);
    let genDataCode = generator.GenerateFunction(
      'Data',
      '',
      [],
      generator.GenerateFunctionReturn(genDataOBJ)
    );

    // Default Settings
    let genDefSettingsContent = this.constructor.$DefaultSettings() ?? {};
    let genDefSettingsOBJ = Helpers.JSONClean(genDefSettingsContent);
    let genDefSettingsCode = generator.GenerateFunction(
      '$DefaultSettings',
      'static',
      [],
      generator.GenerateFunctionReturn(genDefSettingsOBJ)
    );

    // Default Configs
    let genDefConfigsContent = this.constructor.$DefaultConfigs() ?? {};
    let genDefConfigsOBJ = Helpers.JSONClean(genDefConfigsContent);
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

      genDefSettingsCode,
      genDefConfigsCode
    ].join('\n');

    let genClassName = `WLBlock_${this.name.replace(/\W/g, '')}`;
    let genClass = generator.GenerateClass(genClassName, 'WLBlock', genClassCode);

    let genEval = generator.VariableDefinition(genClassName, '', `(${genClass})`);

    return `(${genClass})`;
  }
}

/* ##### CL Step ##### */



WLBlock.Step = null;