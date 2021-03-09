class UIEditor {
  constructor(ui, target) {
    this.ui = ui;
    this.target = target;
  }
}

class UIEditor_CBlock extends UIEditor {
  $convert() {}
  $generate() {}

}
UIEditor.CBlock = UIEditor_CBlock;

class UIEditor_WLBlock extends UIEditor {
  $add = new UI_Command(
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

      this.target.AddBlock(newBlockInstance);

      return UI_Feedback.Success(`Added block ${arg_name}.`, newBlockInstance);
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
    'Open a project.',
    [
      { name: 'type', desc: 'Type of new block:\n\tC - C Block\n\tWL - Wiring language\n\tCL - Cycle language' }
    ],
    (args) => {

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

        let newEditor = new UIEditor[foundBlock.lang()](this, foundBlock);

        this.editors.push(newEditor);
        this.activeEditor = newEditor;

        return UI_Feedback.Success(`Edited block ${arg_name} in editor slot ${this.editors.length - 1}.`, this.activeEditor);
      }
    ),

    save: new UI_Command(
      'Save changes of actual editor.',
      [],
      (args) => {
  
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

  $switch = new UI_Command(
    'Switch to an open editor.',
    [
      { name: 'type', desc: 'Type of new block:\n\tC - C Block\n\tWL - Wiring language\n\tCL - Cycle language' }
    ],
    (args) => {

    }
  );


}

