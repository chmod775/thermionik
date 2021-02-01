let mainGenerator = new CGenerator();

class Block_OneShot extends CBlock {
  constructor() {
    super("oneshot");

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

let b1 = new Block_OneShot();
let b2 = new Block_Counter();
let b3 = new Block_Counter();

let mainBlock = new WLBlock("main");

mainBlock.AddBlock([b1, b2, b3]);

mainBlock.ConnectPlugs([
  b1.FindPlugByName("out"),
  b2.FindPlugByName("inc"),
  b3.FindPlugByName("reset")
]);

console.log(mainBlock.GenerateCode());