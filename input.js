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

function updateKeys(key, isDown, e) {
    if (!key)
        return;

    e.preventDefault();

    const bit = keyBitMap[key];
    if (bit === undefined)
        return;

    const newState = isDown
        ? keyState | (1 << bit)
        : keyState & ~(1 << bit);

    if (newState === keyState)
        return;

    keyState = newState;

    if (connection.isConnected) {
        connection.sendKeys(keyState);
    }
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

