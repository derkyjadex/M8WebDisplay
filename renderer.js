export class Renderer {
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
