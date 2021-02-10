class CLSequence {
  static Create(items) {
    let ret = new CLSequence_Steps(items);
    return ret;
  }

  static CreateParallel(sequences) {
    let ret = new CLSequence_Parallel(sequences);
    return ret;
  }

  static CreateConditional(parentStep, structure) {
    let ret = new CLSequence_Conditional(parentStep, structure);
    return ret;
  }
}

class CLSequence_Steps extends CLSequence {
  constructor(items) {
    super();
    this.SetItems(items);
  }

  SetItems(items) {
    let nonValidItems = items.filter(i => !(i instanceof CLSequence) && !(i instanceof CLStep));
    if (nonValidItems.length > 0) { console.error("[CLSequence_Steps] SetItems argument contains invalid items."); return null; }

    this.items = items || [];
  }
}

class CLSequence_Parallel extends CLSequence {
  constructor(sequences) {
    super();
    this.SetSequences(sequences);
  }

  SetSequences(sequences) {
    // Check if array is composed only of sequences
    if (!Array.isArray(sequences)) { console.error("[CLSequence_Parallel] SetSequences argument must be an Array."); return null; }

    let nonSequenceItems = sequences.filter(i => !(i instanceof CLSequence));
    if (nonSequenceItems.length > 0) { console.error("[CLSequence_Parallel] SetSequences argument must contain only CLSequence items."); return null; }

    this.sequences = sequences || [];
  }
}

class CLSequence_Conditional extends CLSequence {
  constructor(parentStep, structure) {
    super();
    this.SetParentStep(parentStep);
    this.SetStructure(structure);
  }

  SetParentStep(parentStep) {
    if (!parentStep) { console.error("[CLSequence_Conditional] SetParentStep argument cannot be null."); return null; }
    if (!(parentStep instanceof CLStep)) { console.error("[CLSequence_Conditional] SetParentStep argument must be a CLStep."); return null; }

    this.parentStep = parentStep;
  }

  SetStructure(structure) {
    if (!structure) { console.error("[CLSequence_Conditional] SetStructure argument cannot be null."); return null; }

    let structurePlugs = {};
    for (var sKey in structure) {
      let sVal = structure[sKey];

      // Check if structure key is a valid parent step plug TODO: REMOVE FOR SPEEEEEEEED
      if (this.parentStep) {
        let foundPlug = this.parentStep.block.FindPlugByName(sKey);
        if (!foundPlug) { console.error("[CLSequence_Conditional] SetStructure provvided structure key is not present in parent block plugs."); return null; }
        structurePlugs[sKey] = sVal;
      }

      // Check if structure value is of CLSequence type
      if (!(sVal instanceof CLSequence)) { console.error("[CLSequence_Conditional] SetStructure provvided structure value is not of CLSequence type."); return null; }
    }

    this.structurePlugs = structurePlugs;
    this.structure = structure;
  }
}


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
    return this;
  } 

  SetGrids(grids) {
    this.customGrids = grids;
    this.UpdatePlugs();
    return this;
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

  static Create(type, id) {
    let blockIstance = new type(`${type.name}_Step`);
    let ret = new CLStep(id, blockIstance);
    ret.SetExitPlates([]);
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

  AddSteps(steps) {
    if (Array.isArray(steps)) {
      this.steps = this.steps.concat(steps);
      return steps[0] || null;
    } else {
      this.steps.push(steps);
      return step;  
    }
  }

  RemoveSteps() {}

  SetSequence(sequence) {
    this.sequence = sequence;
  }

  
}