// Copyright 2021 James Deery
// Released under the MIT licence, https://opensource.org/licenses/MIT

const START_LINE = Symbol('START_LINE');
const HEX1 = Symbol('HEX1');
const HEX2 = Symbol('HEX2');

export async function readHexToBlocks(file, blockSize, offset) {
	const blocks = [];

	for await (let { address, data } of parseHex(file)) {
        address -= offset;
        if (address < 0)
            throw new HexFormatError(`Negative address after applying offset`);

		let blockIndex = Math.floor(address / blockSize);
		let dataIndex = 0;
		while (dataIndex < data.length) {
			let block = blocks[blockIndex];
			if (!block) {
				block = blocks[blockIndex] = new Uint8Array(blockSize);
                block.fill(0xff);
			}

			const blockStart = blockIndex * blockSize;
			const blockEnd = blockStart + blockSize;
			const copyStart = address + dataIndex - blockStart;
			const copyEnd = address + data.length > blockEnd
				? blockSize
				: copyStart + data.length - dataIndex;

			for (let i = copyStart; i < copyEnd; i++) {
				block[i] = data[dataIndex++];
			}
			blockIndex++;
		}
	}

	return blocks;
}

async function* parseHex(file) {
	const buffer = new Uint8Array(260);
	let state = START_LINE;
	let line = 1;
	let char = 0;
	let bufferIndex = 0;
	let value = 0;
	let checksum = 0;
	let lineBytes = 1;
	let seenEnd = false;
	let baseAddress = 0;

    const reader = file.stream().getReader();
    while (true) {
        const result = await reader.read();

        if (!result.value)
            break;

        for (const byte of result.value) {
            char++;

            if (seenEnd)
                throw new HexFormatError(
                    `Unexpected data after end record, line ${line} char ${char}`);

            switch (state) {
                case START_LINE:
                    switch (byte) {
                        case 0x3a: // :
                            state = HEX1;
                            break;

                        default:
                            throw new HexFormatError(
                                `Expecting ':' at start of line ${line} char ${char}`);
                    }
                    break;

                case HEX1:
                    if (byte === 0x0d) // \r
                        continue;

                    if (byte === 0x0a) { // \n
                        if (bufferIndex < lineBytes)
                            throw new HexFormatError(
                                `Unexpected end of line on line ${line} char ${char}`);

                        if (checksum !== 0)
                            throw new HexFormatError(
                                `Invalid checksum on line ${line}`);

                        switch (buffer[3]) {
                            case 0x00:
                                yield {
                                    address: baseAddress + buffer[1] * 256 + buffer[2],
                                    data: buffer.subarray(4, lineBytes - 1)
                                };
                                break;

                            case 0x01:
                                seenEnd = true;
                                break;

                            case 0x02:
                                baseAddress = (buffer[4] * 256 + buffer[5]) << 4;
                                break;

                            case 0x03:
                                break;

                            case 0x04:
                                baseAddress = (buffer[4] * 256 + buffer[5]) << 16;
                                break;

                            case 0x05:
                                break;

                            default:
                                throw new HexFormatError(
                                    `Invalid record type on line ${line}`);
                        }

                        state = START_LINE;
                        line++;
                        char = 0;
                        bufferIndex = 0;
                        checksum = 0;
                        lineBytes = 1;

                    } else {
                        if (bufferIndex >= lineBytes)
                            throw new HexFormatError(
                                `Record too long on line ${line} char ${char}`);

                        const hexValue = fromHex(byte);
                        if (hexValue === null)
                            throw new HexFormatError(
                                `Expecting hex character on line ${line} char ${char}`);

                        value = hexValue * 16;
                        state = HEX2;
                    }
                    break;

                case HEX2:
                    const hexValue = fromHex(byte);
                    if (hexValue === null)
                        throw new HexFormatError(
                            `Expecting hex character on line ${line} char ${char}`);

                    value += hexValue;
                    checksum = (checksum + value) & 0xFF;
                    if (bufferIndex === 0) {
                        lineBytes = value + 5;
                    }
                    buffer[bufferIndex++] = value;
                    state = HEX1;
                    break;
            }
        }

        if (result.done)
            break;
    }

    if (seenEnd)
        return;

    if (state != HEX1 || byte < lineBytes)
        throw new HexFormatError(
            `Unexpected end of file, line ${line} char ${char}`);

    if (checksum !== 0)
        throw new HexFormatError(
            `Invalid checksum on line ${line}`);

    const type = buffer[3];
    if (type !== 0x01)
        throw new HexFormatError(
            `Missing end of file record, line ${line}`);
}

function fromHex(byte) {
    if (byte >= 0x30 && byte <= 0x39)
        return byte - 0x30;

    if (byte >= 0x41 && byte <= 0x46)
        return byte - 0x37;

    if (byte >= 0x61 && byte <= 0x66)
        return byte - 0x57;

    return null;
}

export class HexFormatError extends Error {
    constructor(...params) {
        super(...params);
        this.name = 'HexFormatError';
    }
}
