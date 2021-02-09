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