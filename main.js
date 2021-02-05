import { UsbConnection } from './usb.js';
import { SerialConnection } from './serial.js';
import { Parser } from './parser.js';
import { Renderer } from './renderer.js';
import { show, hide, toggle } from './util.js';
import { setup as setupWorker } from './worker-setup.js';

import * as Input from './input.js';
import * as Audio from './audio.js';

const renderer = new Renderer();
const parser = new Parser(renderer);

function updateDisplay(isConnected) {
    if (isConnected) {
        hide('#buttons, #display .error');

        Audio.start(10);

    } else {
        renderer.clear();
        show('#buttons');

        Audio.stop();
    }
}

if (navigator.serial) {
    const connection = new SerialConnection(parser, updateDisplay);
    Input.setup(connection);

    const button = document.createElement('button');
    button.innerText = 'Connect with Serial';
    document.getElementById('buttons').append(button);
    button.addEventListener('click', () =>
        connection.connect()
            .catch(() => show('#serial-fail')));

    window.addEventListener('beforeunload', e =>
        connection.disconnect());

    connection.connect(true).catch(() => {});

} else if (navigator.usb) {
    const connection = new UsbConnection(parser, updateDisplay);
    Input.setup(connection);

    const button = document.createElement('button');
    button.innerText = 'Connect with WebUSB';
    document.getElementById('buttons').append(button);
    button.addEventListener('click', () =>
        connection.connect()
            .catch(() => show('#usb-fail')));

    show('#buttons');

} else {
    document.getElementById('no-serial-usb').classList.remove('hidden');
}

document
    .querySelector('#settings .control')
    .addEventListener('click', e => toggle('#settings'));

document
    .querySelector('#settings')
    .addEventListener('click', e => {
        if (e.target.id === 'settings') {
            hide('#settings');
        }
    });

setupWorker();
