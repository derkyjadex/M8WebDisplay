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
    value => document
        .getElementById('display')
        .classList
        .toggle('with-controls', value));

setupToggle(
    'enable-audio-setting',
    'enableAudio',
    true,
    value => {
        if (value) { Audio.enable(); }
        else { Audio.disable(); }
    });

export let displayType;

setupSelect(
    'display-type-setting',
    'displayType',
    'webgl2',
    type => { displayType = type; });

let onFullscreen;

export function setOnFullscreen(action) {
    onFullscreen = action;
}

setupButton(
    'go-fullscreen',
    () => {
        hide('#settings');
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else if (onFullscreen) {
            onFullscreen();
        }
    });

function setupToggle(id, setting, defaultValue, action) {
    const element = document.getElementById(id);

    element.addEventListener('change', () => {
        if (element.checked) {
            action(true);
            save(setting, true);
        } else {
            action(false);
            save(setting, false);
        }
    });

    const value = get(setting, defaultValue);
    element.checked = value;
    action(value);
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

function setupButton(id, action) {
    const element = document.getElementById(id);

    element.addEventListener('click', () => { action(); });
}

function get(setting, defaultValue) {
    const value = localStorage[setting];
    return value === undefined ? defaultValue : JSON.parse(value);
}

function save(setting, value) {
    localStorage[setting] = JSON.stringify(value);
}
