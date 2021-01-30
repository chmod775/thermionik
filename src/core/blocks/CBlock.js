class CBlockCode {
  constructor() {
    this.content = '';
    this.asJS = false;
  }
}

class CBlock extends Block {
  constructor(name) {
    super();

    this.Create(name, { inputs: [], outputs: [] }, {});
  
    this._type = 'C';

    this.setupCode = new CBlockCode();
    this.loopCode = new CBlockCode();
  }

  SetSetupCode(code, asJS) {
    this.setupCode.content = code;
    this.setupCode.asJS = asJS;
  }

  SetLoopCode(code, asJS) {
    this.loopCode.content = code;
    this.loopCode.asJS = asJS;
  }

  GenerateCountConst(count) {
    let genCountConst = mainGenerator.GenerateConst(`COUNT_${this.name}`, 'int', count);
    return genCountConst;
  }

  GenerateCode() {
    // Generate header comment
    let genHeaderComment = mainGenerator.GenerateComment(`##### block ${this.name} by ${this.configs.author || 'Anonymous'} #####`);

    // Generate data structure
    let genDataName = `_s_data_${this.name}`;
    let genDataStructure = this.data.GenerateStructure(genDataName);

    // Generate outputs structure
    let genOutputsElements = [];
    for (var po of this.plugs.outputs) {
      genOutputsElements.push( {
        name: po.name,
        type: po.type
      });
    }
    let genOutputsName = `_s_outputs_${this.name}`;
    let genOutputsStructure = mainGenerator.GenerateStructure(genOutputsName, genOutputsElements);

    // Generate instance structure
    let genInstanceElements = [
      { name: 'data', type: genDataName },
      { name: 'outputs', type: genOutputsName }
    ];
    let genInstanceName = `_s_instance_${this.name}`;
    let genInstanceStructure = mainGenerator.GenerateStructure(genInstanceName, genInstanceElements);

    // Generate setup code
    let genParsedSetupCode = Helpers.ParseTemplate(this.setupCode.content, this.configs, this.setupCode.asJS);
    let genSetupCodeParameters = [];
    genSetupCodeParameters.push({
      name: 'data',
      type: `${genDataName}*`
    });

    let genSetupCodeFunction = mainGenerator.GenerateFunction(
      `setup_${this.name}`,   // Name
      'void',                 // Return type
      genSetupCodeParameters, // Parameters
      genParsedSetupCode      // LoopCode
    );

    // Generate loop code
    let genParsedLoopCode = Helpers.ParseTemplate(this.loopCode.content, this.configs, this.loopCode.asJS);
    let genLoopCodeParameters = [];
    genLoopCodeParameters.push({
      name: 'data',
      type: `${genDataName}*`
    });
    for (var pi of this.plugs.inputs) {
      genLoopCodeParameters.push({
        name: pi.name,
        type: pi.type
      });
    }
    for (var po of this.plugs.outputs) {
      genLoopCodeParameters.push({
        name: po.name,
        type: `${po.type}*`
      });
    }

    let genLoopCodeFunction = mainGenerator.GenerateFunction(
      `loop_${this.name}`,    // Name
      'void',                 // Return type
      genLoopCodeParameters,  // Parameters
      genParsedLoopCode       // LoopCode
    );

    // Generate instance arrays
    let genInstancesArray = mainGenerator.GenerateArray(`instances_${this.name}`, genInstanceName, `COUNT_${this.name}`);

    // Join generated parts
    return [
      genHeaderComment,
      
      genDataStructure,
      genOutputsStructure,
      
      genInstanceStructure,

      genSetupCodeFunction,
      genLoopCodeFunction,

      genInstancesArray
    ].join('\n');
  }
}