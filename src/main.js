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
mainBlock.SetCode(
  `
  *out = (in && !data->lastval);
  data->lastval = in;
  `,
  false
);

console.log(mainBlock.GenerateCode());