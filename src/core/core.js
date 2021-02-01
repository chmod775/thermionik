// ########################
let TODO = false;
// ########################

class Wire {
  constructor(platePlug) {
    this.SetPlate(platePlug);

    this.gridPlugs = [];
  }

  ConnectGrid(gridPlug) {
    if (gridPlug.isPlate) { console.error("Provided plug is not a Grid."); return; }
    if (gridPlug.ConnectToWire(this))
      this.gridPlugs.push(gridPlug);
  }

  DisconnectGrid(gridPlug) {
    if (gridPlug.isPlate) { console.error("Provided plug is not a Grid."); return; }
    gridPlug.DisconnectFromWire(this);
    this.gridPlugs = this.gridPlugs.filter(t => !t.IsEqual(gridPlug));
  }

  ReplaceGrid(oldPlug, newPlug) {
    if (oldPlug.isPlate) { console.error("Provided old plug is not a Grid."); return; }
    if (newPlug.isPlate) { console.error("Provided new plug is not a Grid."); return; }
    this.DisconnectPlug(oldPlug);
    this.ConnectPlug(newPlug);
  }

  SetPlate(platePlug) {
    if (!platePlug.isPlate) { console.error("Provided plug is not a Plate."); return; }
    if (platePlug.ConnectToWire(this))
      this.platePlug = platePlug;
  }

  Clear() {
    // Disconnect plate
    this.platePlug.DisconnectFromWire();
    this.platePlug = null;

    // Disconnect all destinations
    for (var p of this.gridPlugs)
      p.DisconnectFromWire(this);
    this.gridPlugs = [];
  }
}

class Plug {
  constructor(block, name, type, configs) {
    this.block = block;
    this.name = name;
    this.type = type;
    this.configs = configs || {};

    this.wire = null;

    this.isPlate = false;
  }

  SetBlock(block) { this.block = block; }

  ConnectToWire(wire) {
    if (this.wire != null) {
      console.error("Plug already connected to Wire.");
      return false;
    }
    
    this.wire = wire;
    return true;
  }
  DisconnectFromWire() { this.wire = null; }

  IsEqual(plug) { return (this.block == plug.block) && (this.name == plug.name) && (this.type == plug.type); }
}

class PlugPlate extends Plug {
  static Create(name, type, configs) {
    let ret = new Plug(null, name, type, configs);
    ret.isPlate = true;
    return ret;
  }
}
class PlugGrid extends Plug {
  static Create(name, type, configs) {
    let ret = new Plug(null, name, type, configs);
    ret.isPlate = false;
    return ret;
  }
}

class BlockData {
  constructor() {
    this.elements = []; // EXAMPLE: { name: 'cnt', type: 'uint32_t', init: 0 }
    this.code = null;
  }

  static FromElements(elements) {
    var ret = new BlockData();
    ret.elements = elements;
    ret.code = null;
    return ret;
  }

  static FromCode(code) {
    var ret = new BlockData();
    ret.elements = [];
    ret.code = code;
    return ret;
  }

  GenerateStructure(name) {
    return mainGenerator.GenerateStructure(name, this.code || this.elements);
  }

  SetElements(elements) {
    this.elements = elements;
  }

  SetCode(code) {
    this.code = code;
  }

  Clear() {
    this.elements = [];
    this.code = null;
  }
}

class Block {
  constructor() {
    this.plugs = [];

    this.gui = {
      svgBody: null,
      svgName: null,
      svgPlugs: []
    };

    this.name = 'ANONYMOUS';
    this.configs = {}; // Impact only on code generation, so JS level
    this.settings = {}; // Will be in final code

    this._type = 'TRUMPET';

    this.guid = Helpers.uuidv4();

    this.data = new BlockData();
  }

  Create(name, plugs, configs) {
    this.name = name;
    this.configs = configs;

    this.SetPlugs(plugs);
  }

  SetData(data) {
    this.data = data;
  }

  SetPlugs(plugs) {
    this.plugs = plugs;
    for (var p of this.plugs)
      p.SetBlock(this);
  }

  FindPlugByName(name) {
    for (var p of this.plugs)
      if (p.name.toLowerCase() == name.toLowerCase())
        return p;
    
    return null;
  }

  SetConfigs(configs) {
    this.configs = configs;
  }

  SetSettings(settings) {
    this.settings = settings;
  }

  IsEqual(block) {
    return (this == block);
  }

  GenerateCode() { return TODO; }
}

class Compiler {

}

class Generator {
  constructor() {}

  GenerateStructure(name, elements) { return null; }
  GenerateFunction(name, ret, parameters, code) { return null; }
  GenerateArray(name, type, size) { return null; }
  GenerateConst(name, type, value) { return null; }
  GenerateComment(content) { return null; }
}

class Board {
  
}



