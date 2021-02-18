class ArduinoUno_Board extends Board {
  constructor() {
    super('ArduinoUNO');

    this.mainBlock = null;
  }

  static Create(mainBlock) {
    let ret = new ArduinoUno_Board();
    ret.mainBlock = mainBlock;
    return ret;
  }

  Generate() {
    if (!this.mainBlock) { console.error("Mainblock cannot be null."); return null; }
    let mainBlockSource = this.mainBlock.GenerateSource();

    let sources = Object.values(this.mainBlock.dependencies).concat([mainBlockSource]);

    let sourceLines = [
      mainGenerator.GenerateComment('    ______  __ __    ___  ____   ___ ___  ____  ___   ____   ____  __  _    '),
      mainGenerator.GenerateComment('   |      ||  |  |  /  _]|    \\ |   |   ||    |/   \\ |    \\ |    ||  |/ ]   '),
      mainGenerator.GenerateComment('   |      ||  |  | /  [_ |  D  )| _   _ | |  ||     ||  _  | |  | |  \' /    '),
      mainGenerator.GenerateComment('   |_|  |_||  _  ||    _]|    / |  \\_/  | |  ||  O  ||  |  | |  | |    \\    '),
      mainGenerator.GenerateComment('     |  |  |  |  ||   [_ |    \\ |   |   | |  ||     ||  |  | |  | |     |   '),
      mainGenerator.GenerateComment('     |  |  |  |  ||     ||  .  \\|   |   | |  ||     ||  |  | |  | |  .  |   '),
      mainGenerator.GenerateComment('     |__|  |__|__||_____||__|\\_||___|___||____|\\___/ |__|__||____||__|\\_|   '),
      '',
    ];

    // Add init header
    for (let k of sources)
      if (k.codes.init.code)
        sourceLines.push([
          k.codes.init.code,
        ].join('\n'));

    // Add type definitions
    sourceLines.push(mainGenerator.GenerateComment('############ TYPE STREET #############'));
    for (let k of sources)
      sourceLines.push([
        k.codes.dataStructure.code,
        k.codes.outputsStructure.code,
        k.codes.instanceStructure.code
      ].join('\n'));

    // Add code functions
    sourceLines.push(mainGenerator.GenerateComment('############ FUNCTIONS ALLEY #############'));
    for (let k of sources)
      sourceLines.push([
        k.codes.setupFunction.code,
        k.codes.loopFunction.code
      ].join('\n'));

    // Board default code
    sourceLines.push(mainGenerator.GenerateComment('############ MIAMI CITY #############'));
    sourceLines.push(
      mainGenerator.VariableDefinition('miami', mainBlockSource.codes.instanceStructure.name)
    );

    // Data indirect reference pointer
    let dataIndirectReference = mainGenerator.GetReference(
      mainGenerator.AccessDirect(
        'miami',
        'data'
      )
    );

    // Generate setup function call
    let genSetupCallArgs = [
      dataIndirectReference
    ];
    let genSetupCall = mainGenerator.GenerateFunctionCall(mainBlockSource.codes.setupFunction.name, genSetupCallArgs);
    let genSetupCodeFunction = mainGenerator.GenerateFunction(
      'setup',   // Name
      'void',                 // Return type
      [], // Parameters
      genSetupCall || ''      // SetupCode
    );
    sourceLines.push(genSetupCodeFunction);

    // Generate loop function call
    let genLoopCallArgs = [
      dataIndirectReference
    ];

    for (var pi of this.mainBlock.pin.grids)
      genLoopCallArgs.push(pi.init);

    for (var po of this.mainBlock.pin.plates) {
      genLoopCallArgs.push(
        mainGenerator.GetReference(
          mainGenerator.AccessDirect(
            mainGenerator.AccessDirect(
              'miami',
              'outputs'
            ),
            po.name
          )
        )
      );
    }
    let genLoopCall = mainGenerator.GenerateFunctionCall(mainBlockSource.codes.loopFunction.name, genLoopCallArgs, true);
    let genLoopCodeFunction = mainGenerator.GenerateFunction(
      'loop',    // Name
      'void',                 // Return type
      [],  // Parameters
      genLoopCall || ''       // LoopCode
    );
    sourceLines.push(genLoopCodeFunction);

    // Join lines
    return sourceLines.join('\n');
  }
}

class Arduino_DigitalInput_Plug extends CBlock.GridPlug {
  constructor() {
    super("Arduino_DigitalInput_Plug");
  }

  Init() {
    this.SetPins(
      [
        PinPlate.Create('value', 'bool', 'false')
      ]
    );
  }

  static DefaultConfigs() {
    return { pin: 0 };
  }

  InitCode() {}

  SetupCode() {
    return `pinMode(${this.configs.pin}, INPUT);`
  }

  LoopCode() {
    return `*value = digitalRead(${this.configs.pin});`
  }
}

class Arduino_DigitalOutput_Plug extends CBlock.PlatePlug {
  constructor() {
    super("Arduino_DigitalOutput_Plug");
  }

  Init() {
    this.SetPins(
      [
        PinGrid.Create('value', 'bool', 'false')
      ]
    );
  }

  static DefaultConfigs() {
    return { pin: 0 };
  }

  InitCode() {}

  SetupCode() {
    return `pinMode(${this.configs.pin}, OUTPUT);`
  }

  LoopCode() {
    return `digitalWrite(${this.configs.pin}, value);`;
  }
}

class Arduino_OLEDNumber_Plug extends CBlock.PlatePlug {
  constructor() {
    super("Arduino_OLED_Plug");
  }

  Init() {
    let pins = [];
    for (var i = 0; i < this.configs.n_values; i++)
      pins.push(PinGrid.Create(`value_${i}`, 'float', 'false'));
    this.SetPins(pins);
  }

  static DefaultConfigs() {
    return { n_values: 1, width: 128, height: 64, dc_pin: 6, cs_pin: 7, reset_pin: 8 };
  }

  SetConfigs(configs) {
    configs.n_values = Math.max(1, Math.min(6, configs.n_values));
    super.SetConfigs(configs);
  }

  InitCode() {
    return `
      #include <SPI.h>
      #include <Wire.h>
      #include <Adafruit_GFX.h>
      #include <Adafruit_SSD1306.h>

      Adafruit_SSD1306 display(${this.configs.width}, ${this.configs.height}, &SPI, ${this.configs.dc_pin}, ${this.configs.reset_pin}, ${this.configs.cs_pin});
    `;
  }

  SetupCode() {
    return `
      // SSD1306_SWITCHCAPVCC = generate display voltage from 3.3V internally
      if(!display.begin(SSD1306_SWITCHCAPVCC)) {
        for(;;); // Don't proceed, loop forever
      }
      display.setTextSize(1);      // Normal 1:1 pixel scale
      display.setTextColor(SSD1306_WHITE); // Draw white text
      display.cp437(true);         // Use full 256 char 'Code Page 437' font
    `;
  }

  LoopCode() {
    let lines = [];

    lines.push('display.clearDisplay();');
    lines.push('display.setCursor(0, 0);');

    for (var i = 0; i < this.configs.n_values; i++)
      lines.push(`display.println(value_${i});`);

    lines.push('display.display();');

    return lines.join('\n');
  }
}
