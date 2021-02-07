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

const keyMap = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ShiftLeft: 'select',
    Space: 'start',
    KeyZ: 'option',
    KeyX: 'edit'
};

const buttonMap = {
    12: 'up',
    64: 'up',
    13: 'down',
    65: 'down',
    14: 'left',
    66: 'left',
    15: 'right',
    67: 'right',
    8: 'select',
    2: 'select',
    5: 'select',
    9: 'start',
    3: 'start',
    1: 'option',
    0: 'edit'
};

function updateKeys(key, isDown, e) {
    if (!key)
        return;

    e && e.preventDefault();

    const bit = keyBitMap[key];
    if (bit === undefined)
        return;

    if (e && e.target.tagName === 'rect') {
        e.target.classList.toggle('active', isDown);
    }

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

    document.addEventListener('keydown', e =>
        updateKeys(keyMap[e.code], true, e));

    document.addEventListener('keyup', e =>
        updateKeys(keyMap[e.code], false, e));

    const controls = document.getElementById('controls');

    controls.addEventListener('mousedown', e =>
        updateKeys(e.target.dataset.key, true, e));

    controls.addEventListener('touchstart', e =>
        updateKeys(e.target.dataset.key, true, e));

    controls.addEventListener('mouseup', e =>
        updateKeys(e.target.dataset.key, false, e));

    controls.addEventListener('touchend', e =>
        updateKeys(e.target.dataset.key, false, e));
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
                        updateKeys(buttonMap[64 + b], pressed);
                    }
                }
            }
        }

        for (let i = 0; i < gamepad.buttons.length; i++) {
            const pressed = gamepad.buttons[i].pressed;
            if (state.buttons[i] !== pressed) {
                state.buttons[i] = pressed;
                updateKeys(buttonMap[i], pressed);
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
