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

function setupToggle(id, setting, defaultValue, onAction, offAction) {
    const element = document.getElementById(id);

    element.addEventListener('change', () => {
        if (element.checked) {
            onAction();
            localStorage[setting] = true;
        } else {
            offAction();
            localStorage[setting] = false;
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

function get(setting, defaultValue) {
    const value = localStorage[setting];
    return value === undefined ? defaultValue : JSON.parse(value);
}
