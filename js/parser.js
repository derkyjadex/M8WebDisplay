// Copyright 2021 James Deery
// Released under the MIT licence, https://opensource.org/licenses/MIT

const NORMAL = Symbol('normal');
const ESCAPE = Symbol('escape');
const ERROR = Symbol('error');

const EMPTY = new Uint8Array(0);

export class Parser {
    _state = NORMAL;
    _buffer = new Uint8Array(512);
    _i = 0;
    _renderer;

    constructor(renderer) {
        this._renderer = renderer;
    }

    _processFrame(frame) {
        switch (frame[0]) {
            case 0xfe:
                if (frame.length === 12) {
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
                if (frame.length === 12) {
                    this._renderer.drawText(
                        frame[1],
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
                if (frame.length === 4) {
                    this._renderer.drawWave(
                        frame[1],
                        frame[2],
                        frame[3],
                        EMPTY);

                } else if (frame.length === 324) {
                    this._renderer.drawWave(
                        frame[1],
                        frame[2],
                        frame[3],
                        frame.subarray(4));

                } else {
                    console.log('Bad WAVE frame');
                }
                break;

            case 0xfb: // joypad
                if (frame.length !== 3) {
                    console.log('Bad JPAD frame');
                }
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
                            this._processFrame(this._buffer.subarray(0, this._i));
                            this._i = 0;
                            break;

                        case 0xdb:
                            this._state = ESCAPE;
                            break;

                        default:
                            this._buffer[this._i++] = b;
                            break;
                    }
                    break;

                case ESCAPE:
                    switch (b) {
                        case 0xdc:
                            this._buffer[this._i++] = 0xc0;
                            this._state = NORMAL;
                            break;

                        case 0xdd:
                            this._buffer[this._i++] = 0xdb;
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
                            this._i = 0;
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
        this._i = 0;
    }
}
