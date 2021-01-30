const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export class UsbConnection {
    _device;
    _parser;

    constructor(parser) {
        this._parser = parser;
    }

    get isConnected() {
        return !!this._device;
    }

    _readIn() {
        if (!this._device)
            return;

        return this._device.transferIn(3, 512)
            .then(result => {
                if (result.status !== 'ok') {
                    console.log(result);
                } else {
                    this._parser.process(new Uint8Array(result.data.buffer));
                }

                return this._readIn();
            });
    }

    sendKeys(state) {
        if (!this._device)
            return;

        this._device
            .transferOut(3, new Uint8Array([0x43, state]))
            .catch(this._disconnect.bind(this));
    }

    _reset() {
        return this._device
            .transferOut(3, new Uint8Array([0x44]))
            .then(() => wait(50))
            .then(() => {
                this._parser.reset();
                return this._device.transferOut(3, new Uint8Array([0x45, 0x52]));
            })
            .catch(this._disconnect.bind(this));
    }

    _disconnect(error) {
        this._device = null;
        console.error(error);
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
            await this._readIn();
        } catch (err) {
            this._disconnect();
            throw err;
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

