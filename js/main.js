// Copyright 2021 James Deery
// Released under the MIT licence, https://opensource.org/licenses/MIT

import { UsbConnection } from './usb.js';
import { SerialConnection } from './serial.js';
import { Parser } from './parser.js';
import { Renderer as OldRenderer } from './renderer.js';
import { Renderer as GlRenderer } from './gl-renderer.js';
import { show, hide, toggle, appendButton, on } from './util.js';
import { setup as setupWorker } from './worker-setup.js';

import * as Input from './input.js';
import * as Audio from './audio.js';
import * as Settings from './settings.js';
import * as Firmware from './firmware.js';

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

let resizeCanvas = (function() {
    const display = document.getElementById('display');
    const canvas = document.getElementById('canvas');
    const svg = document.querySelector('#canvas + svg');

    function resize() {
        const ratio = devicePixelRatio;
        const dW = display.clientWidth * ratio;

        if (Settings.get('snapPixels') && dW <= 1600) {
            let dH = display.clientHeight * ratio;
            if (Settings.get('showControls') || Input.isMapping) {
                dH /= 2;
            }

            const width = Math.floor(dW / 320) * 320 / ratio;
            const height = Math.floor(dH / 240) * 240 / ratio;
            const left = Math.round((dW / ratio - width) / 2);
            const top = Math.round((dH / ratio - height) / 2);

            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            canvas.style.left = `${left}px`;
            canvas.style.top = `${top}px`;

            if (svg) {
                svg.style.width = `${width}px`;
                svg.style.height = `${height}px`;
                svg.style.left = `${left}px`;
                svg.style.top = `${top}px`;
            }
        } else {
            canvas.style.width = null;
            canvas.style.height = null;
            canvas.style.left = null;
            canvas.style.top = null;

            if (svg) {
                svg.style.width = null;
                svg.style.height = null;
                svg.style.left = null;
                svg.style.top = null;
            }
        }
    }

    on(window, 'resize', resize);
    window.matchMedia('screen and (min-resolution: 2dppx)')
        .addListener(resize);

    resize();

    return resize;
})();

Settings.onChange('showControls', value => {
    document
        .getElementById('display')
        .classList
        .toggle('with-controls', value);
    resizeCanvas();
});

Settings.onChange('enableAudio', value => {
    if (value) { Audio.enable(); }
    else { Audio.disable(); }
});

Settings.onChange('snapPixels', () => resizeCanvas());

Settings.onChange('controlMapping', () => {
    hide('#info');
    Input.startMapping().then(resizeCanvas);
    resizeCanvas();
});

Settings.onChange('firmware', () => {
    hide('#info');
    Firmware.open();
});

Settings.onChange('fullscreen', () => {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        document.body.requestFullscreen();
    }
});

Settings.onChange('about', () => show('#info'));

function updateDisplay(isConnected) {
    if (isConnected) {
        hide('#buttons, .error, #info');
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

    on('#connect', 'click', () =>
        connection.connect()
            .catch(() => {
                hide('#info');
                show('#serial-fail');
            }));

    on(window, 'beforeunload', e =>
        connection.disconnect());

    connection.connect(true).catch(() => {});

} else if (navigator.usb) {
    const connection = new UsbConnection(parser, updateDisplay);
    Input.setup(connection);

    on('#connect', 'click', () =>
        connection.connect()
            .catch(() => {
                hide('#info');
                show('#usb-fail');
            }));

    show('#buttons');

} else {
    show('#no-serial-usb');
}

on('#info button', 'click', () => hide('#info'));

setupWorker();
