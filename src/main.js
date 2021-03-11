let mainGenerator = new CGenerator();

class Block_OneShot extends CBlock {
  constructor() {
    super("oneshot");
  }

  $Init() {
    this.AddPin(
      [
        GridPin.Create('in', 'bool', 'true'),
        PlatePin.Create('out', 'bool', 'false')
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

  $Init() {
    this.author = "Michele Trombetta";

    this.AddPin(
      [
        GridPin.Create('inc', 'bool', 'false'),
        GridPin.Create('reset', 'bool', 'false'),

        PlatePin.Create('actValue', 'int', '0'),
        PlatePin.Create('atTarget', 'bool', 'false')
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

  static $DefaultSettings() {
    return {
      target: 100
    };
  }
}

class Block_Not extends CBlock {
  constructor() {
    super("NOT");
  }

  $Init() {
    this.AddPin(
      [
        GridPin.Create('in', 'bool', 'false'),
        PlatePin.Create('out', 'bool', 'false')
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

  $Init() {
    let nGrids = Math.max(+this.configs.size, 2);

    let pins = [PlatePin.Create('out', 'bool', 'false')];
    for (var gIdx = 0; gIdx < nGrids; gIdx++)
      pins.push(GridPin.Create(`in_${gIdx}`, 'bool', 'false'));

    this.AddPin(pins);
  }

  InitCode() {}
  SetupCode() {}

  LoopCode() {
    let gridPins = this.pin.grids;
    let gridNames = gridPins.map(p => p.name);
    return `*out = ${gridNames.join(' && ')};`;
  }

  static $DefaultConfigs() {
    return { size: 2 };
  }
}

class Block_WL extends WLBlock {
  constructor() {
    super("WLLLLL");
  }

  $Init() {
    let p_in = GridSocket.Create({ id: 'in', type: 'bool', init: 'false'});
    let p_out = PlateSocket.Create({ id: 'out', type: 'bool', init: 'false'});
    this.AddPlug([ p_in, p_out ]);

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

  $Init() {
    // Plugs
    let p_di_2 = Arduino_DigitalInput_Plug.Create({ pin: 2 });

    let p_do_13 = Arduino_DigitalOutput_Plug.Create({ pin: 3 });
    let p_do_oled = Arduino_OLEDNumber_Plug.Create({ n_values: 3 });

    this.AddPlug([ p_di_2, p_do_13, p_do_oled ]);

    // Blocks
    let b7 = Block_Not.Create();

    this.AddBlock(b7);

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

    // GUI
    b7.SetGui({ col: 3, row: 2 })
  }
}

// CL Test
/*
class Dispenser extends CLBlock {
  constructor() {
    super("Dispenser");
  }

  $Init() {
    let p_Work_A = PlateSocket.Create({ id: 'Work_A', type: 'bool', init: 'false'});
    let p_Rest_A = PlateSocket.Create({ id: 'Rest_A', type: 'bool', init: 'false'});

    this.AddPlug([ p_Work_A, p_Rest_A ]);

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

//    this.SetSequence(seq);

    this.ConnectWire([
      p_di_2.pin.value,
      p_do_oled.pin.value_2
    ]);

  }
}
*/


//let b7 = Dispenser.Create();

let mainBlock = Main.Create();
let mainBoard = ArduinoUno_Board.Create(mainBlock);

// GUI
let renderJS = SVG().addTo('#render').size('100%', '100%');

renderJS.clear();

//let workspace = new WLBlock.Workspace(renderJS, mainBlock);

let ui = new UI();

ui.SetToolbox({
  boards: [
    ArduinoUno_Board
  ],
  tubes: [
    Block_Not,
    Block_And,
    Block_OneShot,
    Block_Counter,

    Arduino_DigitalInput_Plug
  ]
});

ui.Execute("BOARD ArduinoUno_Board");
ui.Execute("ADD BLOCK Block_And C3 {size:10}");
ui.Execute("ADD BLOCK Block_Not");
ui.Execute('connect b_8.out b_7.in_2');
ui.Execute('connect b_8.out b_7.in_2 b_7.in_4')

//console.log(mainBoard.Generate());
