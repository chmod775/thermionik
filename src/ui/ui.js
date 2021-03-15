class UIEditor {
  constructor(ui, target) {
    this.ui = ui;
    this.target = target;
  }
}

class UIEditor_CBlock extends UIEditor {
  $pin = {
    add: new UI_Command(
      'Add a new pin.',
      [
        { name: 'direction', desc: 'Direction of the pin. I- Input, O- Output' },
        { name: 'name', desc: 'Name of the pin.' },
        { name: 'type', desc: 'Type of the pin.' },
        { name: 'init', desc: 'Init value of the pin.' }
      ],
      (args) => {
        let arg_direction = args.direction.toUpperCase();
        let arg_name = args.name.toLowerCase();
        let arg_type = args.type.toLowerCase();
        let arg_init = args.init;

        let pinDirectionPlate = (arg_direction[0] == 'O');

        let pinClass = pinDirectionPlate ? PlatePin : GridPin;
        let newPinInstance = pinClass.Create(arg_name, arg_type, arg_init);

        this.target.AddPin(newPinInstance);

        return UI_Feedback.Success(`Added pin ${arg_name}.`, newPinInstance);
      }
    ),

    remove: new UI_Command(
      'Remove existing pin by name.',
      [
        { name: 'name', desc: 'Name of the pin to remove.' }
      ],
      (args) => {
        let arg_name = args.name.toLowerCase();

        let foundPin = this.target.pin.plates.find(b => b.name.toLowerCase() == arg_name) ?? this.target.pin.grids.find(b => b.name.toLowerCase() == arg_name);
        if (!foundPin) { return UI_Feedback.Error(`Pin with name ${arg_name} not found.`); } 

        this.target.RemovePin(foundPin);

        return UI_Feedback.Success(`Removed pin ${arg_name}.`, foundPin);
      }
    )
  }

}
UIEditor.CBlock = UIEditor_CBlock;

class UIEditor_WLBlock extends UIEditor {
  $add = {
    block: new UI_Command(
      'Add a block.',
      [
        { name: 'name', desc: 'Name of the block to add.' },
        { name: 'pos', desc: 'Final position of the added block (ex. C3).' },
        { name: 'configs', desc: '[OPTIONAL] configs of the block.' }
      ],
      (args) => {
        let arg_name = args.name.toUpperCase();
        let arg_pos = args.pos;
        let arg_configs = eval(`(${args.configs})`) ?? {}; // TO BE FIXED AND SANITIZED

        let foundBlock = this.ui.toolbox.tubes.find(b => b.name.toUpperCase() == arg_name);
        if (!foundBlock) { return UI_Feedback.Error(`Block ${arg_name} does not exists.`); } 

        let newBlockInstance = foundBlock.Create(arg_configs);
        newBlockInstance.guid = arg_pos;

        this.target.AddBlock(newBlockInstance);

        return UI_Feedback.Success(`Added block ${arg_name}.`, newBlockInstance);
      }
    ),

    plug: new UI_Command(
      'Add a plug',
      [
        { name: 'name', desc: 'Name of the block to add.' },
        { name: 'row', desc: 'Final row of the added block (ex. 2).' },
        { name: 'configs', desc: '[OPTIONAL] configs of the block.' }
      ],
      (args) => {
        let arg_name = args.name.toUpperCase();
        let arg_row = args.row;
        let arg_configs = eval(`(${args.configs})`) ?? {}; // TO BE FIXED AND SANITIZED

        let foundPlug = this.ui.toolbox.tubes.find(b => b.name.toUpperCase() == arg_name);
        if (!foundPlug) { return UI_Feedback.Error(`Plug ${arg_name} does not exists.`); } 

        let newPlugInstance = foundPlug.Create(arg_configs);
        newPlugInstance.guid = (newPlugInstance.IsPlatePlug() ? 'PP_' : 'PG_') + arg_row;

        this.target.AddPlug(newPlugInstance);

        return UI_Feedback.Success(`Added plug ${arg_name}.`, newPlugInstance);
      }
    )
  };

  $remove = new UI_Command(
    'Remove block or plug.',
    [
      { name: 'guid', desc: 'GUID of the block to remove'}
    ],
    (args) => {
      let arg_guid = args.guid.toLowerCase();

      let foundBlock = this.target.blocks.find(b => b.guid.toLowerCase() == arg_guid);
      let foundPlug = this.target.plug.plates.find(b => b.guid.toLowerCase() == arg_guid) ?? this.target.plug.grids.find(b => b.guid.toLowerCase() == arg_guid);
      if (!foundBlock && !foundPlug) { return UI_Feedback.Error(`Entity with GUID ${arg_guid} not found.`); } 

      if (foundBlock)
        this.target.RemoveBlock(foundBlock);

      if (foundPlug)
        this.target.RemovePlug(foundPlug);

      return UI_Feedback.Success(`Removed entity ${arg_guid}.`, foundBlock ?? foundPlug);
    }
  );

  $connect = new UI_Command(
    'Connect two or more pins together.',
    [
      { name: 'pins', desc: 'List of pins to connect', variable: true }
    ],
    (args) => {
      let arg_pins = args.pins;

      let pinsToConnect = [];

      for (var pId of arg_pins) {
        let pId_parts = pId.split('.');
        if (pId_parts.length != 2) { return UI_Feedback.Error(`Wrong format for pin ID ${pId}.`); }
        let pBlockGUID = pId_parts[0].toLowerCase();
        let pName = pId_parts[1];

        let foundPlug = this.target.plug.plates.find(b => b.guid.toLowerCase() == pBlockGUID) ?? this.target.plug.grids.find(b => b.guid.toLowerCase() == pBlockGUID);
        let foundBlock = this.target.blocks.find(b => b.guid.toLowerCase() == pBlockGUID) ?? foundPlug;
        if (!foundBlock) { return UI_Feedback.Error(`Pin block with GUID ${pBlockGUID} not found.`); } 

        let foundBlockPin = foundBlock.pin[pName];
        if (!foundBlockPin) { return UI_Feedback.Error(`Pin with name ${pName} not found in block with GUID ${pBlockGUID}.`); } 

        pinsToConnect.push(foundBlockPin);
      }

      let retWire = this.target.ConnectWire(pinsToConnect);

      if (retWire)
        return UI_Feedback.Success(`Connected pins.`, retWire);
      else
        return UI_Feedback.Error(`Error connecting pins.`, pinsToConnect);
    }
  );
}
UIEditor.WLBlock = UIEditor_WLBlock;


class UI_Feedback {
  constructor() {
    this.success = false;
    this.message = null;
    this.payload = null;
  }

  static Success(message, payload) {
    let ret = new UI_Feedback();
    ret.success = true;
    ret.message = message;
    ret.payload = payload;
    return ret;
  }

  static Error(message) {
    let ret = new UI_Feedback();
    ret.success = false;
    ret.message = message;
    ret.payload = null;
    return ret;
  }
}

class UI_CommandGroup {

}

class UI_Command {
  constructor(description, args, callback) {
    this.description = description;
    this.args = args;
    this.callback = callback;
  }
}

class UI {
  constructor() {
    this.toolbox = {
      boards: [],
      tubes: [],
      plugs: []
    };

    this.main = new WLBlock('main');
    this.board = null;

    this.activeEditor = new UIEditor.WLBlock(this, this.main);
    this.editors = [this.activeEditor];
  }

  SetToolbox(toolbox) {
    this.toolbox = Object.assign(this.toolbox, toolbox ?? {});
  }

  Call(name, args) {
    let fn = this['$' + name.toLowerCase()];
    if (!fn) console.error(`Command ${name} not found!`);
    fn.callback.call(this, args);
  }

  Execute(cmd) {
    console.log(`> ${cmd}`);
    
    let cmd_parts = cmd.split(' ');

    if (cmd_parts.length > 0) {
      var fn_name = cmd_parts.shift();

      var fn = this['$' + fn_name.toLowerCase()];
      if (!fn) {
        fn = this.activeEditor['$' + fn_name.toLowerCase()];
        if (!fn) console.error(`Command ${fn_name} not found!`);
      }

      if (!(fn instanceof UI_Command)) {
        fn_name = cmd_parts.shift();
        fn = fn[fn_name.toLowerCase()];
        if (!fn) console.error(`Category ${fn_name} not found!`);
      }

      let fn_args = (fn.args instanceof Function) ? fn.args() : fn.args;
      let call_args = {};
      for (var argIdx in fn_args) {
        let arg = fn_args[argIdx];
        if (arg.variable) {
          call_args[arg.name] = cmd_parts.splice(+argIdx);
        } else
          call_args[arg.name] = cmd_parts[+argIdx] ?? null;
      }

      let fn_ret = fn.callback.call(this, call_args);
      if (!(fn_ret instanceof UI_Feedback)) console.error("Wrong feedback from command!");

      if (fn_ret.success)
        console.log(`OK - ${fn_ret.message}`, fn_ret.payload);
      else
        console.error(`ERROR - ${fn_ret.message}`);
    }
  }

  CreateEditor(block, activate) {
    let newEditor = new UIEditor[block.constructor.lang()](this, block);

    this.editors.push(newEditor);
    if (activate ?? true)
      this.activeEditor = newEditor;

    return newEditor;
  }

  /* ##### Commands ##### */
  $save = new UI_Command(
    'Save a project.',
    [
      { name: 'filename', desc: 'Filename of the destination file.' }
    ],
    (args) => {

    }
  );

  $open = new UI_Command(
    'Open a project.',
    [
      { name: 'filename', desc: 'Filename of the source file.' }
    ],
    (args) => {

    }
  );

  $create = new UI_Command(
    'Create a new block.',
    [
      { name: 'type', desc: 'Type of new block:\n\tC - C Block\n\tWL - Wiring language\n\tCL - Cycle language' },
      { name: 'name', desc: 'Name of the new block' }
    ],
    (args) => {
      let arg_type = args.type.toUpperCase();
      let arg_name = args.name;

      let blockTypes = {
        C: CBlock,
        WL: WLBlock,
        CL: CLBlock
      };

      let blockClass = blockTypes[arg_type];
      if (!blockClass) { return UI_Feedback.Error(`Type of new block ${arg_type} not supported at the moment.`); }

      let newBlockInstance = new blockClass(arg_name);

      this.CreateEditor(newBlockInstance, true);

      return UI_Feedback.Success(`${arg_type} Block named ${arg_name} created.`, newBlockInstance);
    }
  );

  $board = new UI_Command(
    'Set type of board.',
    () => {
      return [
        { name: 'name', desc: `Available boards: ${this.toolbox.boards.map(t => '\t- ' + t.name).join("\n")}`}
      ];
    },
    (args) => {
      let arg_name = args.name.toUpperCase();

      let foundBoard = this.toolbox.boards.find(b => b.name.toUpperCase() == arg_name);
      if (!foundBoard) { return UI_Feedback.Error(`Board ${arg_name} not supported at the moment.`); }

      this.board = foundBoard.Create(this.main);

      return UI_Feedback.Success("Board created.", this.board);
    }
  );

  /* ### EDITORS ### */
  $editor = {
    edit: new UI_Command(
      'Edit a block.',
      () => {
        return [
          { name: 'name', desc: `Name of the block to edit. (Ex. ${this.toolbox.tubes.slice(0, 3).map(t => '\t- ' + t.name).join(", ")}...)`}
        ];
      },
      (args) => {
        let arg_name = args.name.toUpperCase();
        
        let foundBlock = this.toolbox.tubes.find(b => b.name.toUpperCase() == arg_name);
        if (!foundBlock) { return UI_Feedback.Error(`Block ${arg_name} does not exists.`); }

        let foundEditor = this.editors.find(e => e.target == foundBlock);
        if (foundEditor) { return UI_Feedback.Error(`Block ${arg_name} already edited.`); }

        let newBlockInstance = foundBlock.Create();

        this.CreateEditor(newBlockInstance, true);

        return UI_Feedback.Success(`Edited block ${arg_name} in editor slot ${this.editors.length - 1}.`, this.activeEditor);
      }
    ),

    save: new UI_Command(
      'Save changes of actual editor.',
      [],
      (args) => {
        if (this.editors.length <= 1) return UI_Feedback.Error(`Cannot save main.`);

        let block = this.activeEditor.target;
        let blockEvalCode = block.$GenerateClass();

        let ret = eval(blockEvalCode);

        let foundTube = this.toolbox.tubes.findIndex(t => t.name == ret.name);
        if (foundTube < 0)
          this.toolbox.tubes.push(ret);
        else
          this.toolbox.tubes[foundTube] = ret;
        
        this.editors.pop();
        this.activeEditor = this.editors[this.editors.length - 1];

        return UI_Feedback.Success(`Block saved with success.`, this.activeEditor);
      }
    ),

    cancel: new UI_Command(
      'Cancel changes of actual editor.',
      [
        { name: 'confirm', desc: 'Please confirm with Y or YES' }
      ],
      (args) => {
        let arg_confirm = (args.confirm ?? '').toUpperCase();

        if (arg_confirm[0] != 'Y') return UI_Feedback.Error(`Please confirm with Y or YES as argument.`);

        if (this.editors.length <= 1) return UI_Feedback.Error(`Cannot close all editors.`);

        return UI_Feedback.Success(`Editor closed.`, this.activeEditor);
      }
    ),

    switch: new UI_Command(
      'Switch to a opened editor.',
      [
        { name: 'index', desc: 'Index of the editor to activate' }
      ],
      (args) => {
        let arg_index = +args.index;

        if (arg_index >= this.editors.length) { return UI_Feedback.Error(`Editor with index ${arg_index} not opened.`); }

        this.activeEditor = this.editors[arg_index];

        return UI_Feedback.Success(`Editor ${arg_index} activated.`, this.activeEditor);
      }
    )
  };

}

