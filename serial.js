const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export class SerialConnection {
    _port;
    _parser;
    _onConnectionChanged;

    constructor(parser, onConnectionChanged) {
        this._parser = parser;
        this._onConnectionChanged = onConnectionChanged;
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

    async sendKeys(state) {
        if (!this._port || !this._port.writer)
            return;

        try {
            await this._port.writer.write(new Uint8Array([0x43, state]));
        } catch (err) {
            console.error(err);
            this.disconnect();
        }
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

        port.reader && await port.reader.cancel().catch(() => {});
        port.writer && await port.writer.close().catch(() => {});
        await port.close().catch(() => {});

        this._onConnectionChanged(false);
    }

    async connect() {
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
                this._port = await navigator.serial.requestPort({
                    filters: [{
                        usbVendorId: 0x16c0,
                        usbProductId: 0x048a
                    }]
                });
            }

            await this._port.open({
                baudRate: 9600,
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
                bufferSize: 512
            });

            this._port.reader = await this._port.readable.getReader();
            this._port.writer = await this._port.writable.getWriter();

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
}

