let mainGenerator = new CGenerator();

let dependencies = {};

class Block_OneShot extends CBlock {
  constructor() {
    super("oneshot");
  }

  Init() {
    this.SetPlugs(
      [
        PlugGrid.Create('in', 'bool', 'true'),
        PlugPlate.Create('out', 'bool', 'false')
      ]
    );

    this.SetData([
      { name: 'lastval', type: 'bool' }
    ]);

    this.LoopCode =
      `
      *out = (in && !data->lastval);
      data->lastval = in;
      `,
      false
    ;
  }

  SetupCode() {}
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
        PlugGrid.Create('inc', 'bool', 'false'),
        PlugGrid.Create('reset', 'bool', 'false'),

        PlugPlate.Create('actValue', 'int', '0'),
        PlugPlate.Create('atTarget', 'bool', 'false')
      ]
    );

    this.SetData([
      { name: 'value', type: 'int' }
    ]);

    this.LoopCode =
      `
      if (inc)
        data->value++;
      *actValue = data->value;
      *atTarget = (data->value >= data->atTarget);
      `,
      false
    ;

    this.SetupCode =
      `
      data->value = 0;
      `,
      false
    ;
  }

  SetupCode() {}
  LoopCode() {}
}

class Block_And extends CBlock {
  constructor() {
    super("and");
  }

  Init() {
    let nGrids = Math.max(+this.configs.size, 2);

    let plugs = [PlugPlate.Create('out', 'bool', 'false')];
    for (var gIdx = 0; gIdx < nGrids; gIdx++)
      plugs.push(PlugGrid.Create(`in_${gIdx}`, 'bool', 'false'));

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
let b5 = Block_And.Create({ size: 10 });
let b6 = Block_And.Create({ size: 2 });

let b7 = new CLBlock("dispenser");

class Main extends WLBlock {
  constructor() {
    super("main");
  }

  Init() {
    this.SetPlugs(
      [
        PlugGrid.Create('D1', 'bool', 'false'),
        PlugGrid.Create('D2', 'bool', 'false'),

        PlugPlate.Create('D10', 'bool', 'false'),
        PlugPlate.Create('D11', 'bool', 'false')
      ]
    );
  }
}

// CL Test
var prevStep = null;

let s001 = CLStep.Create(WLBlock, 'Init');
let s002 = CLStep.Create(WLBlock, 'WaitStart');

let s003a = CLStep.Create(WLBlock, 'DispenseLeft_Work');
let s004a = CLStep.Create(WLBlock, 'DispenseLeft_Rest');

let s003b = CLStep.Create(WLBlock, 'CycleType').SetExitPlates(['Double', 'Single']);

let s004b = CLStep.Create(WLBlock, 'DispenseRight_Work');
let s005b = CLStep.Create(WLBlock, 'DispenseRight_Rest');

let s004c = CLStep.Create(WLBlock, 's004c');

let s006b = CLStep.Create(WLBlock, 's006b');

let s007a = CLStep.Create(WLBlock, 'End');

let seq = CLSequence.Create([
  s001,
  s002,
  CLSequence.CreateParallel([
    CLSequence.Create([
      s003a,
      s004a
    ]),
    CLSequence.Create([
      CLSequence.CreateConditional(
        s003b,
        {
          Double: CLSequence.Create([
            s004b,
            s005b
          ]),
          Single: CLSequence.Create([
            s004c
          ])
        }
      ),
      s006b
    ])
  ]),
  s007a
]);

b7.AddSteps([s001,s002,s003a,s004a,s003b,s004b,s005b,s004c,s006b,s007a]);
b7.SetSequence(seq);

// WL Test
let mainBlock = Main.Create();
mainBlock.AddBlock([b1, b2, b3, b4, b5, b6, b7]);

mainBlock.ConnectPlugs([
  b1.FindPlugByName("out"),
  b2.FindPlugByName("inc"),
  b3.FindPlugByName("reset")
]);

mainBlock.ConnectPlugs([
  b2.FindPlugByName("reset"),
  b6.FindPlugByName("out")
]);

mainBlock.ConnectPlugs([
  mainBlock.FindPlugByName("D1"),
  b6.FindPlugByName("in_0")
]);

mainBlock.ConnectPlugs([
  mainBlock.FindPlugByName("D2"),
  b6.FindPlugByName("in_1")
]);

mainBlock.ConnectPlugs([
  b6.FindPlugByName("out"),
  mainBlock.FindPlugByName("D10"),
  mainBlock.FindPlugByName("D11")
]);


// BOARD test
let mainBoard = ArduinoUno_Board.Create(mainBlock);



let genMainSource = mainBlock.GenerateSource();

let genFinalSourceParts = [
  mainGenerator.GenerateComment('    ______  __ __    ___  ____   ___ ___  ____  ___   ____   ____  __  _ '),
  mainGenerator.GenerateComment('   |      ||  |  |  /  _]|    \\ |   |   ||    |/   \\ |    \\ |    ||  |/ ]'),
  mainGenerator.GenerateComment('   |      ||  |  | /  [_ |  D  )| _   _ | |  ||     ||  _  | |  | |  \' / '),
  mainGenerator.GenerateComment('   |_|  |_||  _  ||    _]|    / |  \\_/  | |  ||  O  ||  |  | |  | |    \\ '),
  mainGenerator.GenerateComment('     |  |  |  |  ||   [_ |    \\ |   |   | |  ||     ||  |  | |  | |     |'),
  mainGenerator.GenerateComment('     |  |  |  |  ||     ||  .  \\|   |   | |  ||     ||  |  | |  | |  .  |'),
  mainGenerator.GenerateComment('     |__|  |__|__||_____||__|\\_||___|___||____|\\___/ |__|__||____||__|\\_|'),
  '',
  '#include <stdlib.h>',
  '#include <unistd.h>',
  '#include <stdbool.h>',
  ''
];
for (var dKey in dependencies)
  genFinalSourceParts.push(dependencies[dKey].source);

genFinalSourceParts.push(genMainSource.source);

let genFinalSource = genFinalSourceParts.join('\n');

//console.log(genFinalSource);