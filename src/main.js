let mainGenerator = new CGenerator();

class Block_OneShot extends CBlock {
  constructor() {
    super("oneshot");

    this.SetPlugs(
      [
        Plug.Create('in', 'bool')
      ], [
        Plug.Create('out', 'bool')
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
        Plug.Create('inc', 'bool'),
        Plug.Create('reset', 'bool')
      ], [
        Plug.Create('actValue', 'int'),
        Plug.Create('atTarget', 'bool')
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
      true
    );
  }
}

let mainBlock = new Block_OneShot();
console.log(mainBlock.GenerateCode());
console.log(mainBlock.GenerateCountConst(10));