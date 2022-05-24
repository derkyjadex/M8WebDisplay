// Copyright 2021-2022 James Deery
// Released under the MIT licence, https://opensource.org/licenses/MIT

import { wait, on } from './util.js';

export class UsbConnection {
    _device;
    _parser;
    _onConnectionChanged;
    _waitingForUserSelection;

    constructor(parser, onConnectionChanged) {
        this._parser = parser;
        this._onConnectionChanged = onConnectionChanged;
        this._waitingForUserSelection = false;

        on(navigator.usb, 'connect', e => {
            if (!this._waitingForUserSelection) {
                this.connect(true).catch(() => {});
            }
        });
    }

    get isConnected() {
        return !!this._device;
    }

    async _startReading() {
        try {
            while (this._device) {
                const result = await this._device.transferIn(3, 512);
                if (result.status !== 'ok') {
                    this.disconnect();

                } else {
                    this._parser.process(new Uint8Array(result.data.buffer));
                }
            }
        } catch (err) {
            console.error(err);
            this.disconnect();
        }
    }

    async _send(msg) {
        if (!this._device)
            return;

        try {
            await this._device.transferOut(3, new Uint8Array(msg));
        } catch (err) {
            console.error(err);
            this.disconnect();
        }
    }

    async sendKeys(state) {
        this._send([0x43, state]);
    }

    async sendNoteOn(note, vel) {
        this._send([0x4B, note, vel]);
    }

    async sendNoteOff() {
        this._send([0x4B, 255]);
    }

    async _reset() {
        await this._device.transferOut(3, new Uint8Array([0x44]));
        await wait(50);
        this._parser.reset();
        await this._device.transferOut(3, new Uint8Array([0x45, 0x52]));
    }

    async disconnect() {
        const device = this._device;
        if (!device)
            return;

        this._device = null;

        await device.transferOut(3, new Uint8Array([0x44])).catch(() => {});
        await device.close().catch(() => {});

        this._onConnectionChanged(false);
    }

    async connect(autoConnecting = false) {
        if (this._device)
            return;

        try {
            const devices = (await navigator.usb.getDevices())
                .filter(d =>
                    d.vendorId === 0x16c0 &&
                    d.productId === 0x048a);
            this._device = devices.length === 1 ? devices[0] : null;

            if (!this._device) {
                if (autoConnecting) {
                    this._onConnectionChanged(false);
                } else {
                    this._device = await this._requestDevice();
                }
            }

            if (!this._device)
                return;

            await this._device.open();
            await this._device.selectConfiguration(1);
            await this._device.claimInterface(1);
            await this._device.controlTransferOut(
                {
                    requestType: 'class',
                    recipient: 'interface',
                    request: 0x22,
                    value: 0x03,
                    index: 0x01
                });
            await this._device.controlTransferOut(
                {
                    requestType: 'class',
                    recipient: 'interface',
                    request: 0x20,
                    value: 0x00,
                    index: 0x01
                },
                new Uint8Array([0x80, 0x25, 0x00, 0x00, 0x00, 0x00, 0x08]));

            await this._reset();
            this._startReading();

            this._onConnectionChanged(true);

        } catch (err) {
            console.error(err);
            this.disconnect(err);
            throw err;
        }
    }

    async _requestDevice() {
        this._waitingForUserSelection = true;
        try {
            return await navigator.usb.requestDevice({
                filters: [{
                    vendorId: 0x16c0,
                    productId: 0x048a
                }]
            });
        } catch (err) {
            if (err.code !== DOMException.NOT_FOUND_ERR) {
                throw err;
            } else {
                return null;
            }
        } finally {
            this._waitingForUserSelection = false;
        }
    }
}

