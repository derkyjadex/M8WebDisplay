// Copyright 2021 James Deery
// Released under the MIT licence, https://opensource.org/licenses/MIT

import * as Shaders from '../build/shaders.js';
import { font } from '../build/font.js';

const MAX_RECTS = 1024;

export class Renderer {
    _canvas;
    _gl;
    _bg = [0, 0, 0];
    _frameQueued = false;

    _onBackgroundChanged;

    constructor(bg, onBackgroundChanged) {
        this._bg = [bg[0] / 255, bg[1] / 255, bg[2] / 255];
        this._onBackgroundChanged = onBackgroundChanged;

        this._canvas = document.getElementById('canvas')
        this._gl = this._canvas.getContext('webgl2', {
            alpha: false,
            antialias: false
        });

        const gl = this._gl;

        this._setupRects(gl);
        this._setupText(gl);
        this._setupWave(gl);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.viewport(0, 0, 320, 240);

        this._queueFrame();
    }

    _rectShader;
    _rectVao;
    _rectShapes = new Uint16Array(MAX_RECTS * 6);
    _rectColours = new Uint8Array(this._rectShapes.buffer, 8);
    _rectCount = 0;
    _rectsClear = true;
    _rectsTex;
    _rectsFramebuffer;
    _blitShader;

    _setupRects(gl) {
        this._rectShader = buildProgram(gl, 'rect');

        this._rectVao = gl.createVertexArray();
        gl.bindVertexArray(this._rectVao);

        this._rectShapes.glBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._rectShapes.glBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._rectShapes, gl.STREAM_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 4, gl.UNSIGNED_SHORT, false, 12, 0);
        gl.vertexAttribDivisor(0, 1);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.UNSIGNED_BYTE, true, 12, 8);
        gl.vertexAttribDivisor(1, 1);

        this._rectsTex = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._rectsTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 320, 240, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        this._rectsFramebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._rectsFramebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._rectsTex, 0);

        this._blitShader = buildProgram(gl, 'blit');
        gl.useProgram(this._blitShader);
        gl.uniform1i(gl.getUniformLocation(this._blitShader, 'src'), 0);
    }

    _renderRects(gl) {
        if (this._rectsClear) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this._rectsFramebuffer);

            gl.clearColor(this._bg[0], this._bg[1], this._bg[2], 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
            this._rectsClear = false;
        }

        if (this._rectCount > 0) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this._rectsFramebuffer);

            gl.useProgram(this._rectShader);
            gl.bindVertexArray(this._rectVao);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._rectShapes.glBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._rectShapes.subarray(0, this._rectCount * 6));

            gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this._rectCount);

            this._rectCount = 0;
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.useProgram(this._blitShader);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    drawRect(x, y, w, h, r, g, b) {
        if (x === 0 && y === 0 && w === 320 && h === 240) {
            this._onBackgroundChanged(r, g, b);

            this._bg = [r / 255, g / 255, b / 255];
            this._rectCount = 0;
            this._rectsClear = true;

        } else if (this._rectCount < MAX_RECTS) {
            const i = this._rectCount;
            this._rectShapes[i * 6 + 0] = x;
            this._rectShapes[i * 6 + 1] = y;
            this._rectShapes[i * 6 + 2] = w;
            this._rectShapes[i * 6 + 3] = h;
            this._rectColours[i * 12 + 0] = r;
            this._rectColours[i * 12 + 1] = g;
            this._rectColours[i * 12 + 2] = b;
            this._rectCount++;
        }

        if (this._rectCount >= MAX_RECTS) {
            this._renderRects(this._gl);
        }

        this._queueFrame();
    }

    _textShader;
    _textVao;
    _textTex;
    _textColours = new Uint8Array(40 * 24 * 3);
    _textChars = new Uint8Array(40 * 24);

    _setupText(gl) {
        this._textShader = buildProgram(gl, 'text');
        gl.useProgram(this._textShader);
        gl.uniform1i(gl.getUniformLocation(this._textShader, 'font'), 1);

        this._textVao = gl.createVertexArray();
        gl.bindVertexArray(this._textVao);

        this._textColours.glBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._textColours.glBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._textColours, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.UNSIGNED_BYTE, true, 0, 0);
        gl.vertexAttribDivisor(0, 1);

        this._textChars.glBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._textChars.glBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._textChars, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 1, gl.UNSIGNED_BYTE, false, 0, 0);
        gl.vertexAttribDivisor(1, 1);

        this._textTex = gl.createTexture();
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this._textTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 470, 7, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        const fontImage = new Image();
        fontImage.onload = () => {
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this._textTex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 470, 7, 0, gl.RGBA, gl.UNSIGNED_BYTE, fontImage);
            this._queueFrame();
        }
        fontImage.src = font;
    }

    _renderText(gl) {
        gl.useProgram(this._textShader);
        gl.bindVertexArray(this._textVao);

        if (this._textColours.updated) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this._textColours.glBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._textColours);
            this._textColours.updated = false;
        }

        if (this._textChars.updated) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this._textChars.glBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._textChars);
            this._textChars.updated = false;
        }

        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, 40 * 24);
    }

    drawText(c, x, y, r, g, b) {
        const i = Math.floor(y / 10) * 40 + Math.floor(x / 8);
        this._textChars[i] = c - 32;
        this._textChars.updated = true;
        this._textColours[i * 3 + 0] = r;
        this._textColours[i * 3 + 1] = g;
        this._textColours[i * 3 + 2] = b;
        this._textColours.updated = true;

        this._queueFrame();
    }
        
    _waveData = new Uint8Array(320);
    _waveColour = new Float32Array([0.5, 1, 1]);
    _waveOn = false;

    _setupWave(gl) {
        this._waveShader = buildProgram(gl, 'wave');
        this._waveShader.colourUniform = gl.getUniformLocation(this._waveShader, 'colour');
        this._waveVao = gl.createVertexArray();
        gl.bindVertexArray(this._waveVao);

        this._waveData.glBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._waveData.glBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._waveData, gl.STREAM_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribIPointer(0, 1, gl.UNSIGNED_BYTE, 1, 0);
    }

    _renderWave(gl) {
        if (this._waveOn) {
            gl.useProgram(this._waveShader);
            gl.uniform3fv(this._waveShader.colourUniform, this._waveColour);
            gl.bindVertexArray(this._waveVao);

            if (this._waveData.updated) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this._waveData.glBuffer);
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._waveData);
                this._waveData.updated = false;
            }

            gl.drawArrays(gl.POINTS, 0, 320);
        }
    }

    drawWave(r, g, b, data) {
        this._waveColour[0] = r / 255;
        this._waveColour[1] = g / 255;
        this._waveColour[2] = b / 255;

        if (data.length == 320) {
            this._waveData.set(data);
            this._waveData.updated = true;
            this._waveOn = true;
            this._queueFrame();

        } else if (this._waveOn) {
            this._waveOn = false;
            this._queueFrame();
        }
    }

    _randomData() {
        for (let i = 0; i < 10; i++) {
            this.drawRect(
                rand(0, 300),
                rand(0, 220),
                rand(5, 25),
                rand(5, 25),
                rand(0, 255),
                rand(0, 255),
                rand(0, 255));
        }

        for (let x = 0; x < 320; x += 8) {
            for (let y = 0; y < 240; y += 10) {
                this.drawText(
                    String.fromCharCode(rand(20, 126)),
                    x, y,
                    rand(0, 255),
                    rand(0, 255),
                    rand(0, 255));
            }
        }

        this.drawWave(
            rand(0, 255),
            rand(0, 255),
            rand(0, 255),
            new Uint8Array(Array(320).fill().map(() => rand(0, 20))));
    }

    _renderFrame() {
        const gl = this._gl;

        this._renderRects(gl);
        this._renderText(gl);
        this._renderWave(gl);

        this._frameQueued = false;
    }

    _queueFrame() {
        if (!this._frameQueued) {
            requestAnimationFrame(() => this._renderFrame());
            this._frameQueued = true;
        }
    }

    clear() {
        this._rectsClear = true;
        this._rectCount = 0;
        this._textChars.fill(0);
        this._textChars.updated = true;
        this._waveOn = false;

        this._queueFrame();
    }
}

function compileShader(gl, name, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, Shaders[name]);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error(`Failed to compile shader (${name}): ${gl.getShaderInfoLog(shader)}`);

    return shader;
}

function linkProgram(gl, name, vertexShader, fragmentShader) {
    const program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error(`Failed to link program (${name}): ${gl.getProgramInfoLog(program)}`);

    return program;
}

function buildProgram(gl, name) {
    return linkProgram(
        gl,
        name,
        compileShader(gl, `${name}_vert`, gl.VERTEX_SHADER),
        compileShader(gl, `${name}_frag`, gl.FRAGMENT_SHADER));
}

function rand(min, max) {
    return min + Math.floor(Math.random() * (max - min));
}
