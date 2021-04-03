let mainGenerator = new CGenerator();
let sourceCache = {};

class Block_OneShot extends CBlock {
  constructor() {
    super("oneshot", false);
  }

  $Init() {
    this.AddPin(
      [
        GridPin.Create('in', 'bool', 'true'),
        PlatePin.Create('out', 'bool', 'false')
      ]
    );

    this.Data = [
      { name: 'lastval', type: 'bool', init: 'false' }
    ];

    this.LoopCode =
      `
      *out = (in && !data->lastval);
      data->lastval = in;
      `
    ;
  }

  InitCode() {}
  SetupCode() {}
}

class Block_Counter extends CBlock {
  constructor() {
    super("countercountercounter", false);
  }

  $Init() {
    this.author = "Michele Trombetta";

    this.AddPin(
      [
        GridPin.Create('inc', 'bool', 'false'),
        GridPin.Create('reset', 'bool', 'false'),

        PlatePin.Create('actValue', 'int', '0'),
      ]
    );

    this.Data = [{ name: 'value', type: 'int', init: '0' }];

    this.InitCode = null;

    this.LoopCode =
      `
      if (inc)
        data->value++;
      if (reset)
        data->value = 0;
      *actValue = data->value;
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
    super("NOT", false);
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
      `
    ;
  }

  InitCode() {}
  SetupCode() {}
}

class Block_And extends CBlock {
  constructor() {
    super("and", true);
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

class Block_Or extends CBlock {
  constructor() {
    super("or", true);
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
    return `*out = ${gridNames.join(' || ')};`;
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
    let plugs = [GridSocket.Create({ id: 'in', type: 'bool', init: 'false'})];
    let nGrids = Math.max(+this.configs.size, 2);
    for (var gIdx = 0; gIdx < nGrids; gIdx++) {
      let p_in = PlateSocket.Create({ id: `out_${gIdx}`, type: 'bool', init: 'false'});
      plugs.push(p_in);
    }
    this.AddPlug(plugs);
    // Wiring
    this.ConnectWire(plugs);
  }

  static $DefaultConfigs() {
    return { size: 2 };
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
    //let bb = Dispenser.Create();

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
  }
}

// CL Test

class Dispenser extends CLBlock {
  constructor() {
    super("Dispenser");
  }

  $Init() {
    let p_Work_A = PlateSocket.Create({ id: 'Work_A', type: 'bool', init: 'false'});
    let p_Rest_A = PlateSocket.Create({ id: 'Rest_A', type: 'bool', init: 'false'});

    this.AddPlug([ p_Work_A, p_Rest_A ]);
/*
    let s001 = CLStep.CreateDefault('Init');

    let s002 = CLStep.CreateDefault('WaitStart', { grids: ['start']});
    
    let s003a = CLStep.CreateDefault('DispenseLeft_Work');
    let s004a = CLStep.CreateDefault('DispenseLeft_Rest');
    
    let s003b = CLStep.Create(WLBlock, 'CycleType', { exits: ['Double', 'Single']});
    
    let s004b = CLStep.CreateDefault('DispenseRight_Work');
    let s005b = CLStep.CreateDefault('DispenseRight_Rest');
    
    let s004c = CLStep.CreateDefault('s004c');
    
    let s006b = CLStep.CreateDefault('s006b');
    
    let s007a = CLStep.CreateDefault('End');

    let seq = ([
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
*/

    let seq = [
      CLStep.CreateDefault('s001'),
      CLStep.CreateDefault('s002'),
      CLStep.CreateDefault('s003'),
      CLStep.CreateDefault('s004'),
      CLStep.CreateDefault('s005')
    ];

    this.AddStep(seq);
  }
}



let b6 = Block_WL.Create();
let b7 = Dispenser.Create();

let arduino_pins = [0, 1, 2, 4, 5];
for (var pIdx in arduino_pins) {
  let pVal = arduino_pins[pIdx];
  let block = b7.blocks[pIdx];

  var p = Arduino_DigitalInput_Plug.Create({ pin: pVal, pull: 'up' });
  var n = Block_Not.Create();
  var a = Block_And.Create();
  block.AddPlug(p);
  block.AddBlock([a, n]);
  block.DisconnectWire([block.plug.Done]);
  block.ConnectWire([
    p.pin.plate.value,
    n.pin.in
  ]);
  block.ConnectWire([
    n.pin.out,
    a.pin.in_0
  ]);
  block.ConnectWire([
    block.plug.StepDefaultGridSocket.pin.Active,
    a.pin.in_1
  ]);
  block.ConnectWire([
    a.pin.out,
    block.plug.Done
  ]);
}

var po_3 = Arduino_DigitalOutput_Plug.Create({ pin: 3 });
var po_7 = Arduino_DigitalOutput_Plug.Create({ pin: 7 });
var po_9 = Arduino_DigitalOutput_Plug.Create({ pin: 9 });
var po_8 = Arduino_DigitalOutput_Plug.Create({ pin: 8 });
var po_10 = Arduino_DigitalOutput_Plug.Create({ pin: 10 });
var po_11 = Arduino_DigitalOutput_Plug.Create({ pin: 11 });
var po_12 = Arduino_DigitalOutput_Plug.Create({ pin: 12 });
var po_13 = Arduino_DigitalOutput_Plug.Create({ pin: 13 });

b7.AddPlug([
  po_3,
  po_7,
  po_9,
  po_8,
  po_10,
  po_11,
  po_12,
  po_13
]);

b7.ConnectWire([
  po_3.pin.value,
  b7.blocks[0].pin.IsActive
]);

b7.ConnectWire([
  po_7.pin.value,
  b7.blocks[1].pin.IsActive
]);

b7.ConnectWire([
  po_9.pin.value,
  b7.blocks[2].pin.IsActive
]);

b7.ConnectWire([
  po_8.pin.value,
  b7.blocks[3].pin.IsActive
]);

b7.ConnectWire([
  po_10.pin.value,
  b7.blocks[4].pin.IsActive
]);

let mainBlock = Main.Create();
let mainBoard = ArduinoUno_Board.Create(b7);

let ui = new UI();

ui.SetToolbox({
  boards: [
    ArduinoUno_Board
  ],
  tubes: [
    PlateSocket,
    GridSocket,

    Block_Not,
    Block_And,
    Block_OneShot,
    Block_Counter,

    Arduino_DigitalInput_Plug,
    Arduino_DigitalOutput_Plug,
    Arduino_OLEDNumber_Plug
  ]
});
/*
ui.Execute("BOARD ArduinoUno_Board");
ui.Execute("ADD PLUG Arduino_DigitalInput_Plug 1 {pin:2}");
ui.Execute("ADD PLUG Arduino_DigitalInput_Plug 2 {pin:3}");
ui.Execute("ADD PLUG Arduino_OLEDNumber_Plug 1");

ui.Execute("ADD BLOCK Block_OneShot B1");
ui.Execute("ADD BLOCK Block_Counter C1");

ui.Execute('connect PG_1.value B1.in C1.reset');
//ui.Execute('connect PG_2.value C1.reset');
ui.Execute('connect B1.out C1.inc');
ui.Execute('connect C1.actValue PP_1.value_0');

ui.Execute('create c xor');
ui.Execute('pin add I A bool false');
ui.Execute('pin add I B bool false');
ui.Execute('pin add O Y bool false');
ui.Execute('code init ""')
ui.Execute('code setup ""')
ui.Execute('code loop ""')
ui.Execute('editor save');

ui.Execute('add block CBlock_xor B2');

ui.Execute('connect PG_2.value B2.a');
*/
//ui.Execute("MOVE B1 B3");
//ui.Execute("MOVE B3 D2");

/*
ui.Execute("ADD BLOCK Block_And C3 {size:10}");
ui.Execute("ADD BLOCK Block_Not");
ui.Execute('connect b_8.out b_7.in_2');
ui.Execute('connect b_8.out b_7.in_2 b_7.in_4')

ui.Execute('create wl chmod')
ui.Execute('editor save')

ui.Execute("ADD BLOCK WLBlock_chmod");

ui.Execute('editor edit WLBlock_chmod')
ui.Execute("ADD BLOCK Block_Not");

ui.Execute('editor save') // IT MUST UPDATE ALL THE CREATED INSTANCES OF WLBLOCK_CHMOD
*/

//console.log(mainBoard.Generate());
//Helpers.download('main.ino', ui.board.Generate());


// GUI
let renderJS = SVG('render').size('100%', '100%');

renderJS.clear();

let workspace = new WLBlock.Workspace(renderJS, ui.activeEditor.target);
