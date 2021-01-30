class CGenerator extends Generator {
  constructor() {
    super();
  }

  GenerateStructure(name, elements) {
    var genLines = [];

    genLines.push( `typedef struct {` );

    if (Array.isArray(elements)) {
      for (var i of elements)
      genLines.push( `\t${i.type} ${i.name};` );
    } else
      genLines.push( elements );

    genLines.push( `} ${name};` );

    return genLines.join('\n');
  }

  GenerateFunction(name, ret, parameters, code) {
    var genParameters = [];
    for (var p of parameters)
      genParameters.push( `${p.type} ${p.name}`); 

    var genLines = [];

    genLines.push( `${ret} ${name}(${genParameters.join(', ')}) {` );

    var codeLines = code.split('\n');
    for (var lIdx in codeLines)
      codeLines[lIdx] = '\t' + codeLines[lIdx];

    genLines.push( codeLines.join('\n') );

    genLines.push( `}` );

    return genLines.join('\n');
  }

  GenerateArray(name, type, size) {
    return `${type} ${name}[${size}];`;
  }

  GenerateConst(name, type, value) {
    return `#define ${name} ${value}`;
  }

  GenerateComment(content) {
    return `/* ${content} */`;
  }
}