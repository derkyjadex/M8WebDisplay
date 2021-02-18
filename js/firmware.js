// Copyright 2021 James Deery
// Released under the MIT licence, https://opensource.org/licenses/MIT

import { show, hide, toggle, on, wait } from './util.js';
import { readHexToBlocks } from './hex.js';

function setState(state) {
    document.getElementById('firmware').className = state;
}

export function open() {
    blocks = null;
    device = null;
    setState('file-select');
}

async function flash(blocks, device, onProgress) {
    onProgress(0);

    await device.open();
    try {
        const buffer = new Uint8Array(64 + 1024);

        for (let i = 0; i < blocks.length; i++) {
            if (i !== 0 && (!blocks[i] || blocks[i].every(b => b === 0xff)))
                continue;

            const addr = i * 1024;
            buffer[0] = addr & 0xff;
            buffer[1] = (addr >> 8) & 0xff;
            buffer[2] = (addr >> 16) & 0xff;
            buffer.set(blocks[i], 64);

            await device.sendReport(0, buffer);
            onProgress((i + 1) / blocks.length);
            await wait(i === 0 ? 1500 : 5);
        }

        buffer.fill(0);
        buffer[0] = 0xff;
        buffer[1] = 0xff;
        buffer[2] = 0xff;
        await device.sendReport(0, buffer);

    } finally {
        await device.close().catch(() => {});
    }
}

function isTeensy(device) {
    const info = device.collections[0];
    return info
        && info.usagePage === 0xff9c
        && info.usage === 0x25;
}

let blocks = null;
let device = null;

on('#firmware button.close', 'click', () => {
    blocks = null;
    device = null;
    document
        .querySelector('#firmware input')
        .value = null;

    setState('hidden');
});

on('#firmware input', 'change', async e => {
    blocks = null;

    const file = e.target.files[0];
    if (!file)
        return;

    setState('file-loading');
    try {
        blocks = await readHexToBlocks(file, 1024, 0x60000000);
    } catch (error) {
        console.error(error);
        setState('file-error');
        return;
    }

    setState('file-loaded');
});

on('#firmware button.select-device', 'click', async () => {
    device = null;
    const result = await navigator.hid.requestDevice({
        filters: [{
            vendorId: 0x16c0,
            productId: 0x0478
        }]
    });
    device = result && result[0];

    if (!device)
        return;

    if (isTeensy(device)) {
        setState('device-selected');
    } else {
        device = null;
        setState('device-error');
    }
});

on('#firmware button.flash', 'click', async () => {
    const progress = document.querySelector('#firmware progress.flash');

    setState('flashing');
    try {
        await flash(blocks, device, p => progress.value = p);
    } catch (error) {
        console.error(error);
        setState('flash-error');
        return;
    }

    setState('flash-success');
});
