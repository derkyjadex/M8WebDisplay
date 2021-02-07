import { UsbConnection } from './usb.js';
import { SerialConnection } from './serial.js';
import { Parser } from './parser.js';
import { Renderer as OldRenderer } from './renderer.js';
import { Renderer as GlRenderer } from './gl-renderer.js';
import { show, hide, toggle } from './util.js';
import { setup as setupWorker } from './worker-setup.js';

import * as Input from './input.js';
import * as Audio from './audio.js';
import * as Settings from './settings.js';

function onBackgroundChanged(r, g, b) {
    const colour = `rgb(${r}, ${g}, ${b})`;
    document.body.style.backgroundColor = colour;
    document.documentElement.style.backgroundColor = colour;
    localStorage.background = JSON.stringify([r, g, b]);
}
let bg;
if (localStorage.background) {
    bg = JSON.parse(localStorage.background);
    onBackgroundChanged(bg[0], bg[1], bg[2]);
} else {
    bg = [0, 0, 0];
}

const renderer = Settings.displayType === 'webgl2'
    ? new GlRenderer(bg, onBackgroundChanged)
    : new OldRenderer(bg, onBackgroundChanged);

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

function goFullscreen() {
    document.body.requestFullscreen();
}

document
    .getElementById('display')
    .addEventListener('dblclick', goFullscreen);
Settings.setOnFullscreen(goFullscreen);

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

setupWorker();
