// ########################
let TODO = (function(desc){console.error(`Are you missing something here? Like ${desc || 'TIME'}? DO IT.`);return null;});
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
    this.DisconnectGrid(oldPlug);
    this.ConnectGrid(newPlug);
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

  DisconnectPlug(plug) {
    if (this.platePlug == plug)
      this.platePlug = null;
    else
      this.DisconnectGrid(plug);
  }

  ReplacePlug(oldPlug, newPlug) {
    if (this.platePlug == oldPlug)
      this.platePlug = newPlug;
    else
      this.ReplaceGrid(oldPlug, newPlug);
  }
}

class Plug {
  constructor(block, name, type, init, configs) {
    this.block = block;
    this.name = name;
    this.type = type;
    this.init = init;
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

  static Flip(src) {
    let ret = new Plug(src.block, src.name, src.type, src.init, src.configs);
    ret.wire = src.wire;
    ret.isPlate = !src.isPlate;
    return ret;
  }

  static GetGridPlugs(plugs) {
    return plugs.filter(p => !p.isPlate);
  }
  static GetPlatePlugs(plugs) {
    return plugs.filter(p => p.isPlate);
  }
}

class PlugPlate extends Plug {
  static Create(name, type, init, configs) {
    let ret = new Plug(null, name, type, init, configs);
    ret.isPlate = true;
    return ret;
  }
}
class PlugGrid extends Plug {
  static Create(name, type, init, configs) {
    let ret = new Plug(null, name, type, init, configs);
    ret.isPlate = false;
    return ret;
  }
}

class BlockCode {
  constructor(name, code) {
    this.name = name;
    this.code = code;
  }

  static Create(name, code) {
    return new BlockCode(name, code);
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
  constructor(name) {
    this.name = name;

    this.plugs = [];

    this.gui = {
      svgBody: null,
      svgName: null,
      svgPlugs: []
    };

    this.configs = {}; // Impact only on code generation, so JS level
    this.settings = {}; // Will be in final code

    this._type = 'TRUMPET';

    this.guid = Helpers.uuidv4();

    this.data = [];
  }

  static Create(configs) {
    let ret = new this();
    ret.SetConfigs(configs || {});
    return ret;
  }

  Destroy() {
    this.guid = '//' + this.guid;
    this.DisconnectAllPlugs();
  }

  /* ### Setters ### */
  SetData(data) {
    this.data = data;
  }

  SetPlugs(plugs) {
    this.plugs = plugs;
    for (var p of this.plugs)
      p.SetBlock(this);
  }

  SetConfigs(configs) {
    this.configs = configs;
    this.Init();
  }

  SetSettings(settings) {
    this.settings = settings;
  }

  /* ### Utilities ### */
  DisconnectAllPlugs() {
    for (var p of this.plugs)
      if (p.wire)
        p.wire.DisconnectPlug(p);
  }

  GetGridPlugs() {
    return Plug.GetGridPlugs(this.plugs);
  }
  GetPlatePlugs() {
    return Plug.GetPlatePlugs(this.plugs);
  }

  FindPlugByName(name) {
    for (var p of this.plugs)
      if (p.name.toLowerCase() == name.toLowerCase())
        return p;
    
    return null;
  }

  IsEqual(block) {
    return (this == block);
  }

  Hash() {
    var hashInt = Helpers.hashString(JSON.stringify(this.configs)) - 0xf62;
    return (hashInt > 0) ? hashInt.toString(16) : '';
  }

  UniqueName() {
    let hash = this.Hash();
    return this.name + ((hash.length > 0) ? ('_' + hash) : '');
  }

  /* ### Requirements ### */
  Init() { console.error("Create NOT IMPLEMENTED."); return null; }
  GenerateSource() { ole.error("GenerateSource NOT IMPLEMENTED."); return null; }
}

class EditableBlock extends Block {
  /* ### Plugs ### */
  AddPlug(plug) { TODO() };
  RemovePlug(plug) { TODO() };
  ReplacePlug(oldPlug, newPlug) { TODO() };
}

class Compiler {

}

class Generator {
  constructor() {}

  GenerateStructure(name, elements) { console.error("GenerateStructure NOT IMPLEMENTED."); return null; }
  GenerateFunction(name, ret, parameters, code) { console.error("GenerateFunction NOT IMPLEMENTED."); return null; }
  GenerateArray(name, type, size) { console.error("GenerateArray NOT IMPLEMENTED."); return null; }
  GenerateConst(name, type, value) { console.error("GenerateConst NOT IMPLEMENTED."); return null; }
  GenerateComment(content) { console.error("GenerateComment NOT IMPLEMENTED."); return null; }
  GenerateFunctionCall(name, args) { console.error("GenerateFunctionCall NOT IMPLEMENTED."); return null; }
  GenerateAssignment(source, destination) { console.error("GenerateAssignment NOT IMPLEMENTED."); return null; }

  AccessIndirect(parent, children) { console.error("AccessIndirect NOT IMPLEMENTED."); return null; }
  AccessDirect(parent, children) { console.error("AccessDirect NOT IMPLEMENTED."); return null; }
  GetReference(element) { console.error("GetReference NOT IMPLEMENTED."); return null; }
  AccessReference(element) { console.error("AccessReference NOT IMPLEMENTED."); return null; }
}

class Board {
  
}



