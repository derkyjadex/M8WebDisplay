export class Renderer {
    _canvas = document.getElementById('canvas');
    _ctx = canvas.getContext('2d');
    _textNodes = [];
    _textUpdates = {};
    _textFrameQueued = false;
    _backgroundColour = 'rgb(0, 0, 0)';

    constructor() {
        this._buildText();
    }

    _buildText() {
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
                e.setAttributeNS(null, 'fill', '_000');
                const t = document.createTextNode('');
                e.appendChild(t);
                svg.appendChild(e);

                this._textNodes[y * 39 + x] = {
                    node: t,
                    char: ' ',
                    fill: '_000'
                };
            }
        }
    }

    drawRect(x, y, w, h, r, g, b) {
        const colour = `rgb(${r}, ${g}, ${b})`
        this._ctx.fillStyle = colour;
        this._ctx.fillRect(x, y, w, h);

        if (x === 0 && y === 0 && w === 320 && h === 240) {
            this._backgroundColour = colour;
            document.body.style.backgroundColor = colour;
        }
    }

    _updateText() {
        for (const [_, update] of Object.entries(this._textUpdates)) {
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

        this._textFrameQueued = false;
        this._textUpdates = {};
    }

    drawText(c, x, y, r, g, b) {
        const i = Math.floor(y / 10) * 39 + Math.floor(x / 8);
        if (this._textNodes[i]) {
            this._textUpdates[i] = {
                node: this._textNodes[i],
                char: c,
                fill: `rgb(${r}, ${g}, ${b})`
            };
            if (!this._textFrameQueued) {
                requestAnimationFrame(this._updateText.bind(this));
                this._textFrameQueued = true;
            }
        }
    }

    drawWave(r, g, b, data) {
        this._ctx.fillStyle = this._backgroundColour;
        this._ctx.fillRect(0, 0, 320, 21);

        this._ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
        for (let i = 0; i < data.length; i++) {
            const y = Math.min(data[i], 20);
            this._ctx.fillRect(i, y, 1, 1);
        }
    }
}
