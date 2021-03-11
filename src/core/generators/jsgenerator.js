class JSGenerator extends Generator {
  constructor() {
    super();
  }

  GenerateComment(content) {
    return `/* ${content} */`;
  }

  GenerateClass(name, inherit, code) {
    var genLines = [];

    let inheritCode = inherit ? ` extends ${inherit}` : '';

    genLines.push( `class ${name}${inheritCode} {` )

    var codeLines = code.split('\n');
    for (var lIdx in codeLines)
      codeLines[lIdx] = '\t' + codeLines[lIdx];
    genLines.push( codeLines.join('\n') );

    genLines.push( '}' );

    return genLines.join('\n');
  }

  GenerateFunction(name, ret, parameters, code) {
    var genParameters = [];
    for (var p of parameters)
      genParameters.push(p); 

    var genLines = [];

    let retCode = ret ? `${ret} ` : '';

    genLines.push( `${retCode}${name}(${genParameters.join(', ')}) {` );

    var codeLines = code.split('\n');
    for (var lIdx in codeLines)
      codeLines[lIdx] = '\t' + codeLines[lIdx];
    genLines.push( codeLines.join('\n') );

    genLines.push( '}' );

    return genLines.join('\n');
  }

  GenerateFunctionCall(name, args, pretty) {
    if (pretty)
      return `${name}(\n\t${args.join(',\n\t')}\n);`;
    else
      return `${name}(${args.join(',')});`;
  }

  GenerateAssignment(source, destination) {
    return `${destination} = ${source};`;
  }

  VariableDefinition(name, type, init) {
    if (init)
      return `var ${name} = ${init}; // ${type}`;
    else
      return `var ${name}; // ${type}`;
  }

  StringLiteral(str) {
    return `'${str}'`;
  }

  GenerateConst(name, type, value) {
    return `let ${name} = ${value}; // ${type}`;
  }

  GenerateStructure(name, elements) { console.error("GenerateStructure NOT IMPLEMENTED."); return null; }
  GenerateArray(name, type, size) { console.error("GenerateArray NOT IMPLEMENTED."); return null; }


  AccessDirect(parent, children) {
    return `${parent}.${children}`;
  }
  AccessIndirect(parent, children) { console.error("AccessIndirect NOT IMPLEMENTED."); return null; }
  GetReference(element) { console.error("GetReference NOT IMPLEMENTED."); return null; }
  AccessReference(element) { console.error("AccessReference NOT IMPLEMENTED."); return null; }
}