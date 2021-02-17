class ArduinoUno_Board extends Board {
  constructor() {
    super('ArduinoUNO');
  }

  static Create(mainBlock) {
    let ret = new ArduinoUno_Board();
    ret.mainBlock = mainBlock;
    return ret;
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

  SetupCode() {
    return `pinMode(${this.configs.pin}, OUTPUT);`
  }

  LoopCode() {
    return `digitalWrite(${this.configs.pin}, value);`;
  }
}

class Arduino_OLED_Plug extends CBlock.PlatePlug {

}
