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

class Arduino_DigitalInput_Plug extends Plug {

}

class Arduino_DigitalOutput_Plug extends Plug {

}

class Arduino_OLED_Plug extends Plug {

}
