const NORMAL = Symbol('normal');
const ESCAPE = Symbol('escape');
const ERROR = Symbol('error');

export class Parser {
    _state = NORMAL;
    _buffer = [];
    _renderer;

    constructor(renderer) {
        this._renderer = renderer;
    }

    _processFrame(frame) {
        const type = frame[0];
        switch (type) {
            case 0xfe:
                if (frame.length >= 12) {
                    this._renderer.drawRect(
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
                    this._renderer.drawText(
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

            switch (this._state) {
                case NORMAL:
                    switch (b) {
                        case 0xc0:
                            this._processFrame(this._buffer);
                            this._buffer.length = 0;
                            break;

                        case 0xdb:
                            this._state = ESCAPE;
                            break;

                        default:
                            this._buffer.push(b);
                            break;
                    }
                    break;

                case ESCAPE:
                    switch (b) {
                        case 0xdc:
                            this._buffer.push(0xc0);
                            this._state = NORMAL;
                            break;

                        case 0xdd:
                            this._buffer.push(0xdb);
                            this._state = NORMAL;
                            break;

                        default:
                            this._state = ERROR;
                            console.log('Unexpected SLIP sequence');
                            break;
                    }
                    break;

                case ERROR:
                    switch (b) {
                        case 0xc0:
                            this._state = NORMAL;
                            this._buffer.length = 0;
                            console.log('SLIP recovered');
                            break;

                        default:
                            break;
                    }
            }
        }
    }

    reset() {
        this._state = NORMAL;
        this._buffer.length = 0;
    }
}

