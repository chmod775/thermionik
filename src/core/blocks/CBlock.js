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

    this.setupCode = new CBlockCode();
    this.loopCode = new CBlockCode();
  }

  Create() {}

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
    let genHeaderComment = mainGenerator.GenerateComment(`##### block ${this.name} by ${this.author || 'Anonymous'} #####`);

    // Generate data structure
    let genDataName = `_s_data_${this.name}`;
    let genDataStructure = this.data.GenerateStructure(genDataName);

    // Generate outputs structure
    let genOutputsElements = [];
    for (var po of this.plugs.filter(p => p.isPlate)) {
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
    let genSetupCodeName = `setup_${this.name}`;
    let genParsedSetupCode = Helpers.ParseTemplate(this.setupCode.content, this.configs, this.setupCode.asJS);
    let genSetupCodeParameters = [];
    genSetupCodeParameters.push({
      name: 'data',
      type: `${genDataName}*`
    });

    let genSetupCodeFunction = mainGenerator.GenerateFunction(
      genSetupCodeName,   // Name
      'void',                 // Return type
      genSetupCodeParameters, // Parameters
      genParsedSetupCode      // LoopCode
    );

    // Generate loop code
    let genLoopCodeName = `loop_${this.name}`;
    let genParsedLoopCode = Helpers.ParseTemplate(this.loopCode.content, this.configs, this.loopCode.asJS);
    let genLoopCodeParameters = [];
    genLoopCodeParameters.push({
      name: 'data',
      type: `${genDataName}*`
    });
    for (var pi of this.plugs.filter(p => !p.isPlate)) {
      genLoopCodeParameters.push({
        name: pi.name,
        type: pi.type
      });
    }
    for (var po of this.plugs.filter(p => p.isPlate)) {
      genLoopCodeParameters.push({
        name: po.name,
        type: `${po.type}*`
      });
    }

    let genLoopCodeFunction = mainGenerator.GenerateFunction(
      genLoopCodeName,    // Name
      'void',                 // Return type
      genLoopCodeParameters,  // Parameters
      genParsedLoopCode       // LoopCode
    );

    // Generate instance arrays
    let genInstancesArray = mainGenerator.GenerateArray(`instances_${this.name}`, genInstanceName, `COUNT_${this.name}`);

    // Join generated parts
    let genCode = [
      genHeaderComment,
      
      genDataStructure,
      genOutputsStructure,
      
      genInstanceStructure,

      genSetupCodeFunction,
      genLoopCodeFunction,

      genInstancesArray
    ].join('\n');

    return {
      code: genCode,
      names: {
        dataStructure: genDataName,
        outputsStructure: genOutputsName,
        
        instanceStructure: genInstanceName,

        setupFunction: genSetupCodeName,
        loopFunction: genLoopCodeName
      }
    }
  }
}