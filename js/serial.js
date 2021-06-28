// Copyright 2021 James Deery
// Released under the MIT licence, https://opensource.org/licenses/MIT

import { wait } from './util.js';

export class SerialConnection {
    _port;
    _parser;
    _onConnectionChanged;
    _waitingForUserSelection;

    constructor(parser, onConnectionChanged) {
        this._parser = parser;
        this._onConnectionChanged = onConnectionChanged;
        this._waitingForUserSelection = false;

        navigator.serial.addEventListener('connect', e => {
            if (!this._waitingForUserSelection) {
                this.connect().catch(() => {});
            }
        });
    }

    get isConnected() {
        return !!this._port;
    }

    async _startReading() {
        try {
            while (this._port) {
                const { value, done } = await this._port.reader.read();
                if (value) {
                    try {
                        this._parser.process(value);
                    } catch (err) {
                        console.error(err);
                    }
                }

                if (done)
                    return;
            }
        } catch (err) {
            console.error(err);
            this.disconnect();
        }
    }

    async _send(msg) {
        if (!this._port || !this._port.writer)
            return;

        try {
            await this._port.writer.write(new Uint8Array(msg));
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
        await this._port.writer.write(new Uint8Array([0x44]));
        await wait(50);
        this._parser.reset();
        await this._port.writer.write(new Uint8Array([0x45, 0x52]));
    }

    async disconnect() {
        const port = this._port;
        if (!port)
            return;

        this._port = null;

        port.writer && await port.writer.write(new Uint8Array([0x44])).catch(() => {});
        port.reader && await port.reader.cancel().catch(() => {});
        await port.close().catch(() => {});

        this._onConnectionChanged(false);
    }

    async connect(autoConnecting = false) {
        if (this._port)
            return;

        try {
            const ports = await navigator.serial.getPorts();
            this._port = ports
                .filter(p => {
                    const info = p.getInfo();
                    return info.usbVendorId === 0x16c0 &&
                        info.usbProductId === 0x048a
                })[0];

            if (!this._port) {
                if (autoConnecting) {
                    this._onConnectionChanged(false);
                } else {
                    this._port = await this._requestPort();
                }
            }

            if (!this._port)
                return;

            await this._port.open({
                baudRate: 9600,
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
                bufferSize: 4096
            });

            this._port.reader = await this._port.readable.getReader();
            this._port.writer = await this._port.writable.getWriter();

            await this._reset();
            this._startReading();

            this._onConnectionChanged(true);

        } catch (err) {
            console.error(err);
            this.disconnect(err);
            throw err;
        }
    }

    async _requestPort() {
        this._waitingForUserSelection = true;
        try {
            return await navigator.serial.requestPort({
                filters: [{
                    usbVendorId: 0x16c0,
                    usbProductId: 0x048a
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

