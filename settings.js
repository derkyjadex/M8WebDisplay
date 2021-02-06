import { show, hide, toggle } from './util.js';
import * as Audio from './audio.js';

document
    .querySelector('#settings .control')
    .addEventListener('click', e => toggle('#settings'));

document
    .getElementById('settings')
    .addEventListener('click', e => {
        if (e.target.id === 'settings') {
            hide('#settings');
        }
    });

setupToggle(
    'show-controls-setting',
    'showControls',
    true,
    () => show('#controls'),
    () => hide('#controls'));

setupToggle(
    'enable-audio-setting',
    'enableAudio',
    true,
    () => Audio.enable(),
    () => Audio.disable());

export let displayType;

setupSelect(
    'display-type-setting',
    'displayType',
    'old',
    type => { displayType = type; });

function setupToggle(id, setting, defaultValue, onAction, offAction) {
    const element = document.getElementById(id);

    element.addEventListener('change', () => {
        if (element.checked) {
            onAction();
            save(setting, true);
        } else {
            offAction();
            save(setting, false);
        }
    });

    if (get(setting, defaultValue)) {
        element.checked = true;
        onAction();
    } else {
        element.checked = false;
        offAction();
    }
}

function setupSelect(id, setting, defaultValue, action) {
    const element = document.getElementById(id);

    element.addEventListener('change', () => {
        action(element.value);
        save(setting, element.value);
    });

    const value = get(setting, defaultValue);
    element.value = value;
    action(value);
}

function get(setting, defaultValue) {
    const value = localStorage[setting];
    return value === undefined ? defaultValue : JSON.parse(value);
}

function save(setting, value) {
    localStorage[setting] = JSON.stringify(value);
}
