const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export class SerialConnection {
    #port;
    #reader;
    #writer;
    #parser;

    constructor(parser) {
        this.#parser = parser;
    }

    get isConnected() {
        return !!this.#port;
    }

    async #readIn() {
        while (true) {
            const { value, done } = await this.#reader.read();
            if (done) {
                this.#reader.releaseLock();
                break;
            }

            this.#parser.process(value);
        }
    }

    async sendKeys(state) {
        await this.#writer.write(new Uint8Array([0x43, state]));
    }

    async #reset() {
        await this.#writer.write(new Uint8Array([0x44]));
        await wait(50);
        this.#parser.reset();
        await this.#writer.write(new Uint8Array([0x45, 0x52]));
    }

    async #disconnect(error) {
        console.error(error);

        if (this.#reader) {
            await this.#reader.cancel();
        }
        if (this.#writer) {
            await this.#writer.releaseLock();
        }
        if (this.#port) {
            await this.#port.close();
        }
        this.#port = null;
        this.#reader = null;
        this.#writer = null;
    }

    async connect() {
        if (this.#port)
            return;

        try {
            const ports = await navigator.serial.getPorts();
            this.#port = ports
                .filter(p => {
                    const info = p.getInfo();
                    return info.usbVendorId === 0x16c0 &&
                        info.usbProductId === 0x048a
                })[0];

            if (!this.#port) {
                this.#port = await navigator.serial.requestPort({
                    filters: [{
                        usbVendorId: 0x16c0,
                        usbProductId: 0x048a
                    }]
                });
            }

            await this.#port.open({
                baudRate: 9600,
                dataBits: 8,
                stopBits: 1,
                parity: 'none'
            });

            this.#reader = await this.#port.readable.getReader();
            this.#writer = await this.#port.writable.getWriter();

            await this.#reset();
            await this.#readIn();
        } catch (err) {
            this.#disconnect(err);
            throw err;
        }
    }
}

