let mainGenerator = new CGenerator();

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

  InitCode() {}
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

    this.InitCode = null;

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
      target: 100
    };
  }
}

class Block_Not extends CBlock {
  constructor() {
    super("not");
  }

  Init() {
    this.SetPins(
      [
        PinGrid.Create('in', 'bool', 'false'),
        PinPlate.Create('out', 'bool', 'false')
      ]
    );

    this.LoopCode =
      `
      *out = !in;
      `,
      false
    ;
  }

  InitCode() {}
  SetupCode() {}
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

  InitCode() {}
  SetupCode() {}

  LoopCode() {
    let gridPins = this.pin.grids;
    let gridNames = gridPins.map(p => p.name);
    return `*out = ${gridNames.join(' && ')};`;
  }

  static DefaultConfigs() {
    return { size: 2 };
  }
}

class Block_WL extends WLBlock {
  constructor() {
    super("WLLLLL");
  }

  Init() {
    // Plugs
    let p_in = PlugGrid.Create({ id: 'in', type: 'bool', init: 'false'});
    let p_out = PlugPlate.Create({ id: 'out', type: 'bool', init: 'false'});
    this.SetPlugs([ p_in, p_out ]);

    // Wiring
    this.ConnectWire([
      p_in,
      p_out
    ]);
  }
}

// WL Test
class Main extends WLBlock {
  constructor() {
    super("main");
  }

  Init() {
    // Plugs
    let p_D1 = PlugGrid.Create({ id: 'D1', type: 'bool', init: 'false'});
    let p_D2 = PlugGrid.Create({ id: 'D2', type: 'bool', init: 'false'});
    
    let p_di_2 = Arduino_DigitalInput_Plug.Create({ pin: 2 });

    let p_D10 = PlugPlate.Create({ id: 'D10', type: 'bool', init: 'false'});
    let p_D11 = PlugPlate.Create({ id: 'D11', type: 'int', init: '0'});

    let p_do_13 = Arduino_DigitalOutput_Plug.Create({ pin: 3 });
    let p_do_oled = Arduino_OLEDNumber_Plug.Create({ n_values: 3 });

    this.SetPlugs([ p_D1, p_D2, p_D10, p_D11, p_di_2, p_do_13, p_do_oled ]);

    // Blocks
    /*
    let b1 = Block_OneShot.Create();
    let b2 = Block_Counter.Create();
    let b3 = Block_Counter.Create();
    
    let b4 = Block_And.Create({ size: 10 });
    let b5 = Block_WL.Create();
    let b6 = Block_And.Create({ size: 2 });
*/

    let b7 = Block_Not.Create();

    // Wiring
    this.ConnectWire([
      p_di_2.pin.value,
      b7.pin.in
    ]);
    this.ConnectWire([
      b7.pin.out,
      p_do_13.pin.value
    ]);
    this.ConnectWire([
      b7.pin.out,
      p_do_oled.pin.value_0,
      p_do_oled.pin.value_1
    ]);
    this.ConnectWire([
      p_di_2.pin.value,
      p_do_oled.pin.value_2
    ]);
/*
    this.ConnectWire([
      b1.pin.out,
      b2.pin.inc,
      b3.pin.reset
    ]);

    this.ConnectWire([
      p_D2,
      b5.pin.in
    ]);

    this.ConnectWire([
      b2.pin.reset,
      b5.pin.out
    ]);

    this.ConnectWire([
      p_D1,
      b6.pin.in_0
    ]);

    this.ConnectWire([
      p_D2,
      b6.pin.in_1
    ]);

    this.ConnectWire([
      b6.pin.out,
      p_D10
    ]);

    this.ConnectWire([
      p_D1,
      p_D11
    ])
    */
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

let mainBoard = ArduinoUno_Board.Create(mainBlock);

console.log(mainBoard.Generate());
