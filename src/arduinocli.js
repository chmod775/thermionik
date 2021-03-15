import arduinoCli from 'arduino-cli';

const cli = arduinoCli('/bin/arduino-cli', {
  directories: {
    user: '~/arduino-cli/sketches',
    data: '~/arduino-cli/data',
  },
});

cli.version().then(console.log); // "0.2.1-alpha.preview"


