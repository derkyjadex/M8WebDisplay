import { show, hide, toggle } from './util.js';

document
    .getElementById('menu-button')
    .addEventListener('click', e => toggle('#settings'));

document
    .getElementById('settings')
    .addEventListener('click', e => {
        if (e.target.id === 'settings') {
            hide('#settings');
        }
    });

const actions = {};
const values = {};

setupToggle('showControls', 'Show Controls', true);
setupToggle('enableAudio', 'Enable Audio', true);

setupSelect(
    'displayType',
    'Display Type',
    { webgl2: 'WebGL2', old: 'Canvas + SVG' },
    'webgl2');

setupToggle('snapPixels', 'Snap Pixels', true);
setupButton('controlMapping', 'Control Mapping');
setupButton('fullscreen', 'Fullscreen');

function setupToggle(setting, title, defaultValue) {
    const value = load(setting, defaultValue);

    const div = document.createElement('div');
    div.classList.add('setting');
    const label = document.createElement('label');
    label.innerText = title;
    div.append(label);
    const input = document.createElement('input');
    input.setAttribute('type', 'checkbox');
    input.checked = value;
    label.append(input);

    input.addEventListener('change', () =>
        save(setting, input.checked));

    document
        .getElementById('settings')
        .append(div);
}

function setupSelect(setting, title, options, defaultValue) {
    const value = load(setting, defaultValue);

    const div = document.createElement('div');
    div.classList.add('setting');
    const label = document.createElement('label');
    label.innerText = title;
    div.append(label);
    const select = document.createElement('select');

    for (const [value, title] of Object.entries(options)) {
        const option = document.createElement('option');
        option.value = value;
        option.text = title;
        select.append(option);
    }
    select.value = value;

    label.append(select);

    select.addEventListener('change', () =>
        save(setting, select.value));

    document
        .getElementById('settings')
        .append(div);
}

function setupButton(setting, title) {
    const div = document.createElement('div');
    div.classList.add('setting');
    const button = document.createElement('button');
    button.innerText = title;
    div.append(button);

    button.addEventListener('click', () => {
        hide('#settings');
        actions[setting] && actions[setting]();
    });

    document
        .getElementById('settings')
        .append(div);
}

export function load(setting, defaultValue) {
    let value = localStorage[setting];
    value = value === undefined ? defaultValue : JSON.parse(value);
    values[setting] = value;

    return value;
}

export function save(setting, value) {
    values[setting] = value;
    actions[setting] && actions[setting](value);
    localStorage[setting] = JSON.stringify(value);
}

export function on(setting, action) {
    actions[setting] = action;
    if (get(setting) !== undefined) {
        action(get(setting));
    }
}

export function get(setting) {
    return values[setting];
}
