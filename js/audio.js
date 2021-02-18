// Copyright 2021 James Deery
// Released under the MIT licence, https://opensource.org/licenses/MIT

import { wait } from './util.js';

let ctx;
let enabled = true;

export async function start(attempts = 1) {
    if (ctx || !enabled)
        return;

    try {
        ctx = new AudioContext();

        await navigator.mediaDevices.getUserMedia({ audio: true });
        let deviceId;
        while (true) {
            deviceId = await findDeviceId();
            if (deviceId)
                break;

            if (--attempts > 0) {
                await wait(300);
            } else {
                break;
            }
        }

        if (!deviceId)
            throw new Error('M8 not found');

        const stream = await navigator.mediaDevices
            .getUserMedia({ audio: {
                deviceId: { exact: deviceId },
                autoGainControl: false,
                echoCancellation: false,
                noiseSuppression: false
            } })

        const source = ctx.createMediaStreamSource(stream);
        source.connect(ctx.destination);

        if (ctx.state !== 'running') {
            waitForUserGesture();
        }

    } catch (err) {
        console.error(err);
        stop();
    }

    if (!enabled) {
        stop();
    }
}

async function findDeviceId() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
        .filter(d =>
            d.kind === 'audioinput' &&
            /M8/.test(d.label) &&
            d.deviceId !== 'default' &&
            d.deviceId !== 'communications')
        .map(d => d.deviceId)[0];
}

export async function stop() {
    ctx && await ctx.close().catch(() => {});
    ctx = null;
}

function waitForUserGesture() {
    const events = ['keydown', 'mousedown', 'touchstart'];

    function resume() {
        ctx && ctx.resume();
        events.forEach(e =>
            document.removeEventListener(e, resume));
    }

    events.forEach(e =>
        document.addEventListener(e, resume));
}

export function enable() {
    if (enabled)
        return;

    enabled = true;
    start();
}

export function disable() {
    enabled = false;
    stop();
}
