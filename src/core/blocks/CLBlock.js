class CLBlock_Step extends WLBlock {
  constructor(id) {
    super("CLBlock_Step");

    this.id = id;
    this.transitionPlug = null;
    this.customExitPlates = [];
    this.customGrids = [];
  }

  /* Transition */
  AttachTransition(step, plateName) { TODO("AttachTransition") }
  DetachTransition() { TODO("DetachTransition") }

  Init() {
    this.SetPlugs(
      [
        PlugGrid.Create('Active', 'bool', 'false'),
        PlugGrid.Create('EntryShot', 'bool', 'false'),
        PlugGrid.Create('ExitShot', 'bool', 'false'),

        PlugPlate.Create('Done', 'bool', 'false')
      ].concat(this.customExitPlates)
    );
  }

  static Create(id) {
    return new CLBlock_Step(id);
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