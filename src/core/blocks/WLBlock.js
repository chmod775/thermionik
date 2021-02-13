class WLBlock extends CBlock {
  constructor(name) {
    super(name);
  
    this._lang = 'WL';

    this.plugs = [];

    this.blocks = [];
    this.wires = [];
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
  }

  SetPlugs(plugs) {
    let pins = [];
    
    this.plugs = plugs;
    for (var p of this.plugs) {
      p.SetBlock(this);
    
      if (p.isPlate) 
        pins = pins.concat(Pin.FilterPlatePins(p.pins));
      else
        pins = pins.concat(Pin.FilterGridPins(p.pins));
    }

    this.SetPins(pins);
  }

  ConnectWire(items) {
    console.log(items);
  }

  ConnectPlugs(plugs) {
    // Flip polarity for self owned plugs
    let correctPlugs = plugs.map(p => (p.block != this) ? p : Plug.Flip(p));

    var foundPlates = correctPlugs.filter(p => p.isPlate);
    if (foundPlates.length < 1) { console.error("Plate not found."); return null; }
    if (foundPlates.length > 1) { console.error("Multiple Plates found."); return null; }

    let foundPlate = foundPlates[0];

    var foundGrids = correctPlugs.filter(p => !p.isPlate);
    if (foundGrids.length < 1) { console.error("No Grids found."); return null; }

    var plateWire = foundPlate.wire;
    if (plateWire == null)
      plateWire = new Wire(foundPlate);

    for (var pg of foundGrids)
      plateWire.ConnectGrid(pg);

    // Add to wires list
    if (!this.wires.includes(plateWire))
    this.wires.push(plateWire);
    
    // Apply wiring to real plugs TODO: FIND A REAL SOLUTION, not like NASA 1996
    for (var p of correctPlugs) {
      if (p.block == this) {
        let realPlugs = this.FindPlugByName(p.name);
        realPlugs.wire = p.wire;
      } else {
        // Automagically add blocks from plugs
        if (!this.blocks.includes(p.block))
          this.AddBlock(p.block);
      }
    }

    // Return connected wire
    return plateWire;
  }

  GenerateSource() {
    let uName = this.UniqueName();

    let genChildrensDataElements = [];
    let genChildrensSetupCall = [];
    let genChildrensLoopCall = [];

    // Scan all blocks inside
    for (var bIdx in this.blocks) {
      let b = this.blocks[bIdx];

      var cacheKey = b.UniqueName();

      // Generate dependencies
      dependencies = dependencies || {};
      var blockCode = dependencies[cacheKey];

      if (!blockCode) {
        blockCode = b.GenerateSource();
        dependencies[cacheKey] = blockCode;
      }

      // Add to instance structure
      genChildrensDataElements.push({
        name: b.guid,
        type: blockCode.codes.instanceStructure.name
      });

      let helpDataAccess = mainGenerator.AccessIndirect('data', b.guid);

      // Generate setup function call
      let genSetupCallArgs = [
        mainGenerator.GetReference(
          mainGenerator.AccessDirect(
            helpDataAccess,
            'data'
          )
        )
      ];
      let genSetupCall = mainGenerator.GenerateFunctionCall(blockCode.codes.setupFunction.name, genSetupCallArgs);
      genChildrensSetupCall.push(genSetupCall);

      // Generate loop function call
      let genLoopCallArgs = [
        mainGenerator.GetReference(
          mainGenerator.AccessDirect(
            helpDataAccess,
            'data'
          )
        )
      ];

      for (var pi of b.GetGridPlugs()) {
        let plateConnected = pi.wire ? pi.wire.platePlug : null;
        
        if (plateConnected) {
          if (plateConnected.block == this) {
            genLoopCallArgs.push(plateConnected.name);
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

      for (var po of b.GetPlatePlugs()) {
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
    
    // Generate plate marshalling
    for (var po of this.GetPlatePlugs()) {
      if (po.wire != null) {
        let srcPlate = po.wire.platePlug;
        
        var sourceRef = mainGenerator.AccessDirect(
          mainGenerator.AccessDirect(
            mainGenerator.AccessIndirect('data', srcPlate.block.guid),
            'outputs'
          ),
          srcPlate.name
        );

        if (srcPlate.block == this)
            sourceRef = srcPlate.name;

        let genMarshalledPlate = mainGenerator.GenerateAssignment(
          sourceRef,
          mainGenerator.AccessReference(po.name)
        );
  
        genChildrensLoopCall.push(genMarshalledPlate);
      }
    }

    // Generate setup code
    this.SetupCode = genChildrensSetupCall.join('\n');

    // Generate loop code
    this.LoopCode = genChildrensLoopCall.join('\n');
    
    // Call super generator
    return super.GenerateSource();
  }
}