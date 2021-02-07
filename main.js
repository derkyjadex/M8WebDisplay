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

function setBackground(r, g, b) {
    const colour = `rgb(${r}, ${g}, ${b})`;
    document.body.style.backgroundColor = colour;
    document.documentElement.style.backgroundColor = colour;
    Settings.save('background', [r, g, b]);
}
const bg = Settings.load('background', [0, 0, 0]);
setBackground(bg[0], bg[1], bg[2]);
const renderer = Settings.get('displayType') === 'webgl2'
    ? new GlRenderer(bg, setBackground)
    : new OldRenderer(bg, setBackground);

const parser = new Parser(renderer);

Settings.on('showControls', value => {
    document
        .getElementById('display')
        .classList
        .toggle('with-controls', value);
});

Settings.on('enableAudio', value => {
    if (value) { Audio.enable(); }
    else { Audio.disable(); }
});

Settings.on('fullscreen', () => {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        document.body.requestFullscreen();
    }
});

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
    show('#no-serial-usb');
}

setupWorker();
