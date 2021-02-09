class CLStep {
  constructor(id, block) {
    this.id = id;
    this.block = block;

    this.transitionPlug = null;
    this.customExitPlates = ['Done'];
    this.customGrids = [];
  }

  SetExitPlates(plates) {
    this.customExitPlates = plates;
    this.UpdatePlugs();
  } 

  SetGrids(grids) {
    this.customGrids = grids;
    this.UpdatePlugs();
  }

  UpdatePlugs() {
    this.block.SetPlugs(
      [
        PlugGrid.Create('Active', 'bool', 'false'),
        PlugGrid.Create('EntryShot', 'bool', 'false'),
        PlugGrid.Create('ExitShot', 'bool', 'false'),
      ]
      .concat(this.customExitPlates.map(p => PlugPlate.Create(p, 'bool', 'false')))
      .concat(this.customGrids)
    );
  }

  static Create(destBlock, id, type) {
    let blockIstance = new type(`${type.name}_Step`);
    let ret = new CLBlock_Step(id, blockIstance);
    ret.SetExitPlates([]);
    destBlock.AddStep(ret);
    return ret;
  }
}

class CLBlock extends WLBlock {
  constructor(name) {
    super(name);
  
    this._type = 'CL';

    this.steps = []; // Instances of CLBlock_Step
  }

  Create() {}

  AddStep(step) {
    if (Array.isArray(step)) {
      this.steps = this.steps.concat(steps);
      return steps[0] || null;
    } else {
      this.steps.push(step);
      return step;  
    }
  }

  RemoveStep() {}


}