class CBlockCode {
  constructor() {
    this.content = '';
    this.asJS = false;
  }
}

class CBlock extends Block {
  constructor(name) {
    super(name);

    this._type = 'C';
  }

  Create() {}

  GenerateCountConst(count) {
    let uName = this.UniqueName();
    let genCountConst = mainGenerator.GenerateConst(`COUNT_${uName}`, 'int', count);
    return genCountConst;
  }

  GenerateSource() {
    let uName = this.UniqueName();

    // Generate header comment
    let genHeaderComment = mainGenerator.GenerateComment(`##### block ${uName} by ${this.author || 'Anonymous'} #####`);

    // Generate data structure
    let genDataName = `_s_data_${uName}`;
    let genDataStructure = mainGenerator.GenerateStructure(genDataName, this.data);

    // Generate outputs structure
    let genOutputsElements = [];
    for (var po of this.GetPlatePlugs()) {
      genOutputsElements.push( {
        name: po.name,
        type: po.type
      });
    }
    let genOutputsName = `_s_outputs_${uName}`;
    let genOutputsStructure = mainGenerator.GenerateStructure(genOutputsName, genOutputsElements);

    // Generate instance structure
    let genInstanceElements = [
      { name: 'data', type: genDataName },
      { name: 'outputs', type: genOutputsName }
    ];
    let genInstanceName = `_s_instance_${uName}`;
    let genInstanceStructure = mainGenerator.GenerateStructure(genInstanceName, genInstanceElements);

    // Generate setup code
    let genSetupCodeName = `setup_${uName}`;
    let genSetupCode = (this.SetupCode instanceof Function) ? this.SetupCode() : this.SetupCode;
    let genSetupCodeParameters = [];
    genSetupCodeParameters.push({
      name: 'data',
      type: `${genDataName}*`
    });

    let genSetupCodeFunction = mainGenerator.GenerateFunction(
      genSetupCodeName,   // Name
      'void',                 // Return type
      genSetupCodeParameters, // Parameters
      genSetupCode || ''      // SetupCode
    );

    // Generate loop code
    let genLoopCodeName = `loop_${uName}`;
    let genLoopCode = (this.LoopCode instanceof Function) ? this.LoopCode() : this.LoopCode;
    let genLoopCodeParameters = [];
    genLoopCodeParameters.push({
      name: 'data',
      type: `${genDataName}*`
    });
    for (var pi of this.GetGridPlugs()) {
      genLoopCodeParameters.push({
        name: pi.name,
        type: pi.type
      });
    }
    for (var po of this.GetPlatePlugs()) {
      genLoopCodeParameters.push({
        name: po.name,
        type: `${po.type}*`
      });
    }

    let genLoopCodeFunction = mainGenerator.GenerateFunction(
      genLoopCodeName,    // Name
      'void',                 // Return type
      genLoopCodeParameters,  // Parameters
      genLoopCode || ''       // LoopCode
    );

    // Generate instance arrays
    let genInstancesName = `instances_${uName}`;
    let genInstancesArray = mainGenerator.GenerateArray(genInstancesName, genInstanceName, `COUNT_${uName}`);

    // Join generated parts
    let genSource = [
      genHeaderComment,
      
      genDataStructure,
      genOutputsStructure,
      
      genInstanceStructure,

      genSetupCodeFunction,
      genLoopCodeFunction
    ].join('\n');

    return {
      source: genSource,
      codes: {
        dataStructure: BlockCode.Create(genDataName, genDataStructure),
        outputsStructure: BlockCode.Create(genOutputsName, genOutputsStructure),
        
        instanceStructure: BlockCode.Create(genInstanceName, genInstanceStructure),

        setupFunction: BlockCode.Create(genSetupCodeName, genSetupCodeFunction),
        loopFunction: BlockCode.Create(genLoopCodeName, genLoopCodeFunction)
      }
    }
  }

  /* ### Requirements ### */
  SetupCode() { console.error("SetupCode NOT IMPLEMENTED."); return TODO; }
  LoopCode() { console.error("LoopCode NOT IMPLEMENTED."); return TODO; }
}