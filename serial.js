const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export class SerialConnection {
    _port;
    _reader;
    _writer;
    _parser;

    constructor(parser) {
        this._parser = parser;
    }

    get isConnected() {
        return !!this._port;
    }

    async _readIn() {
        while (true) {
            const { value, done } = await this._reader.read();
            if (done) {
                this._reader.releaseLock();
                break;
            }

            this._parser.process(value);
        }
    }

    async sendKeys(state) {
        await this._writer.write(new Uint8Array([0x43, state]));
    }

    async _reset() {
        await this._writer.write(new Uint8Array([0x44]));
        await wait(50);
        this._parser.reset();
        await this._writer.write(new Uint8Array([0x45, 0x52]));
    }

    async _disconnect(error) {
        console.error(error);

        if (this._reader) {
            await this._reader.cancel();
        }
        if (this._writer) {
            await this._writer.releaseLock();
        }
        if (this._port) {
            await this._port.close();
        }
        this._port = null;
        this._reader = null;
        this._writer = null;
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
                parity: 'none'
            });

            this._reader = await this._port.readable.getReader();
            this._writer = await this._port.writable.getWriter();

            await this._reset();
            await this._readIn();
        } catch (err) {
            this._disconnect(err);
            throw err;
        }
    }
}

