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

  GenerateCode() {
    let genParts = [];

    for (var b of this.blocks) {
      var cacheKey = JSON.stringify(b.configs);

      b.constructor._cache = b.constructor._cache || {};
      var blockCode = b.constructor._cache[cacheKey];

      if (!blockCode) {
        blockCode = b.GenerateCode();
        b.constructor._cache[cacheKey] = blockCode;

        genParts.push(blockCode);
      }      
    }

    return genParts.join('\n');
  }
}