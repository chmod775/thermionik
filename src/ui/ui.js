class UI_CBlock {
  $convert() {}
  $generate() {}

}

class UI_WLBlock {

}

class UI_Feedback {
  constructor() {
    this.success = false;
    this.message = null;
    this.payload = null;
  }

  static Error(message) {
    let ret = new UI_Feedback();
    ret.success = false;
    ret.message = message;
    return ret;
  }
}


class UI_Command {
  constructor(description, arguments, callback) {
    this.description = description;
    this.arguments = arguments;
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

    this.activeEditor = null;
    this.editors = [];
  }

  SetToolbox(toolbox) {
    this.toolbox = toolbox;
  }

  Call(name, args) {
    let fn = this['$' + name.toLowerCase()];
    if (!fn) console.error(`Command ${name} not found!`);
    fn.call(this, args);
  }

  Execute(cmd) {

    let fn_ret = this.call(fn_name, fn_args);
    if (!(fn_ret instanceof UI_Feedback)) console.error("Wrong feedback from command!");

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



    }
  );


}

