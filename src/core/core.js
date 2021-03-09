// ########################
let TODO = (function(desc){console.error(`Are you missing something here? Like ${desc || 'TIME'}? DO IT.`);return null;});
// ########################


class Wire {
  constructor(platePin) {
    this.SetPlate(platePin);

    this.gridPins = [];
  }

  ConnectGrid(gridPin) {
    if (gridPin.isPlate) { console.error("Provided pin is not a Grid."); return; }
    if (gridPin.ConnectToWire(this))
      this.gridPins.push(gridPin);
  }

  DisconnectGrid(gridPin) {
    if (gridPin.isPlate) { console.error("Provided pin is not a Grid."); return; }
    gridPin.DisconnectFromWire(this);
    this.gridPins = this.gridPins.filter(t => !t.IsEqual(gridPin));
  }

  ReplaceGrid(oldPin, newPin) {
    if (oldPin.isPlate) { console.error("Provided old pin is not a Grid."); return; }
    if (newPin.isPlate) { console.error("Provided new pin is not a Grid."); return; }
    this.DisconnectGrid(oldPin);
    this.ConnectGrid(newPin);
  }

  SetPlate(platePin) {
    if (!platePin.isPlate) { console.error("Provided pin is not a Plate."); return; }
    if (platePin.ConnectToWire(this))
      this.platePin = platePin;
  }

  Clear() {
    // Disconnect plate
    this.platePin.DisconnectFromWire();
    this.platePin = null;

    // Disconnect all destinations
    for (var p of this.gridPins)
      p.DisconnectFromWire(this);
    this.gridPins = [];
  }

  DisconnectPin(pin) {
    if (this.platePin == pin)
      this.platePin = null;
    else
      this.DisconnectGrid(pin);
  }

  ReplacePin(oldPin, newPin) {
    if (this.platePin == oldPin)
      this.platePin = newPin;
    else
      this.ReplaceGrid(oldPin, newPin);
  }
}



class Pin {
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
      console.error("Pin already connected to Wire.");
      return false;
    }
    
    this.wire = wire;
    return true;
  }
  DisconnectFromWire() { this.wire = null; }

  IsEqual(pin) { return (this.block == pin.block) && (this.name == pin.name) && (this.type == pin.type); }

  static FilterGridPins(pins) {
    return pins.filter(p => !p.isPlate);
  }
  static FilterPlatePins(pins) {
    return pins.filter(p => p.isPlate);
  }
}

class PinPlate extends Pin {
  static Create(name, type, init, configs) {
    let ret = new Pin(null, name, type, init, configs);
    ret.isPlate = true;
    return ret;
  }
}
class PinGrid extends Pin {
  static Create(name, type, init, configs) {
    let ret = new Pin(null, name, type, init, configs);
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

class Block {
  constructor(name) {
    this.name = name;
    this.guid = Helpers.uuidv4();

    this._lang = 'TRUMPET';

    this.configs = {}; // Impact only on code generation, so JS level
    this.settings = {}; // Will be in final code

    this.plugConfigs = null; // BLOCK: null, PLUG: { isPlate: false }
    this.guiConfigs = {};
  }

  static Create(configs) {
    let ret = new this();
    ret.SetSettings(this.$DefaultSettings());
    ret.SetConfigs(Object.assign(this.$DefaultConfigs(), configs || {}));
    return ret;
  }

  Destroy() {
    this.guid = '//' + this.guid;
    this.$Deinit();
  }

  /* ### Setters ### */
  SetConfigs(configs) {
    this.configs = configs;
    this.$Init();
  }

  SetSettings(settings) {
    this.settings = settings;
  }

  SetGui(guiConfigs) {
    this.guiConfigs = guiConfigs;
  }

  /* ### Utilities ### */
  IsPlug() { return this.plugConfigs != null; }
  IsPlatePlug() { return this.plugConfigs.isPlate; }


  IsEqual(block) {
    return (this == block);
  }

  Hash() {
    let jsonActualConfigs = JSON.stringify(this.configs);
    let jsonDefaultConfigs = JSON.stringify(this.constructor.$DefaultConfigs());
    if (jsonActualConfigs == jsonDefaultConfigs) return '';

    var hashInt = Helpers.hashString(jsonActualConfigs);
    return hashInt.toString(16);
  }

  UniqueName() {
    let hash = this.Hash();
    return this.name + ((hash.length > 0) ? ('_' + hash) : '');
  }

  /* ### Requirements ### */
  $Init() { console.error("$Init NOT IMPLEMENTED."); return null; }
  $Deinit() { console.error("$Deinit NOT IMPLEMENTED."); return null; }
  $GenerateSource() { console.error("$GenerateSource NOT IMPLEMENTED."); return null; }

  static $DefaultConfigs() { return {}; }
  static $DefaultSettings() { return {}; }
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

  VariableDefinition(name, type) { console.error("VariableDefinition NOT IMPLEMENTED."); return null; }
  AccessIndirect(parent, children) { console.error("AccessIndirect NOT IMPLEMENTED."); return null; }
  AccessDirect(parent, children) { console.error("AccessDirect NOT IMPLEMENTED."); return null; }
  GetReference(element) { console.error("GetReference NOT IMPLEMENTED."); return null; }
  AccessReference(element) { console.error("AccessReference NOT IMPLEMENTED."); return null; }
}

class Board {
  constructor(name) {
    this.name = name;

    this.configs = {}; // Impact only on code generation, so JS level
    this.settings = {}; // Will be in final code

    this.mainBlock = null;

    this.interfaces = [];
  }

  static Create(mainBlock) { console.error("Create NOT IMPLEMENTED."); return null; }
}



