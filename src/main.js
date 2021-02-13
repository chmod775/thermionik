let mainGenerator = new CGenerator();

let dependencies = {};

class Block_OneShot extends CBlock {
  constructor() {
    super("oneshot");
  }

  Init() {
    this.SetPins(
      [
        PinGrid.Create('in', 'bool', 'true'),
        PinPlate.Create('out', 'bool', 'false')
      ]
    );

    this.Data = [
      { name: 'lastval', type: 'bool' }
    ];

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

    this.SetPins(
      [
        PinGrid.Create('inc', 'bool', 'false'),
        PinGrid.Create('reset', 'bool', 'false'),

        PinPlate.Create('actValue', 'int', '0'),
        PinPlate.Create('atTarget', 'bool', 'false')
      ]
    );

    this.Data = [{ name: 'value', type: 'int' }];

    this.LoopCode =
      `
      if (inc)
        data->value++;
      *actValue = data->value;
      *atTarget = (data->value >= data->atTarget);
      `
    ;

    this.SetupCode =
      `
      data->value = 0;
      `
    ;
  }

  static DefaultSettings() {
    return {
      target: 2
    };
  }
}

class Block_And extends CBlock {
  constructor() {
    super("and");
  }

  Init() {
    let nGrids = Math.max(+this.configs.size, 2);

    let plugs = [PinPlate.Create('out', 'bool', 'false')];
    for (var gIdx = 0; gIdx < nGrids; gIdx++)
      plugs.push(PinGrid.Create(`in_${gIdx}`, 'bool', 'false'));

    this.SetPins(plugs);
  }

  SetupCode() {}

  LoopCode() {
    let gridPins = this.GetGridPins();
    let gridNames = gridPins.map(p => p.name);
    return `*out = ${gridNames.join(' && ')};`;
  }

  static DefaultConfigs() {
    return { size: 2 };
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
        PlugGrid.Create({ id: 'D1', type: 'bool', init: 'false'}),
        PlugGrid.Create({ id: 'D2', type: 'bool', init: 'false'}),

        PlugPlate.Create({ id: 'D10', type: 'bool', init: 'false'}),
        PlugPlate.Create({ id: 'D11', type: 'int', init: '0'})
      ]
    );

    let b1 = Block_OneShot.Create();
    let b2 = Block_Counter.Create();
    let b3 = Block_Counter.Create();
    
    let b4 = Block_And.Create({ size: 10 });
    let b5 = Block_And.Create({ size: 10 });
    let b6 = Block_And.Create({ size: 2 });

    this.ConnectWire([
      b1.FindPinByName("out"),
      b2.FindPinByName("inc"),
      b3.FindPinByName("reset")
    ]);

    this.ConnectWire([
      b2.FindPinByName("reset"),
      b6.FindPinByName("out")
    ]);

    this.ConnectWire([
      this.FindPinByName("D1"),
      b6.FindPinByName("in_0")
    ]);

    this.ConnectWire([
      this.FindPinByName("D2"),
      b6.FindPinByName("in_1")
    ]);

    this.ConnectWire([
      b6.FindPinByName("out"),
      this.FindPinByName("D10"),
      this.FindPinByName("D11")
    ]);
    
  }
}

// CL Test
/*
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
*/
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