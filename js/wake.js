// Copyright 2022 James Deery
// Released under the MIT licence, https://opensource.org/licenses/MIT

import { on } from './util.js';
import * as Settings from './settings.js';

let isConnected = false;
let wakeLock = null;

export function connectionChanged(isConnected_) {
    isConnected = isConnected_;
    updateLock();
}

Settings.onChange('preventSleep', () => updateLock());
on(document, 'visibilitychange', () => updateLock());

async function updateLock() {
    if (!navigator.wakeLock)
        return;

    const shouldBeOn = isConnected &&
        Settings.get('preventSleep') &&
        document.visibilityState === 'visible';
    const isOn = wakeLock && !wakeLock.released;

    if (!shouldBeOn && isOn) {
        wakeLock.release();
        wakeLock = null;

    } else if (shouldBeOn && !isOn) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            on(wakeLock, 'release', () => updateLock());
        } catch {
            wakeLock = null;
        }
    }

    console.log(wakeLock && !wakeLock.released);
}
