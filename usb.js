const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export class UsbConnection {
    #device;
    #parser;

    constructor(parser) {
        this.#parser = parser;
    }

    get isConnected() {
        return !!this.#device;
    }

    #readIn() {
        if (!this.#device)
            return;

        return this.#device.transferIn(3, 512)
            .then(result => {
                if (result.status !== 'ok') {
                    console.log(result);
                } else {
                    this.#parser.process(new Uint8Array(result.data.buffer));
                }

                return this.#readIn();
            });
    }

    sendKeys(state) {
        if (!this.#device)
            return;

        this.#device
            .transferOut(3, new Uint8Array([0x43, state]))
            .catch(this.#disconnect.bind(this));
    }

    #reset() {
        return this.#device
            .transferOut(3, new Uint8Array([0x44]))
            .then(() => wait(50))
            .then(() => {
                this.#parser.reset();
                return this.#device.transferOut(3, new Uint8Array([0x45, 0x52]));
            })
            .catch(this.#disconnect.bind(this));
    }

    #disconnect(error) {
        this.#device = null;
        console.error(error);
    }

    async connect() {
        if (this.#device)
            return;

        try {
            const devices = await navigator.usb.getDevices();
            this.#device = devices.filter(d =>
                d.vendorId === 0x16c0 &&
                d.productId === 0x048a)[0];

            if (!this.#device) {
                this.#device = await navigator.usb.requestDevice({
                    filters: [{
                        vendorId: 0x16c0,
                        productId: 0x048a
                    }]
                });
            }

            await this.#device.open();
            await this.#device.selectConfiguration(1);
            await this.#device.claimInterface(1);
            await this.#device.controlTransferOut(
                {
                    requestType: 'class',
                    recipient: 'interface',
                    request: 0x22,
                    value: 0x03,
                    index: 0x01
                });
            await this.#device.controlTransferOut(
                {
                    requestType: 'class',
                    recipient: 'interface',
                    request: 0x20,
                    value: 0x00,
                    index: 0x01
                },
                new Uint8Array([0x80, 0x25, 0x00, 0x00, 0x00, 0x00, 0x08]));

            await this.#reset();
            await this.#readIn();
        } catch (err) {
            this.#disconnect();
            throw err;
        }
    }

    deviceInfo() {
        const info = this.#device.configuration.interfaces
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

