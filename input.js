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
    13: 'down',
    14: 'left',
    15: 'right',
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

const gamepadStates = [];
let gamepadsRunning = false;

function pollGamepads() {
    if (!gamepadsRunning)
        return;

    let somethingPresent = false;
    for (const gamepad of navigator.getGamepads()) {
        if (!gamepad || !gamepad.connected)
            continue;

        if (gamepad.mapping !== 'standard')
            continue;

        somethingPresent = true;

        let states = gamepadStates[gamepad.index];
        if (!states) {
            states = gamepadStates[gamepad.index] = [];
        }

        const buttons = gamepad.buttons;
        for (let i = 0; i < buttons.length; i++) {
            const state = buttons[i].pressed;
            if (states[i] !== state) {
                states[i] = state;
                updateKeys(buttonMap[i], state);
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
        console.warn('Non-standard gamepad attached. Don\'t know how to map.');
        return;
    }

    if (!gamepadsRunning) {
        gamepadsRunning = true;
        pollGamepads();
    }
});

window.addEventListener('gamepaddisconnected', e => {
    gamepadStates[e.gamepad.index] = null;
});
