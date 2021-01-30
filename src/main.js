let mainGenerator = new CGenerator();


let mainBlock = new CBlock("oneshot");
mainBlock.SetPlugs(
  [
    Plug.Create('in', 'bool')
  ], [
    Plug.Create('out', 'bool')
  ]
);
mainBlock.SetData(BlockData.FromElements([
  { name: 'lastval', type: 'bool' }
]));
mainBlock.SetLoopCode(
  `
  *out = (in && !data->lastval);
  data->lastval = in;
  `,
  false
);

mainBlock.SetSetupCode(
  `
  var ret = [];
  for (var i = 0; i < 50; i++)
    ret.push(\`in.array[\${i}]\`);
  return ret.join('\\n');
  `,
  true
);

console.log(mainBlock.GenerateCode());
console.log(mainBlock.GenerateCountConst(10));