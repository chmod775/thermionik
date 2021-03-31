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

  GetSteps() { console.error("GetSteps NOT IMPLEMENTED."); return null; }

  ConnectWith(parentStep) { console.error("ConnectWith NOT IMPLEMENTED."); return null; }
}

class CLSequence_Steps extends CLSequence {
  constructor(items) {
    super();
    this.items = [];
    this.SetItems(items);
  }

  SetItems(items) {
    let nonValidItems = items.filter(i => !(i instanceof CLSequence) && !(i instanceof CLStep));
    if (nonValidItems.length > 0) { console.error("[CLSequence_Steps] SetItems argument contains invalid items."); return null; }

    this.items = items || [];
  }

  GetSteps() {
    let ret = [];
    for (var i of this.items) {
      if (i instanceof CLStep)
        ret.push(i);
      if (i instanceof CLSequence)
        ret = ret.concat(i.GetSteps());
    }
    return ret;
  }

  ConnectWith(container, parentStep) {
    for (var i of this.items) {
      if (i instanceof CLStep) {
        if (parentStep) {
          container.ConnectWire([
            parentStep.block.pin.Done,
            i.block.pin.Activate,
          ]);
        } else {
          parentStep = i;
        }
      }

      if (i instanceof CLSequence) {
        parentStep = i.ConnectWith(container, parentStep);
      }
    }
  }
}

class CLSequence_Parallel extends CLSequence {
  constructor(sequences) {
    super();
    this.sequences = [];
    this.SetSequences(sequences);
  }

  SetSequences(sequences) {
    // Check if array is composed only of sequences
    if (!Array.isArray(sequences)) { console.error("[CLSequence_Parallel] SetSequences argument must be an Array."); return null; }

    let nonSequenceItems = sequences.filter(i => !(i instanceof CLSequence));
    if (nonSequenceItems.length > 0) { console.error("[CLSequence_Parallel] SetSequences argument must contain only CLSequence items."); return null; }

    this.sequences = sequences || [];
  }

  GetSteps() {
    let ret = [];
    for (var s of this.sequences)
      ret = ret.concat(s.GetSteps());
    return ret;
  }

  ConnectWith(container, parentStep) {
    let ret = [];
    let oldParentStep = parentStep;
    for (var s of this.sequences) {
      let parent = s.ConnectWith(oldParentStep);
      if (!parent instanceof CLStep) { console.error("[CLSequence_Parallel] ConnectWith sequence not correct."); return null; }
      ret.push(parent);
    }
    return ret;
  }
}

class CLSequence_Conditional extends CLSequence {
  constructor(parentStep, structure) {
    super();

    this.parentStep = null;
    this.structure = {};

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
        let foundPlug = this.parentStep.block.plug[sKey];
        if (!foundPlug) { console.error("[CLSequence_Conditional] SetStructure provvided structure key is not present in parent block plugs."); return null; }
        structurePlugs[sKey] = sVal;
      }

      // Check if structure value is of CLSequence type
      if (!(sVal instanceof CLSequence)) { console.error("[CLSequence_Conditional] SetStructure provvided structure value is not of CLSequence type."); return null; }
    }

    this.structurePlugs = structurePlugs;
    this.structure = structure;
  }

  GetSteps() {
    let ret = [this.parentStep];
    for (var sKey in this.structure) {
      let sVal = this.structure[sKey];
      ret = ret.concat(sVal.GetSteps());
    }
    return ret;
  }
}

/* ##### Plugs ##### */
class CLStep {
  constructor(id, block) {
    this.id = id;
    this.block = block;

    this.owner = null; // CLBlock

    this.transitionPlug = null;
    this.customExitPlates = [];
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
    let p_defGrid = StepDefaultGridSocket.Create();
    let p_defPlate = StepDefaultPlateSocket.Create({ exits: this.customExitPlates });

    let plugs = [
      p_defGrid
    ]
    .concat(this.customGrids.map(p => GridSocket.Create({ id: p, type: 'bool', init: 'false'})))
    .concat(this.customExitPlates.map(p => PlateSocket.Create({ id: p, type: 'bool', init: 'false'})))
    .concat(
      [
        p_defPlate
      ]
    );

    this.block.AddPlug(plugs);
  }

  SetOwner(owner) {
    this.owner = owner;
    this.block.name = `Step_${this.owner.name}_${this.id}`;
  }

  static Create(type, id) {
    let blockIstance = new type(`Step__${id}`);
    let ret = new CLStep(id, blockIstance);
    return ret;
  }

  static CreateDefault(id) {
    let blockIstance = new WLBlock(`Step__${id}`);
    blockIstance.Data = [{ name: 'active', type: 'bool' }];

    let ret = new CLStep(id, blockIstance);
    ret.SetExitPlates(['Done']);

    blockIstance.ConnectWire([
      blockIstance.plug.StepDefaultGridSocket.pin.Active,
      blockIstance.plug.Done
    ]);

    return ret;
  }
}

class CLBlock extends WLBlock {
  static lang() { return 'CLBlock' };

  constructor(name) {
    super(name);

    this.sequence = null;
  }

  UpdateSteps() {
    if (!this.sequence) return;

    this.steps = this.sequence.GetSteps();

    this.blocks = [];
    for (var s of this.steps) {
      s.SetOwner(this);
      this.AddBlock(s.block);
    }

    this.sequence.ConnectWith(this, null);
  }

  SetSequence(sequence) {
    this.sequence = sequence;
    this.UpdateSteps();
  }
}