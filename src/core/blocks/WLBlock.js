class WLInternalPlug extends CBlock.Socket {
  constructor(name, isPlate) {
    super(name, isPlate);
  }
}

class PlugPlate extends WLInternalPlug {
  constructor() {
    super("PlugPlate", true);
  }

  $Init() {
    this.SetPins(
      [
        PinGrid.Create('ToPlate', this.configs.type, this.configs.init),
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

  ExternalPins() { return [ PinPlate.Create(this.configs.id, this.configs.type, this.configs.init) ]; }
}

class PlugGrid extends WLInternalPlug {
  constructor() {
    super("PlugGrid", false);
  }

  $Init() {
    this.SetPins(
      [
        PinPlate.Create('FromGrid', this.configs.type, this.configs.init)
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

  ExternalPins() { return [ PinGrid.Create(this.configs.id, this.configs.type, this.configs.init) ]; }
}

class WLBlock extends CBlock {
  static lang() { return 'WLBlock' };

  constructor(name) {
    super(name);
  
    this.plugs = [];
    this.plug = { plate: {}, plates: [], grid: {}, grids: [] };

    this.blocks = [];
    this.wires = [];

    this.dependencies = {};
  }

  AddBlock(block) {
    if (Array.isArray(block))
      this.blocks = this.blocks.concat(block);
    else
      this.blocks.push(block);
  }

  RemoveBlock(block) {
    this.blocks = this.blocks.filter(t => !t.IsEqual(block));
    block.Destroy();
    this.CleanEmptyWires();
  }

  SetPlugs(plugs) {
    this.plugs = plugs;
    this.plug = { plate: {}, plates: [], grid: {}, grids: [] };

    let pins = [];
    for (var p of this.plugs) {
      if (p instanceof CSocket)
        pins = pins.concat(p.ExternalPins());

      this.plug[p.configs.id] = p;
      if (p.plugConfigs.isPlate) {
        this.plug.plate[p.configs.id] = p;
        this.plug.plates.push(p);
      } else {
        this.plug.grid[p.configs.id] = p;
        this.plug.grids.push(p);
      }
    }

    this.SetPins(pins);
  }

  CleanEmptyWires() {
    this.wires = this.wires.filter(w => (w.platePin != null) || (w.gridPins.length > 0));
  }

  ConnectWire(items) {
    // Get pins from items (direct Pin or Plugs)
    let pins = [];
    for (var i of items) {
      if (i instanceof Pin) pins.push(i);
      if (i instanceof WLInternalPlug) {
        if (!this.plugs.includes(i)) { console.error("Plug not present in block plugs.", i); return null; }
        pins.push(i.pins[0]);
      }
    }

    // Search plate in pins
    var foundPlates = pins.filter(p => p.isPlate);
    if (foundPlates.length > 1) { console.error("Multiple Plates found."); return null; }
    let foundPlate = foundPlates[0] ?? null;

    // Search grids in pins
    var foundGrids = pins.filter(p => !p.isPlate);

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

    // Automagically add blocks from pins
    for (var p of pins) {
      let pBlock = p.block;
      if (!pBlock.IsPlug())
        if (!this.blocks.includes(pBlock))
          this.AddBlock(pBlock);
    }

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
    let gridPlugs = this.plug.grids.filter(p => !(p instanceof WLInternalPlug));
    let platePlugs = this.plug.plates.filter(p => !(p instanceof WLInternalPlug));

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
          if (plateConnected.block instanceof PlugGrid) {
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
    let internalPlates = this.plug.plates.filter(p => p instanceof PlugPlate);
    for (var po of internalPlates) {
      let toPlatePin = po.pin.ToPlate;
      let pinWire = toPlatePin.wire;

      var source = toPlatePin.init;

      if (pinWire != null) {
        let srcPlate = pinWire.platePin;
        
        if (srcPlate.block instanceof PlugGrid) {
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
}

/* ##### Plugs ##### */
class WLPlug_Plate extends WLBlock {
  constructor(name) {
    super(name);
    this.plugConfigs = { isPlate: true };
  }
}

class WLPlug_Grid extends WLBlock {
  constructor(name) {
    super(name);
    this.plugConfigs = { isPlate: false };
  }
}

WLBlock.PlatePlug = WLPlug_Plate;
WLBlock.GridPlug = WLPlug_Grid;

/* ##### CL Step ##### */



WLBlock.Step = null;