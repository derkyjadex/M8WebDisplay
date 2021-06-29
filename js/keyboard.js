// Copyright 2021 James Deery
// Released under the MIT licence, https://opensource.org/licenses/MIT

import * as Settings from './settings.js';

const keyMap = Object.freeze({
    KeyA: 0,
    KeyW: 1,
    KeyS: 2,
    KeyE: 3,
    KeyD: 4,
    KeyF: 5,
    KeyT: 6,
    KeyG: 7,
    KeyY: 8,
    KeyH: 9,
    KeyU: 10,
    KeyJ: 11,
    KeyK: 12,
    KeyO: 13,
    KeyL: 14,
    KeyP: 15,
    Semicolon: 16,
    Quote: 17,
    BracketLeft: 'velDown',
    BracketRight: 'velUp',
    Minus: 'octDown',
    Equal: 'octUp'
});

let connection;
let enabled = true;
let oct = 3;
let vel = 103;
let currentKey = null;

export function handleKey(input, isDown, e) {
    if (!enabled || !e || e.ctrlKey || e.metaKey || e.altKey)
        return false;

    const key = keyMap[input];
    if (key === undefined)
        return false;

    if (e.repeat)
        return true;

    switch (key) {
        case 'octDown':
            if (isDown) {
                oct = Math.max(oct - 1, 0);
            }
            break;

        case 'octUp':
            if (isDown) {
                oct = Math.min(oct + 1, 10);
            }
            break;

        case 'velDown':
            if (isDown) {
                vel = Math.max(vel - 8, 7);
            }
            break;

        case 'velUp':
            if (isDown) {
                vel = Math.min(vel + 8, 127);
            }
            break;

        default:
            const note = key + oct * 12;
            if (note > 128)
                return false;

            if (isDown) {
                currentKey = key;
                connection.sendNoteOn(note, vel);

            } else if (key === currentKey) {
                connection.sendNoteOff();
            }
            break;
    }

    return true;
}

export function setup(connection_) {
    connection = connection_;

    Settings.onChange('virtualKeyboard', value => {
        enabled = value;
        connection.sendNoteOff();
    });
}

