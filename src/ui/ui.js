class UIEditor {
  constructor(ui, target) {
    this.ui = ui;
    this.target = target;
  }

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

      this.ui.CreateEditor(newBlockInstance, true);

      return UI_Feedback.Success(`${arg_type} Block named ${arg_name} created.`, newBlockInstance);
    }
  );

  $board = new UI_Command(
    'Set type of board.',
    () => {
      return [
        { name: 'name', desc: `Available boards: ${this.ui.toolbox.boards.map(t => '\t- ' + t.name).join("\n")}`}
      ];
    },
    (args) => {
      let arg_name = args.name.toUpperCase();

      let foundBoard = this.ui.toolbox.boards.find(b => b.name.toUpperCase() == arg_name);
      if (!foundBoard) { return UI_Feedback.Error(`Board ${arg_name} not supported at the moment.`); }

      this.ui.board = foundBoard.Create(this.ui.main);

      return UI_Feedback.Success("Board created.", this.ui.board);
    }
  );

  /* ### EDITORS ### */
  $editor = {
    $edit: new UI_Command(
      'Edit a block.',
      () => {
        return [
          { name: 'name', desc: `Name of the block to edit. (Ex. ${this.ui.toolbox.tubes.slice(0, 3).map(t => '\t- ' + t.name).join(", ")}...)`}
        ];
      },
      (args) => {
        let arg_name = args.name.toUpperCase();
        
        let foundBlock = this.ui.toolbox.tubes.find(b => b.name.toUpperCase() == arg_name);
        if (!foundBlock) { return UI_Feedback.Error(`Block ${arg_name} does not exists.`); }

        let foundEditor = this.ui.editors.find(e => e.target == foundBlock);
        if (foundEditor) { return UI_Feedback.Error(`Block ${arg_name} already edited.`); }

        let newBlockInstance = foundBlock.Create();

        this.ui.CreateEditor(newBlockInstance, true);

        return UI_Feedback.Success(`Edited block ${arg_name} in editor slot ${this.ui.editors.length - 1}.`, this.ui.activeEditor);
      }
    ),

    $save: new UI_Command(
      'Save changes of actual editor.',
      [],
      (args) => {
        if (this.ui.editors.length <= 1) return UI_Feedback.Error(`Cannot save main.`);

        let block = this.ui.activeEditor.target;
        let blockEvalCode = block.$GenerateClass();

        let ret = eval(blockEvalCode);

        let foundTube = this.ui.toolbox.tubes.findIndex(t => t.name == ret.name);
        if (foundTube < 0)
          this.ui.toolbox.tubes.push(ret);
        else
          this.ui.toolbox.tubes[foundTube] = ret;
        
        this.ui.editors.pop();
        this.ui.activeEditor = this.ui.editors[this.ui.editors.length - 1];

        return UI_Feedback.Success(`Block saved with success.`, ret);
      }
    ),

    $cancel: new UI_Command(
      'Cancel changes of actual editor.',
      [
        { name: 'confirm', desc: 'Please confirm with Y or YES' }
      ],
      (args) => {
        let arg_confirm = (args.confirm ?? '').toUpperCase();

        if (arg_confirm[0] != 'Y') return UI_Feedback.Error(`Please confirm with Y or YES as argument.`);

        if (this.ui.editors.length <= 1) return UI_Feedback.Error(`Cannot close all editors.`);

        return UI_Feedback.Success(`Editor closed.`, this.ui.activeEditor);
      }
    ),

    $switch: new UI_Command(
      'Switch to a opened editor.',
      [
        { name: 'index', desc: 'Index of the editor to activate' }
      ],
      (args) => {
        let arg_index = +args.index;

        if (arg_index >= this.ui.editors.length) { return UI_Feedback.Error(`Editor with index ${arg_index} not opened.`); }

        this.ui.activeEditor = this.ui.editors[arg_index];

        return UI_Feedback.Success(`Editor ${arg_index} activated.`, this.ui.activeEditor);
      }
    )
  };
}

class UIEditor_CBlock extends UIEditor {
  $pin = {
    $add: new UI_Command(
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

    $remove: new UI_Command(
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

  $code = {
    $init: new UI_Command(
      'Set init code of block.',
      [
        { name: 'code', desc: 'Name of the block to add.' }
      ],
      (args) => {
        let oldCode = this.target.InitCode;
        let newCode = args.code;
        this.target.InitCode = newCode;
        return UI_Feedback.Success(`Setted Init code with success.`, { newCode: newCode, oldCode: oldCode });
      },
      (args, value) => {}
    ),

    $setup: new UI_Command(
      'Set setup code of block.',
      [
        { name: 'code', desc: 'Name of the block to add.' }
      ],
      (args) => {
        let oldCode = this.target.SetupCode;
        let newCode = args.code;
        this.target.SetupCode = newCode;
        return UI_Feedback.Success(`Setted Setup code with success.`, { newCode: newCode, oldCode: oldCode });
      },
      (args, value) => {}
    ),

    $loop: new UI_Command(
      'Set loop code of block.',
      [
        { name: 'code', desc: 'Name of the block to add.' }
      ],
      (args) => {
        let oldCode = this.target.LoopCode;
        let newCode = args.code;
        this.target.LoopCode = newCode;
        return UI_Feedback.Success(`Setted Loop code with success.`, { newCode: newCode, oldCode: oldCode });
      },
      (args, value) => {}
    )
  }
}
UIEditor.CBlock = UIEditor_CBlock;

class UIEditor_WLBlock extends UIEditor {
  $add = {
    $block: new UI_Command(
      'Add a block.',
      [
        { name: 'name', desc: 'Name of the block to add.' },
        { name: 'pos', desc: 'Final position of the added block (ex. C3).' },
        { name: 'configs', desc: '[OPTIONAL] configs of the block.' }
      ],
      (args) => {
        let arg_name = args.name.toUpperCase();
        let arg_posRef = args.pos;
        let arg_pos = Helpers.refToPos(arg_posRef);
        let arg_configs = eval(`(${args.configs})`) ?? {}; // TO BE FIXED AND SANITIZED

        let foundBlock = this.ui.toolbox.tubes.find(b => b.name.toUpperCase() == arg_name);
        if (!foundBlock) { return UI_Feedback.Error(`Block ${arg_name} does not exists.`); } 

        let newBlockInstance = foundBlock.Create(arg_configs);
        newBlockInstance.UpdateProperties(arg_pos);

        this.target.AddBlock(newBlockInstance);

        return UI_Feedback.Success(`Added block ${arg_name}.`, newBlockInstance);
      },
      (args, result) => {
        return this.$remove.Do({ guid: result.payload.guid });
      }
    ),

    $plug: new UI_Command(
      'Add a plug',
      [
        { name: 'name', desc: 'Name of the block to add.' },
        { name: 'row', desc: 'Final row of the added block (ex. 2).' },
        { name: 'configs', desc: '[OPTIONAL] configs of the block.' }
      ],
      (args) => {
        let arg_name = args.name.toUpperCase();
        let arg_row = +args.row;
        let arg_configs = eval(`(${args.configs})`) ?? {}; // TO BE FIXED AND SANITIZED

        let foundPlug = this.ui.toolbox.tubes.find(b => b.name.toUpperCase() == arg_name);
        if (!foundPlug) { return UI_Feedback.Error(`Plug ${arg_name} does not exists.`); } 

        let newPlugInstance = foundPlug.Create(arg_configs);
        newPlugInstance.UpdateProperties({ row: arg_row });

        this.target.AddPlug(newPlugInstance);

        return UI_Feedback.Success(`Added plug ${arg_name}.`, newPlugInstance);
      },
      (args, result) => {
        return this.$remove.Do({ guid: result.payload.guid });
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
      let foundPlug = this.target.plug.all.find(b => b.guid.toLowerCase() == arg_guid);
      if (!foundBlock && !foundPlug) { return UI_Feedback.Error(`Entity with GUID ${arg_guid} not found.`); } 

      let foundEntity = foundBlock ?? foundPlug;

      let ret = {};
      ret.connections = this.target.DisconnectWire(foundEntity.pin.all);

      if (foundBlock) {
        this.target.RemoveBlock(foundBlock);
        ret.block = foundBlock;
      }

      if (foundPlug) {
        this.target.RemovePlug(foundPlug);
        ret.plug = foundPlug;
      }

      return UI_Feedback.Success(`Removed entity ${arg_guid}.`, ret);
    },
    (args, result) => {
      let res_isEntityPlug = result.payload.plug ? true : false;
      let res_entity = res_isEntityPlug ? result.payload.plug : result.payload.block;
      let res_connections = result.payload.connections;

      if (res_isEntityPlug)
        this.target.AddPlug(res_entity);
      else
        this.target.AddBlock(res_entity);

      let conn_ret = this.reconnectConnections(res_connections);
      if (!conn_ret.success) { return conn_ret; }

      return UI_Feedback.Success(`Undoed remove block.`, null);
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
    },
    (args, result) => {
      return this.$disconnect.Do(args);
    }
  );

  $disconnect = new UI_Command(
    'Disconnect one or more pins.',
    [
      { name: 'pins', desc: 'List of pins to connect', variable: true }
    ],
    (args) => {
      let arg_pins = args.pins;

      let pinsToDisconnect = [];

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

        pinsToDisconnect.push(foundBlockPin);
      }

      let retConnections = this.target.DisconnectWire(pinsToDisconnect);

      if (retConnections)
        return UI_Feedback.Success(`Connected pins.`, retConnections);
      else
        return UI_Feedback.Error(`Error connecting pins.`, pinsToDisconnect);
    },
    (args, result) => {
      let connections = result.payload;
      return this.reconnectConnections(connections);
    }
  );

  $move = new UI_Command(
    'Move a block or plug to a position.',
    [
      { name: 'src', desc: 'Source' },
      { name: 'pos', desc: 'Destination position' }
    ],
    (args) => {
      let arg_src = args.src.toLowerCase();

      let arg_posRef = args.pos;
      let arg_pos = Helpers.refToPos(arg_posRef);
    
      let foundPlug = this.target.plug.plates.find(b => b.guid.toLowerCase() == arg_src) ?? this.target.plug.grids.find(b => b.guid.toLowerCase() == arg_src);
      let foundBlock = this.target.blocks.find(b => b.guid.toLowerCase() == arg_src) ?? foundPlug;
      if (!foundBlock) { return UI_Feedback.Error(`Entity with GUID ${arg_src} not found.`); } 

      foundBlock.UpdateProperties(arg_pos);

      return UI_Feedback.Success(`Entity moved.`, foundBlock);
    },
    (args, result) => {
      return this.$move.Do({ src: args.pos, pos: args.src });
    }
  );

  /* ##### HELPERS ##### */
  reconnectConnections(connections) {
    for (var c of connections) {
      let wire = c.wire;
      let pins = c.pins;

      wire.ConnectPin(pins);
      if (!this.target.wires.includes(wire))
        this.target.wires.push(wire);

      /*
      let refPin = c.refPin;
      let pins = c.pins;

      var pinsToConnect = refPin ? [refPin] : [];
      pinsToConnect = pinsToConnect.concat(pins);

      var argPinsToConnect = pinsToConnect.map(p => `${p.block.guid}.${p.name}`);

      let do_ret = this.$connect.Do({ pins: argPinsToConnect });
      if (!do_ret.success) { return do_ret; }
      */
    }

    return UI_Feedback.Success(`Re-Connected pins.`, connections);
  }
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

class UI_Command {
  constructor(description, args, callback, undoCallback) {
    this._path = [];
    this.description = description;
    this.args = args;
    this.callback = callback;
    this.undoCallback = undoCallback;
  }

  Do(args) { return this.callback(args); }
  Undo(args, result) { return this.undoCallback(args, result); }

  CanUndo() { return this.undoCallback ? true : false; }
}

class UI_Action {
  constructor(raw, command, args) {
    this.raw = raw;
    this.command = command;
    this.args = args;
    this.result = null;
  }

  ToString() {
    let commandArgs = [];
    let fn_args = (this.command.args instanceof Function) ? this.command.args() : this.command.args;
    for (var argIdx in fn_args) {
      let arg = fn_args[argIdx];
      let argValue = this.args[arg.name] ?? '""';

      // Check also for escape sequence, etc...
      if (argValue.includes(' ')) argValue = `"${argValue}"`;
      
      commandArgs.push(argValue);
    }
    let commandPath = this.command._path.map(i => i.toUpperCase()).join(' ');
    return `${commandPath} ${commandArgs.join(' ')}`;
  }
  FromCommand(editor, cmd) {}

  ExecuteDo(target) {
    this.result = this.command.Do(this.args);
    return this.result;
  }

  ExecuteUndo(target) {
    return this.command.Undo(this.args, this.result);
  }

  CanUndo() { return this.command.CanUndo(); }
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

    this.history = [];
    this.redoHistory = [];
  }

  SetToolbox(toolbox) {
    this.toolbox = Object.assign(this.toolbox, toolbox ?? {});
  }

  Call(name, args) {
    let fn = this['$' + name.toLowerCase()];
    if (!fn) console.error(`Command ${name} not found!`);
    fn.callback.call(this, args);
  }

  SplitCommand(cmd) {
    let parts = [];

    var part = '';
    for (var chIdx = 0; chIdx < cmd.length; chIdx++) {
      var ch = cmd[chIdx];
      if (ch == ' ') {
        if (part.length > 0)
          parts.push(part);
        part = ''
      } else if (ch == '"') {
        do {
          chIdx++;
          ch = cmd[chIdx];
          if (ch == '"') {
            break;
          } else if (ch == '\\') {
            chIdx++;
            ch = cmd[chIdx];
            if (ch == 'n') part += '\n'; else
            if (ch == 'r') part += '\r'; else
            if (ch == 't') part += '\t'; else
            if (ch == 'v') part += '\v'; else
            if (ch == '0') part += '\0'; else
            if (ch == 'b') part += '\b'; else
            if (ch == 'f') part += '\f'; else
            if (ch == '\'') part += '\''; else
            if (ch == '"') part += '"'; else
            if (ch == '\\') part += '\\'; else
            console.error('Invalid escape sequence!');
          } else {
            part += ch;
          }
        } while (chIdx < cmd.length);
        if (part.length > 0)
          parts.push(part);
        part = '';
      } else {
        part += ch;
      }
    }

    if (part.length > 0)
      parts.push(part);

    return parts;
  }

  Execute(cmd) {
    console.log(`> ${cmd}`);

    let cmd_parts = this.SplitCommand(cmd);

    if (cmd_parts.length > 0) {
      let container = this.SearchCommand(this.activeEditor, cmd_parts);

      let fn_args = (container.args instanceof Function) ? container.args() : container.args;
      let call_args = {};
      for (var argIdx in fn_args) {
        let arg = fn_args[argIdx];
        if (arg.variable) {
          call_args[arg.name] = cmd_parts.splice(+argIdx);
        } else
          call_args[arg.name] = cmd_parts[+argIdx] ?? null;
      }

      let newAction = new UI_Action(cmd, container, call_args);

      let fn_ret = newAction.ExecuteDo(this);
      if (!(fn_ret instanceof UI_Feedback)) console.error("Wrong feedback from command!");

      if (fn_ret.success) {
        this.history.push(newAction);
        console.log(`OK - ${fn_ret.message}`, fn_ret.payload);
      } else
        console.error(`ERROR - ${fn_ret.message}`);
    }
  }

  SearchCommand(parent, parts) {
    var container = parent;
    let path = [];
    do {
      let commandName = parts.shift().toLowerCase();
      path.push(commandName);

      let fn_name = '$' + commandName;
      container = container[fn_name];
      if (!container) console.error(`Command ${fn_name} not found!`);
    } while (!(container instanceof UI_Command));
    container._path = path;
    return container;
  }

  CreateEditor(block, activate) {
    let newEditor = new UIEditor[block.constructor.lang()](this, block);

    this.editors.push(newEditor);
    if (activate ?? true)
      this.activeEditor = newEditor;

    return newEditor;
  }

  $Save(filename) {
    let saveContent = this.history.map(a => a.ToString()).join('\n');
    console.log(saveContent);
    //Helpers.download(filename, saveContent);
  }

  $Load(content) {
    console.log(content);
  }

  $Undo() {
    if (this.history.length <= 0) { console.error('Undo stack empty.'); return; }
    let undoAction = this.history.pop();
    this.redoHistory.push(undoAction);

    let ret = undoAction.ExecuteUndo();
    if (!(ret instanceof UI_Feedback)) console.error("Wrong feedback from command!");

    if (ret.success)
      console.log(`OK - ${ret.message}`, ret.payload);
    else
      console.error(`ERROR - ${ret.message}`);
  }

  $Redo() {
    if (this.redoHistory.length <= 0) { console.error('Redo stack empty.'); return; }
    let redoAction = this.redoHistory.pop();
    this.history.push(redoAction);

    let ret = redoAction.ExecuteDo();
    if (!(ret instanceof UI_Feedback)) console.error("Wrong feedback from command!");

    if (ret.success)
      console.log(`OK - ${ret.message}`, ret.payload);
    else
      console.error(`ERROR - ${ret.message}`);

  }
}

