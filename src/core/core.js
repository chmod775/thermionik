// ########################
let TODO = false;
// ########################
class Plug {
  constructor(block, name, type, configs) {
    this.block = block;
    this.name = name;
    this.type = type;
    this.configs = configs || {};
  }

  static Create(name, type, configs) {
    return new Plug(null, name, type, configs);
  }

  SetBlock(block) { this.block = block; }

  IsEqual(plug) { return (this.block == plug.block) && (this.name == plug.name) && (this.type == plug.type); }
}

class BlockData {
  constructor() {
    this.elements = []; // EXAMPLE: { name: 'cnt', type: 'uint32_t' }
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
    this.plugs = {
      inputs: [],
      outputs: []
    };

    this.gui = {
      svgBody: null,
      svgName: null,
      svgPlugs: []
    };

    this.name = 'ANONYMOUS';
    this.configs = {};

    this._type = 'TRUMPET';

    this.data = new BlockData();
  }

  Create(name, plugs, configs) {
    this.name = name;
    this.configs = configs;

    this.plugs = plugs;
    for (var psKey in this.plugs)
      for (var p of this.plugs[psKey])
        p.SetBlock(this);
  }

  SetData(data) {
    this.data = data;
  }

  SetPlugs(inputs, outputs) {
    this.plugs = {
      inputs: inputs,
      outputs: outputs
    };
  }

  SetConfigs(configs) {
    this.configs = configs;
  }

  IsEqual(block) { return TODO; }

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



