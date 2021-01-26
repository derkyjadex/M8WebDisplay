# M8 Headless Web Display

This is alternative frontend for [M8 Headless](https://github.com/DirtyWave/M8HeadlessFirmware).

It runs entirely in the browser and only needs to be hosted on a server to satisfy browser security policies. No network communication is involved.

Try it out at https://derkyjadex.github.io/M8WebDisplay/. **Use at your own risk.**

This project is very much at a proof of concept stage. I've implemented the display (without the waveform), keyboard input and audio routing from the M8's output to the default audio device. It needs a bunch of work to make it more robust and probably fix numerous bugs.

## Supported Platforms

This relies on the WebUSB API to communicate with the M8, which means that it only works on Google Chrome/Chromium-derived browsers. So it should work on Chrome, Edge and Opera on Windows, macOS and Linux. It *probably* works on Chrome for Android too. I've only actually tested with Chrome on macOS though.

## TODO/Ideas

- Modularise code
- Handle connection events and error conditions
- Start audio as early as possible (after first "user gesture")
- Selectable audio output device
- Render waveform
- Render everything with WebGL?
- Custom key mappings
- Gamepad input
- ServiceWorker/PWA for full offline support
- Teensy firmware loader

## Licence

This code is released under the MIT licence.

See LICENSE for more details.
