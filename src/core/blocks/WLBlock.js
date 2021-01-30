class WLBlock extends Block {
  constructor(name) {
    this.Create(name, { inputs: [], outputs: [] }, {});
  
    this._type = 'WL';
  }

}

class WLWire {
  constructor(fromPlug, toPlug) {
    this.fromPlug = fromPlug;
    this.toPlugs = [toPlug];
  }

  ConnectPlug(toPlug) {
    this.toPlugs.push(toPlug);
  }

  DisconnectPlug(toPlug) {
    this.toPlugs = this.toPlugs.filter(t => !t.IsEqual(toPlug));
  }

  ReplacePlug(toPlug, destPlug) {
    let pIdx = this.toPlugs.findIndex(t => t.IsEqual(destPlug));
    this.toPlugs[pIdx] = toPlug;
  }

  SetSourcePlug(fromPlug) {
    this.fromPlug = fromPlug;
  }

  Clear() {
    this.fromPlug = null;
    this.toPlugs = [];
  }
}

class WLCompiler {
  constructor() {
    this.blocks = [];
    this.wires = [];


  }


} 