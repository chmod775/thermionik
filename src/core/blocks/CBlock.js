class CBlock extends Block {
  constructor(name) {
    super();

    this.Create(name, { inputs: [], outputs: [] }, {});
  
    this._type = 'C';

    this.code = '';
    this.codeAsJS = false;
  }

  SetCode(code, asJS) {
    this.code = code;
    this.codeAsJS = asJS;
  }

  GenerateCode() {
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
    let genOutputsStructure = mainGenerator.GenerateStructure(`_s_outputs_${this.name}`, genOutputsElements);

    // Generate code
    let genParsedCode = Helpers.ParseTemplate(this.code, this.configs, this.codeAsJS);
    let genCodeParameters = [];
    genCodeParameters.push({
      name: 'data',
      type: `${genDataName}*`
    });
    for (var pi of this.plugs.inputs) {
      genCodeParameters.push({
        name: pi.name,
        type: pi.type
      });
    }
    for (var po of this.plugs.outputs) {
      genCodeParameters.push({
        name: po.name,
        type: `${po.type}*`
      });
    }

    let genCodeFunction = mainGenerator.GenerateFunction(
      `loop_${this.name}`, // Name
      'void', // Return type
      genCodeParameters, // Parameters
      genParsedCode // Code
    );

    return [
      genDataStructure,
      genOutputsStructure,
      genCodeFunction
    ].join('\n');
  }
}