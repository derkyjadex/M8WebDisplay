// Copyright 2021 James Deery
// Released under the MIT licence, https://opensource.org/licenses/MIT

import { wait } from './util.js';

export class UsbConnection {
    _device;
    _parser;
    _onConnectionChanged;

    constructor(parser, onConnectionChanged) {
        this._parser = parser;
        this._onConnectionChanged = onConnectionChanged;
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

        await device.close().catch(() => {});
        this._onConnectionChanged(false);
    }

    async connect() {
        if (this._device)
            return;

        try {
            const devices = await navigator.usb.getDevices();
            this._device = devices.filter(d =>
                d.vendorId === 0x16c0 &&
                d.productId === 0x048a)[0];

            if (!this._device) {
                this._device = await navigator.usb.requestDevice({
                    filters: [{
                        vendorId: 0x16c0,
                        productId: 0x048a
                    }]
                });
            }

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
            this.disconnect(err);

            if (err.code !== DOMException.NOT_FOUND_ERR) {
                console.error(err);
                throw err;
            }
        }
    }

    deviceInfo() {
        const info = this._device.configuration.interfaces
            .flatMap(i => i.alternates[0].endpoints.map(ep => ({
                ifNum: i.interfaceNumber,
                class: i.alternates[0].interfaceClass,
                subClass: i.alternates[0].interfaceSubclass,
                protocol: i.alternates[0].interfaceProtocol,
                epNum: ep.endpointNumber,
                epDir: ep.direction,
                epType: ep.type,
                epPacketSize: ep.packetSize
            })));
        console.table(info);
    }
}

