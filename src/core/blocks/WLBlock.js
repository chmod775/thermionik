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
    
    this.plug = { plates: {}, grids: {} };
    for (var p of this.plugs) {
      pins.push(p.AsPin());

      this.plug[p.id] = p;
      if (p.isPlate)
        this.plug.plates[p.id] = p;
      else
        this.plug.grids[p.id] = p;
    }

    this.SetPins(pins);
  }

  ConnectWire(items) {
    let pins = items.map(p => {
      if (p instanceof Pin) return p;
      if (p instanceof Plug) return p.pins[0];
    })

    var foundPlates = pins.filter(p => p.isPlate);
    if (foundPlates.length < 1) { console.error("Plate not found."); return null; }
    if (foundPlates.length > 1) { console.error("Multiple Plates found."); return null; }

    let foundPlate = foundPlates[0];

    var foundGrids = pins.filter(p => !p.isPlate);
    if (foundGrids.length < 1) { console.error("No Grids found."); return null; }

    var plateWire = foundPlate.wire;
    if (plateWire == null)
      plateWire = new Wire(foundPlate);

    for (var pg of foundGrids)
      plateWire.ConnectGrid(pg);

    // Add to wires list
    if (!this.wires.includes(plateWire))
    this.wires.push(plateWire);

    // Automagically add blocks from pins
    for (var p of pins) {
      let pBlock = p.block;
      if (!(pBlock instanceof Plug))
        if (!this.blocks.includes(pBlock))
          this.AddBlock(pBlock);
    }

    return plateWire;
  }

  GenerateSource() {
    let uName = this.UniqueName();

    let genChildrensDataElements = [];
    let genChildrensSetupCall = [];
    let genChildrensLoopCall = [];

    this.Data = [];

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
      this.Data.push({
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

      for (var pi of b.pin.grids) {
        let plateConnected = pi.wire ? pi.wire.platePin : null;
        
        if (plateConnected) {
          if (plateConnected.block instanceof Plug) {
            console.log(plateConnected);
            genLoopCallArgs.push(plateConnected.block.id);
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
    /*
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
*/
    // Generate setup code
    this.SetupCode = genChildrensSetupCall.join('\n');

    // Generate loop code
    this.LoopCode = genChildrensLoopCall.join('\n');
    
    console.log(this.Data);

    // Call super generator
    return super.GenerateSource();
  }
}