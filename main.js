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
    } else {
        renderer.clear();
        show('#buttons');
    }
}

if (navigator.serial) {
    const connection = new SerialConnection(parser, updateDisplay);
    Input.setup(connection);

    const button = document.createElement('button');
    button.innerText = 'Connect with Serial';
    document.getElementById('buttons').append(button);
    button.addEventListener('click', () => {
        Audio.start();
        connection.connect()
            .catch(() => show('#serial-fail'));
    });

} else if (navigator.usb) {
    const connection = new UsbConnection(parser, updateDisplay);
    Input.setup(connection);

    const button = document.createElement('button');
    button.innerText = 'Connect with WebUSB';
    document.getElementById('buttons').append(button);
    button.addEventListener('click', () => {
        Audio.start();
        connection.connect()
            .catch(() => show('#usb-fail'));
    });
} else {
    document.getElementById('no-serial-usb').classList.remove('hidden');
}

navigator.serviceWorker.register('worker.js');
