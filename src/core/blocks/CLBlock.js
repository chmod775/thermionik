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
  GetJoints() { console.error("GetJoints NOT IMPLEMENTED."); return null; }

  ConnectWithPin(container, srcPin) { console.error("ConnectWithPin NOT IMPLEMENTED."); return null; }
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

  AddItem(item) {
    if (Array.isArray(item)) {
      for (var i of item)
        this.AddItem(i);
      return;
    }

    if (!(item instanceof CLSequence) && !(item instanceof CLStep)){ console.error("[CLSequence_Steps] AddItem argument contains invalid items."); return null; }

    this.items.push(item);
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

  GetJoints() {
    let ret = [];
    for (var i of this.items) {
      if (i instanceof CLSequence)
        ret = ret.concat(i.GetJoints());
    }
    return ret;
  }

  ConnectWithPin(container, srcPin) {
    for (var i of this.items) {
      if (i instanceof CLStep) {
        if (srcPin) {
          container.ConnectWire([
            srcPin,
            i.block.pin.Activate,
          ]);
        }

        srcPin = i.block.pin.Done;
      }

      if (i instanceof CLSequence) {
        srcPin = i.ConnectWithPin(container, srcPin);
      }
    }

    return srcPin;
  }
}

class CLSequence_Parallel extends CLSequence {
  constructor(sequences) {
    super();
    
    this.jointBlock = null;

    this.sequences = [];

    this.SetSequences(sequences);
  }

  SetSequences(sequences) {
    // Check if array is composed only of sequences
    if (!Array.isArray(sequences)) { console.error("[CLSequence_Parallel] SetSequences argument must be an Array."); return null; }

    let nonSequenceItems = sequences.filter(i => !(i instanceof CLSequence));
    if (nonSequenceItems.length > 0) { console.error("[CLSequence_Parallel] SetSequences argument must contain only CLSequence items."); return null; }

    this.sequences = sequences || [];

    this.jointBlock = Block_And.Create({ size: this.sequences.length });
  }

  GetSteps() {
    let ret = [];
    for (var s of this.sequences)
      ret = ret.concat(s.GetSteps());
    return ret;
  }

  GetJoints() {
    let ret = [];
    for (var s of this.sequences)
      ret = ret.concat(s.GetJoints());
    ret.push(this.jointBlock);
    return ret;
  }

  ConnectWithPin(container, srcPin) {
    for (var sIdx in this.sequences) {
      let s = this.sequences[sIdx];
      let seqPin = s.ConnectWithPin(container, srcPin);
      container.ConnectWire([
        seqPin,
        this.jointBlock.pin.grids[sIdx]
      ]);
    }
    return this.jointBlock.pin.out;
  }
}

class CLSequence_Conditional extends CLSequence {
  constructor(parentStep, structure) {
    super();

    this.jointBlock = null;

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

    this.jointBlock = Block_Or.Create({ size: Object.keys(structure).length });
  }

  GetSteps() {
    let ret = [this.parentStep];
    for (var sKey in this.structure) {
      let sVal = this.structure[sKey];
      ret = ret.concat(sVal.GetSteps());
    }
    return ret;
  }

  GetJoints() {
    let ret = [];
    for (var sKey in this.structure) {
      let sVal = this.structure[sKey];
      ret = ret.concat(sVal.GetJoints());
    }
    ret.push(this.jointBlock);
    return ret;
  }

  ConnectWithPin(container, srcPin) {
    // Connect parent step
    container.ConnectWire([
      srcPin,
      this.parentStep.block.pin.Activate,
    ]);

    // Connect branches
    let sIdx = 0;
    for (var sKey in this.structure) {
      let sVal = this.structure[sKey];
      let seqPin = sVal.ConnectWithPin(container, this.parentStep.block.pin[sKey]);
      container.ConnectWire([
        seqPin,
        this.jointBlock.pin.grids[sIdx]
      ]);
      sIdx++;
    }
    return this.jointBlock.pin.out;
  }
}

/* ##### Plugs ##### */
class CLStep {
  constructor(id, block, userCustoms) {
    this.id = id;
    this.block = block;

    this.owner = null; // CLBlock

    this.userCustoms = userCustoms ?? { };
    this.userCustoms.exits = this.userCustoms.exits ?? [];
    this.userCustoms.grids = this.userCustoms.grids ?? [];

    this.CreatePlugs();
  }

  CreatePlugs() {
    let p_defGrid = StepDefaultGridSocket.Create();
    let p_defPlate = StepDefaultPlateSocket.Create({ exits: this.userCustoms.exits });

    let plugs = [
      p_defGrid
    ]
    .concat(this.userCustoms.grids.map(p => GridSocket.Create({ id: p, type: 'bool', init: 'false'})))
    .concat(this.userCustoms.exits.map(p => PlateSocket.Create({ id: p, type: 'bool', init: 'false'})))
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

  static Create(type, id, userCustoms) {
    let blockIstance = new type(`Step__${id}`);
    blockIstance.Data = [{ name: 'active', type: 'bool', init: 'false' }];
    let ret = new CLStep(id, blockIstance, userCustoms);
    return ret;
  }

  static CreateDefault(id, userCustoms) {
    userCustoms = userCustoms ?? { };
    userCustoms.exits = userCustoms.exits ?? ['Done'];
    userCustoms.grids = userCustoms.grids ?? [];

    let blockIstance = new WLBlock(`Step__${id}`);
    blockIstance.Data = [{ name: 'active', type: 'bool', init: 'false' }];

    let ret = new CLStep(id, blockIstance, userCustoms);

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

    this.sequence = CLSequence.Create([]);
    this.steps = [];
    this.joints = [];
  }

  UpdateSteps() {
    if (!this.sequence) return;

    this.blocks = [];

    // Add steps to blocks
    this.steps = this.sequence.GetSteps();
    for (var s of this.steps) {
      s.SetOwner(this);
      this.AddBlock(s.block);
    }

    // Add joints to blocks
    this.joints = this.sequence.GetJoints();
    this.AddBlock(this.joints);
  }

  SetSequence(sequence) {
    this.sequence = sequence;
    this.UpdateSteps();
  }

  AddStep(step) {
    if (Array.isArray(step)) {
      for (var s of step)
        this.AddStep(s);
      return;
    }

    if (step instanceof CLStep) {
      step.SetOwner(this);
      this.AddBlock(step.block);
    } else {
      // Add step to blocks
      let innerSteps = step.GetSteps();
      for (var s of innerSteps) {
        s.SetOwner(this);
        this.AddBlock(s.block);
      }

      // Add joints to blocks
      let innerJoints = step.GetJoints();
      this.AddBlock(innerJoints);
    }

    this.sequence.AddItem(step);
  }

  $GenerateSource() {
    // Create wiring
    this.sequence.ConnectWithPin(this, null);

    return super.$GenerateSource();
  }
}