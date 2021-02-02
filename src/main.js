let mainGenerator = new CGenerator();

class Block_OneShot extends CBlock {
  constructor() {
    super("oneshot");
  }

  Init() {
    this.SetPlugs(
      [
        PlugGrid.Create('in', 'bool'),
        PlugPlate.Create('out', 'bool')
      ]
    );

    this.SetData(BlockData.FromElements([
      { name: 'lastval', type: 'bool' }
    ]));

    this.SetLoopCode(
      `
      *out = (in && !data->lastval);
      data->lastval = in;
      `,
      false
    );
    
    this.SetSetupCode(
      `
      var ret = [];
      for (var i = 0; i < 50; i++)
        ret.push(\`in.array[\${i}]\`);
      return ret.join('\\n');
      `,
      true
    );
  }


}

class Block_Counter extends CBlock {
  constructor() {
    super("counter");
  }

  Init() {
    this.author = "Michele Trombetta";

    this.SetSettings({
      target: 'int'
    });

    this.SetPlugs(
      [
        PlugGrid.Create('inc', 'bool'),
        PlugGrid.Create('reset', 'bool'),

        PlugPlate.Create('actValue', 'int'),
        PlugPlate.Create('atTarget', 'bool')
      ]
    );

    this.SetData(BlockData.FromElements([
      { name: 'value', type: 'int' }
    ]));

    this.SetLoopCode(
      `
      if (inc)
        data->value++;
      *actValue = data->value;
      *atTarget = (data->value >= data->target);
      `,
      false
    );

    this.SetSetupCode(
      `
      data->value = 0;
      `,
      false
    );
  }
}

class Block_And extends CBlock {
  constructor() {
    super("and");
  }

  Init() {
    let nGrids = Math.max(+this.configs.size, 2);

    let plugs = [PlugPlate.Create('out', 'bool')];
    for (var gIdx = 0; gIdx < nGrids; gIdx++)
      plugs.push(PlugGrid.Create(`in_${gIdx}`, 'bool'));

    this.SetPlugs(plugs);
  }

  SetupCode() {}

  LoopCode() {
    let gridPlugs = this.GetGridPlugs();
    let gridNames = gridPlugs.map(p => p.name);
    return `*out = ${gridNames.join(' && ')};`;
  }
}

let b1 = Block_OneShot.Create();
let b2 = Block_Counter.Create();
let b3 = Block_Counter.Create();

let b4 = Block_And.Create({ size: 10 });

let mainBlock = new WLBlock("main");

mainBlock.AddBlock([b1, b2, b3]);

mainBlock.ConnectPlugs([
  b1.FindPlugByName("out"),
  b2.FindPlugByName("inc"),
  b3.FindPlugByName("reset")
]);

console.log(b1.GenerateCode().code);