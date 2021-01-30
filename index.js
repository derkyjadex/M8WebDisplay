const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

class Renderer {
    #canvas = document.getElementById('canvas');
    #ctx = canvas.getContext('2d');
    #textNodes = [];
    #textUpdates = {};
    #textFrameQueued = false;

    constructor() {
        this.#buildText();
    }

    #buildText() {
        const xmlns = 'http://www.w3.org/2000/svg';
        const svg = document.getElementById('svg');

        while (svg.firstChild) {
            svg.removeChild(svg.lastChild);
        }

        for (let y = 0; y < 25; y++) {
            for (let x = 0; x < 39; x++) {
                const e = document.createElementNS(xmlns, 'text');
                e.setAttributeNS(null, 'x', x * 16);
                e.setAttributeNS(null, 'y', y * 20 + 20);
                e.setAttributeNS(null, 'fill', '#000');
                const t = document.createTextNode('');
                e.appendChild(t);
                svg.appendChild(e);

                this.#textNodes[y * 39 + x] = {
                    node: t,
                    char: ' ',
                    fill: '#000'
                };
            }
        }
    }

    drawRect(x, y, w, h, r, g, b) {
        this.#ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        this.#ctx.fillRect(x, y, w, h);

        if (x === 0 && y === 0 && w === 320 && h === 240) {
            document.body.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
        }
    }

    #updateText() {
        for (const [_, update] of Object.entries(this.#textUpdates)) {
            const node = update.node;
            if (update.char !== node.char) {
                node.node.nodeValue = update.char;
                node.char = update.char;
            }
            if (update.fill !== node.fill) {
                node.node.parentElement.setAttributeNS(null, 'fill', update.fill);
                node.fill = update.fill;
            }
        }

        this.#textFrameQueued = false;
        this.#textUpdates = {};
    }

    drawText(c, x, y, r, g, b) {
        const i = Math.floor(y / 10) * 39 + Math.floor(x / 8);
        if (this.#textNodes[i]) {
            this.#textUpdates[i] = {
                node: this.#textNodes[i],
                char: c,
                fill: `rgb(${r}, ${g}, ${b})`
            };
            if (!this.#textFrameQueued) {
                requestAnimationFrame(this.#updateText.bind(this));
                this.#textFrameQueued = true;
            }
        }
    }
}


class Parser {
    #state = 'normal';
    #buffer = [];
    #renderer;

    constructor(renderer) {
        this.#renderer = renderer;
    }

    #processFrame(frame) {
        const type = frame[0];
        switch (type) {
            case 0xfe:
                if (frame.length >= 12) {
                    this.#renderer.drawRect(
                        frame[1] + frame[2] * 256,
                        frame[3] + frame[4] * 256,
                        frame[5] + frame[6] * 256,
                        frame[7] + frame[8] * 256,
                        frame[9],
                        frame[10],
                        frame[11]);
                } else {
                    console.log('Bad RECT frame');
                }
                break;

            case 0xfd:
                if (frame.length >= 9) {
                    this.#renderer.drawText(
                        String.fromCharCode(frame[1]),
                        frame[2] + frame[3] * 256,
                        frame[4] + frame[5] * 256,
                        frame[6],
                        frame[7],
                        frame[8]);
                } else {
                    console.log('Bad TEXT frame');
                }
                break;

            case 0xfc: // wave
            case 0xfb: // joypad
                break;

            default:
                console.log('BAD FRAME');
        }
    }

    process(data) {
        for (let i = 0; i < data.length; i++) {
            const b = data[i];

            switch (this.#state) {
                case 'normal':
                    switch (b) {
                        case 0xc0:
                            this.#processFrame(this.#buffer);
                            this.#buffer.length = 0;
                            break;

                        case 0xdb:
                            this.#state = 'escape';
                            break;

                        default:
                            this.#buffer.push(b);
                            break;
                    }
                    break;

                case 'escape':
                    switch (b) {
                        case 0xdc:
                            this.#buffer.push(0xc0);
                            this.#state = 'normal';
                            break;

                        case 0xdd:
                            this.#buffer.push(0xdb);
                            this.#state = 'normal';
                            break;

                        default:
                            this.#state = 'error';
                            console.log('Unexpected SLIP sequence');
                            break;
                    }
                    break;

                case 'error':
                    switch (b) {
                        case 0xc0:
                            this.#state = 'normal';
                            this.#buffer.length = 0;
                            console.log('SLIP recovered');
                            break;

                        default:
                            break;
                    }
            }
        }
    }

    reset() {
        this.#state = 'normal';
        this.#buffer.length = 0;
    }
}

class UsbConnection {
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


class SerialConnection {
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

class Input {
    #serialConnection;
    #usbConnection;

    #keyState = 0;

    #keyBitMap = {
        up: 6,
        down: 5,
        left: 7,
        right: 2,
        select: 4,
        start: 3,
        option: 1,
        edit: 0
    };

    #keyMap = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ShiftLeft: 'select',
        Space: 'start',
        KeyZ: 'option',
        KeyX: 'edit'
    };

    constructor(serialConnection, usbConnection) {
        this.#serialConnection = serialConnection;
        this.#usbConnection = usbConnection;
        this.#attachEventHandlers();
    }

    #updateKeys(key, isDown, e) {
        if (!key)
            return;

        e.preventDefault();

        const bit = this.#keyBitMap[key];
        if (bit === undefined)
            return;

        const state = isDown
            ? this.#keyState | (1 << bit)
            : this.#keyState & ~(1 << bit);

        if (state === this.#keyState)
            return;

        this.#keyState = state;

        if (this.#serialConnection.isConnected) {
            this.#serialConnection.sendKeys(state);
        } else if (this.#usbConnection.isConnected) {
            this.#usbConnection.sendKeys(state);
        }
    }

    #attachEventHandlers() {
        document.addEventListener('keydown', e =>
            this.#updateKeys(this.#keyMap[e.code], true, e));

        document.addEventListener('keyup', e =>
            this.#updateKeys(this.#keyMap[e.code], false, e));

        const controls = document.getElementById('controls');

        controls.addEventListener('mousedown', e =>
            this.#updateKeys(e.target.dataset.key, true, e));

        controls.addEventListener('touchstart', e =>
            this.#updateKeys(e.target.dataset.key, true, e));

        controls.addEventListener('mouseup', e =>
            this.#updateKeys(e.target.dataset.key, false, e));

        controls.addEventListener('touchend', e =>
            this.#updateKeys(e.target.dataset.key, false, e));
    }
}

class Audio {
    #ctx;

    start() {
        if (this.#ctx) {
            return this.#ctx
                .close()
                .then(() => {
                    this.#ctx = null;
                    return this.start();
                });
        }

        this.#ctx = new AudioContext();

        navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then(stream => navigator.mediaDevices
                .enumerateDevices())
            .then(devices => {
                const device = devices.filter(d =>
                    d.kind === 'audioinput' &&
                    /M8/.test(d.label) &&
                    d.deviceId !== 'default' &&
                    d.deviceId !== 'communications')[0];

                if (!device)
                    throw new Error('M8 not found');

                return device.deviceId;
            })
            .then(deviceId => navigator.mediaDevices
                .getUserMedia({ audio: {
                    deviceId: { exact: deviceId },
                    autoGainControl: false,
                    echoCancellation: false,
                    noiseSuppression: false
                } }))
            .then(stream => {
                const source = this.#ctx.createMediaStreamSource(stream);
                source.connect(this.#ctx.destination);
            })
            .catch(err => console.log(err));
    }
}

const renderer = new Renderer();
const parser = new Parser(renderer);
const usbConnection = new UsbConnection(parser);
const serialConnection = new SerialConnection(parser);
const input = new Input(serialConnection, usbConnection);
const audio = new Audio();

if (navigator.serial) {
    const button = document.createElement('button');
    button.innerText = 'Connect with Serial';
    document.getElementById('buttons').append(button);
    button.addEventListener('click', () => {
        audio.start();
        serialConnection.connect()
            .catch(() => document.getElementById('serial-fail').classList.remove('hidden'));
    });

} else if (navigator.usb) {
    const button = document.createElement('button');
    button.innerText = 'Connect with WebUSB';
    document.getElementById('buttons').append(button);
    button.addEventListener('click', () => {
        audio.start();
        usbConnection.connect()
            .catch(() => document.getElementById('usb-fail').classList.remove('hidden'));
    });
} else {
    document.getElementById('no-serial-usb').classList.remove('hidden');
}
