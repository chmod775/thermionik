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

    // Generate data structure
    let genDataName = `_s_data_${uName}`;
    let genDataStructure = this.data.GenerateStructure(genDataName);

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

    // Generate instance structure
    let genInstanceElements = [
      { name: 'data', type: genDataName },
      { name: 'outputs', type: genOutputsName }
    ];

    // Scan all blocks inside
    for (var b of this.blocks) {
      var cacheKey = b.UniqueName();

      // Generate dependencies
      dependencies = dependencies || {};
      var blockCode = dependencies[cacheKey];

      if (!blockCode) {
        blockCode = b.GenerateSource();
        dependencies[cacheKey] = blockCode;
      }

      // Add to instance structure
      genInstanceElements.push({
        name: b.guid,
        type: blockCode.codes.instanceStructure.name
      })
    }

    let genInstanceName = `_s_instance_${uName}`;
    let genInstanceStructure = mainGenerator.GenerateStructure(genInstanceName, genInstanceElements);

    let genParts = [
      genHeaderComment,
      genDataStructure,
      genOutputsStructure,
      genInstanceStructure
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