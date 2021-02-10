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

// WL Test
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

    let b1 = Block_OneShot.Create();
    let b2 = Block_Counter.Create();
    let b3 = Block_Counter.Create();
    
    let b4 = Block_And.Create({ size: 10 });
    let b5 = Block_And.Create({ size: 10 });
    let b6 = Block_And.Create({ size: 2 });

    this.ConnectPlugs([
      b1.FindPlugByName("out"),
      b2.FindPlugByName("inc"),
      b3.FindPlugByName("reset")
    ]);

    this.ConnectPlugs([
      b2.FindPlugByName("reset"),
      b6.FindPlugByName("out")
    ]);

    this.ConnectPlugs([
      this.FindPlugByName("D1"),
      b6.FindPlugByName("in_0")
    ]);

    this.ConnectPlugs([
      this.FindPlugByName("D2"),
      b6.FindPlugByName("in_1")
    ]);

    this.ConnectPlugs([
      b6.FindPlugByName("out"),
      this.FindPlugByName("D10"),
      this.FindPlugByName("D11")
    ]);
  }
}

// CL Test
class Dispenser extends CLBlock {
  constructor() {
    super("Dispenser");
  }

  Init() {
    this.SetPlugs(
      [
        PlugPlate.Create('Work_A', 'bool', 'false'),
        PlugPlate.Create('Rest_A', 'bool', 'false')
      ]
    );


    let s001 = CLStep.CreateDefault('Init');
    let s002 = CLStep.CreateDefault('WaitStart');
    
    let s003a = CLStep.CreateDefault('DispenseLeft_Work');
    let s004a = CLStep.CreateDefault('DispenseLeft_Rest');
    
    let s003b = CLStep.Create(WLBlock, 'CycleType').SetExitPlates(['Double', 'Single']);
    
    let s004b = CLStep.CreateDefault('DispenseRight_Work');
    let s005b = CLStep.CreateDefault('DispenseRight_Rest');
    
    let s004c = CLStep.CreateDefault('s004c');
    
    let s006b = CLStep.CreateDefault('s006b');
    
    let s007a = CLStep.CreateDefault('End');
    
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

    this.SetSequence(seq);

    this.ConnectPlugs([
      s003a.block.FindPlugByName("Active"),
      this.FindPlugByName("Work_A")
    ]);
  }
}




let b7 = Dispenser.Create();

let mainBlock = Main.Create();




/*



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

//console.log(genFinalSource);*/