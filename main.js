import { UsbConnection } from './usb.js';
import { SerialConnection } from './serial.js';
import { Parser } from './parser.js';
import { Renderer } from './renderer.js';

import * as Input from './input.js';
import * as Audio from './audio.js';

const renderer = new Renderer();
const parser = new Parser(renderer);

function show(query) {
    document
        .querySelectorAll(query)
        .forEach(e => e.classList.remove('hidden'));
}

function hide(query) {
    document
        .querySelectorAll(query)
        .forEach(e => e.classList.add('hidden'));
}

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

} else if (navigator.usb) {
    const connection = new UsbConnection(parser, updateDisplay);
    Input.setup(connection);

    const button = document.createElement('button');
    button.innerText = 'Connect with WebUSB';
    document.getElementById('buttons').append(button);
    button.addEventListener('click', () =>
        connection.connect()
            .catch(() => show('#usb-fail')));

} else {
    document.getElementById('no-serial-usb').classList.remove('hidden');
}

navigator.serviceWorker.register('worker.js');
