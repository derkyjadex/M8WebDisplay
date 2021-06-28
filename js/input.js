// Copyright 2021 James Deery
// Released under the MIT licence, https://opensource.org/licenses/MIT

import { appendButton } from './util.js';
import * as Settings from './settings.js';
import * as Keyboard from './keyboard.js';

let connection;
let keyState = 0;

const keyBitMap = {
    up: 6,
    down: 5,
    left: 7,
    right: 2,
    select: 4,
    start: 3,
    option: 1,
    edit: 0
};

const defaultInputMap = Object.freeze({
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ShiftLeft: 'select',
    Space: 'start',
    KeyZ: 'option',
    KeyX: 'edit',

    Gamepad12: 'up',
    Gamepad64: 'up',
    Gamepad13: 'down',
    Gamepad65: 'down',
    Gamepad14: 'left',
    Gamepad66: 'left',
    Gamepad15: 'right',
    Gamepad67: 'right',
    Gamepad8: 'select',
    Gamepad2: 'select',
    Gamepad5: 'select',
    Gamepad9: 'start',
    Gamepad3: 'start',
    Gamepad1: 'option',
    Gamepad0: 'edit'
});

const inputMap = {};

function handleInput(input, isDown, e) {
    if (!input)
        return;

    if (resolveCapture) {
        e && e.preventDefault();
        if (isDown) {
            resolveCapture(input);
        }
        return;
    }

    if (Keyboard.handleKey(input, isDown, e))
        return;

    handleAction(inputMap[input], isDown, e);
}

function handleControl(isDown, e) {
    const action = e.target.dataset.action;
    if (!action)
        return;

    if (isMapping && isDown && !resolveCapture) {
        startMapKey(e.target, action);

    } else {
        e.target.classList.toggle('active', isDown);
        handleAction(action, isDown, e);
    }
}

function handleAction(action, isDown, e) {
    if (!action)
        return;

    e && e.preventDefault();

    const bit = keyBitMap[action];
    if (bit === undefined)
        return;

    const newState = isDown
        ? keyState | (1 << bit)
        : keyState & ~(1 << bit);

    if (newState === keyState)
        return;

    keyState = newState;

    connection.sendKeys(keyState);
}

export function setup(connection_) {
    connection = connection_;

    Keyboard.setup(connection);

    document.addEventListener('keydown', e =>
        handleInput(e.code, true, e));

    document.addEventListener('keyup', e =>
        handleInput(e.code, false, e));

    const controls = document.getElementById('controls');

    controls.addEventListener('mousedown', e =>
        handleControl(true, e));

    controls.addEventListener('touchstart', e =>
        handleControl(true, e));

    controls.addEventListener('mouseup', e =>
        handleControl(false, e));

    controls.addEventListener('touchend', e =>
        handleControl(false, e));

    appendButton('#mapping-buttons', 'Reset to Default', resetMappings);
    appendButton('#mapping-buttons', 'Clear All', clearMappings);
    appendButton('#mapping-buttons', 'Done', stopMapping);

    Object.assign(
        inputMap,
        Settings.load('inputMap', defaultInputMap));
}

let gamepadsRunning = false;
const gamepadStates = [];
const hatMap = {
    0: [true, false, false, false],
    1: [true, false, false, true],
    2: [false, false, false, true],
    3: [false, true, false, true],
    4: [false, true, false, false],
    5: [false, true, true, false],
    6: [false, false, true, false],
    7: [true, false, true, false],
    8: [false, false, false, false],
    15: [false, false, false, false],
};

function pollGamepads() {
    if (!gamepadsRunning)
        return;

    let somethingPresent = false;
    for (const gamepad of navigator.getGamepads()) {
        if (!gamepad || !gamepad.connected)
            continue;

        somethingPresent = true;

        let state = gamepadStates[gamepad.index];
        if (!state) {
            state = gamepadStates[gamepad.index] = {
                buttons: [],
                axes: []
            };
        }

        if (gamepad.mapping !== 'standard') {
            for (let i = 0; i < gamepad.axes.length; i++) {
                if (state.axes[i] === false)
                    continue;

                // Heuristics to locate a d-pad or
                // "hat switch" masquerading as an axis
                const value = (gamepad.axes[i] + 1) * 3.5;
                const error = Math.abs(Math.round(value) - value);
                const hatPosition = hatMap[Math.round(value)];
                if (error > 4.8e-7 || hatPosition === undefined) {
                    state.axes[i] = false;
                    continue;
                } else if (value === 0 && state.axes[i] !== true) {
                    continue;
                } else {
                    state.axes[i] = true;
                }

                for (let b = 0; b < 4; b++) {
                    const pressed = hatPosition[b];
                    if (state.buttons[64 + b] !== pressed) {
                        state.buttons[64 + b] = pressed;
                        handleInput(`Gamepad${64 + b}`, pressed);
                    }
                }
            }
        }

        for (let i = 0; i < gamepad.buttons.length; i++) {
            const pressed = gamepad.buttons[i].pressed;
            if (state.buttons[i] !== pressed) {
                state.buttons[i] = pressed;
                handleInput(`Gamepad${i}`, pressed);
            }
        }
    }

    if (somethingPresent) {
        requestAnimationFrame(pollGamepads);
    } else {
        gamepadsRunning = false;
    }
}

window.addEventListener('gamepadconnected', e => {
    if (e.gamepad.mapping !== 'standard') {
        console.warn('Non-standard gamepad attached. Mappings may be funny.');
    }

    if (!gamepadsRunning) {
        gamepadsRunning = true;
        pollGamepads();
    }
});

window.addEventListener('gamepaddisconnected', e => {
    gamepadStates[e.gamepad.index] = null;
});

export let isMapping = false;
let resolveMapping = null;
let resolveCapture = null;

export function startMapping() {
    isMapping = true;
    document.body.classList.add('mapping');
    return new Promise(resolve => { resolveMapping = resolve });
}

export function stopMapping() {
    cancelCapture();
    document.body.classList.remove('mapping');
    isMapping = false;
    resolveMapping && resolveMapping();
}

export function captureNextInput() {
    cancelCapture();
    return new Promise(
        resolve => { resolveCapture = resolve; })
        .then(input => {
            resolveCapture = null;
            return input;
        });
}

export function cancelCapture() {
    resolveCapture && resolveCapture(null);
}

async function startMapKey(keyElement, action) {
    const cancel = e => {
        e.stopPropagation();
        cancelCapture();
    };

    document.body.addEventListener('mousedown', cancel, true);
    document.body.addEventListener('touchstart', cancel, true);
    document.body.classList.add('capturing');
    keyElement.classList.add('mapping');
    try {
        const input = await captureNextInput();
        if (input) {
            inputMap[input] = action;
            Settings.save('inputMap', inputMap);
        }
    } finally {
        keyElement.classList.remove('mapping');
        document.body.classList.remove('capturing');
        document.body.removeEventListener('touchstart', cancel, true);
        document.body.removeEventListener('mousedown', cancel, true);
    }
}

export function resetMappings() {
    for (const input of Object.keys(inputMap)) {
        delete inputMap[input];
    }
    Object.assign(inputMap, defaultInputMap);
    Settings.save('inputMap', inputMap);
}

export function clearMappings() {
    for (const input of Object.keys(inputMap)) {
        delete inputMap[input];
    }
    Settings.save('inputMap', inputMap);
}
