import { UsbConnection } from './usb.js';
import { SerialConnection } from './serial.js';
import { Parser } from './parser.js';
import { Renderer } from './renderer.js';

import * as Input from './input.js';
import * as Audio from './audio.js';

const renderer = new Renderer();
const parser = new Parser(renderer);

if (navigator.serial) {
    const connection = new SerialConnection(parser);
    Input.setup(connection);

    const button = document.createElement('button');
    button.innerText = 'Connect with Serial';
    document.getElementById('buttons').append(button);
    button.addEventListener('click', () => {
        Audio.start();
        connection.connect()
            .catch(() => document.getElementById('serial-fail').classList.remove('hidden'));
    });

} else if (navigator.usb) {
    const connection = new UsbConnection(parser);
    Input.setup(connection);

    const button = document.createElement('button');
    button.innerText = 'Connect with WebUSB';
    document.getElementById('buttons').append(button);
    button.addEventListener('click', () => {
        Audio.start();
        connection.connect()
            .catch(() => document.getElementById('usb-fail').classList.remove('hidden'));
    });
} else {
    document.getElementById('no-serial-usb').classList.remove('hidden');
}
