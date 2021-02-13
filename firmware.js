import { show, hide, toggle, wait } from './util.js';
import { readHexToBlocks } from './hex.js';

const VID = 0x16c0;
const PID_WRITE = 0x0478;
const PID_REBOOT = 0x0483;
const PID_M8 = 0x048a;

export function open() {
    show('#firmware');
}

async function flash(blocks) {
    const progress = document.getElementById('firmware-progress');
    progress.value = 0;
    show('#firmware-progress');

    const [device] = await navigator.hid.requestDevice({
        filters: [{
            vendorId: 0x16c0,
            productId: 0x0478
        }]
    });

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
            progress.value = (i + 1) / blocks.length;
            await wait(i === 0 ? 1500 : 5);
        }

        buffer.fill(0);
        buffer[0] = 0xff;
        buffer[1] = 0xff;
        buffer[2] = 0xff;
        await device.sendReport(0, buffer);

        hide('#firmware');

    } finally {
        await device.close().catch(() => {});
    }
}

let blocks = null;

document
    .getElementById('firmware-file')
    .addEventListener('change', async e => {
        blocks = null;
        const file = e.target.files[0];
        try {
            blocks = file && await readHexToBlocks(file, 1024, 0x60000000);
        } finally {
            if (blocks) {
                show('#firmware-flash');
            } else {
                hide('#firmware-flash');
            }
        }
    });

document
    .getElementById('firmware-flash')
    .addEventListener('click', () =>
        flash(blocks));

hide('#firmware-flash');
