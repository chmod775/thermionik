class WLBlock extends Block {
  constructor(name) {
    super(name);
  
    this._type = 'WL';

    this.blocks = [];
    this.wires = [];
  }

  Create() {}

  AddBlock(block) {
    if (Array.isArray(block))
      this.blocks = this.blocks.concat(block);
    else
      this.blocks.push(block);
  }

  RemoveBlock(block) {
    this.blocks = this.blocks.filter(t => !t.IsEqual(block));
  }

  ConnectPlugs(plugs) {
    var foundPlates = plugs.filter(p => p.isPlate);
    if (foundPlates.length < 1) { console.error("Plate not found."); return null; }
    if (foundPlates.length > 1) { console.error("Multiple Plates found."); return null; }

    let foundPlate = foundPlates[0];

    var foundGrids = plugs.filter(p => !p.isPlate);
    if (foundGrids.length < 1) { console.error("No Grids found."); return null; }

    var plateWire = foundPlate.wire;
    if (plateWire == null)
      plateWire = new Wire(foundPlate);

    for (var pg of foundGrids)
      plateWire.ConnectGrid(pg);

    // Add to wires list
    if (!this.wires.includes(plateWire))
    this.wires.push(plateWire);
    
    return plateWire;
  }

  GenerateSource() {
    let uName = this.UniqueName();

    // Generate header comment
    let genHeaderComment = mainGenerator.GenerateComment(`##### block ${uName} by ${this.author || 'Anonymous'} #####`);

    // Generate outputs structure
    let genOutputsElements = [];
    for (var po of this.GetPlatePlugs()) {
      genOutputsElements.push( {
        name: po.name,
        type: po.type
      });
    }
    let genOutputsName = `_s_outputs_${uName}`;
    let genOutputsStructure = mainGenerator.GenerateStructure(genOutputsName, genOutputsElements);

    let genChildrensDataElements = [];
    let genChildrensSetupCall = [];
    let genChildrensLoopCall = [];

    // Scan all blocks inside
    for (var bIdx in this.blocks) {
      let b = this.blocks[bIdx];
      let bId = `b_${b.guid}`;

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
        name: bId,
        type: blockCode.codes.instanceStructure.name
      });

      let helpDataAccess = mainGenerator.AccessIndirect('data', bId);

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
          let plateConnected_bId = `b_${plateConnected.block.guid}`;

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
    
    // Generate data structure
    let genDataName = `_s_data_${uName}`;
    let genDataStructure = mainGenerator.GenerateStructure(genDataName, this.data.concat(genChildrensDataElements));

    // Generate instance structure
    let genInstanceElements = [
      { name: 'data', type: genDataName },
      { name: 'outputs', type: genOutputsName }
    ];

    let genInstanceName = `_s_instance_${uName}`;
    let genInstanceStructure = mainGenerator.GenerateStructure(genInstanceName, genInstanceElements);

    // Generate setup code
    let genSetupCodeName = `setup_${uName}`;
    let genSetupCode = genChildrensSetupCall.join('\n');
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
    let genLoopCode = genChildrensLoopCall.join('\n');
    let genLoopCodeParameters = [];
    genLoopCodeParameters.push({
      name: 'data',
      type: `${genDataName}*`
    });
    for (var pi of this.GetGridPlugs()) {
      genLoopCodeParameters.push({
        name: pi.name,
        type: pi.type
      });
    }
    for (var po of this.GetPlatePlugs()) {
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


    // Join parts
    let genParts = [
      genHeaderComment,
      genDataStructure,
      genOutputsStructure,
      genInstanceStructure,
      genSetupCodeFunction,
      genLoopCodeFunction
    ];

    let genSource = genParts.join('\n');

    return {
      source: genSource,
      codes: {
        dataStructure: null,
        outputsStructure: null,
        
        instanceStructure: null,
        
        setupFunction: null,
        loopFunction: null,

        instancesArray: null
      }
    }
  }
}