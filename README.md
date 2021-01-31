# M8 Headless Web Display

This is alternative frontend for [M8 Headless](https://github.com/DirtyWave/M8HeadlessFirmware).

It runs entirely in the browser and only needs to be hosted on a server to satisfy browser security policies. No network communication is involved.

Try it out at https://derkyjadex.github.io/M8WebDisplay/. **Use at your own risk.**

This project is very much at a proof of concept stage. I've implemented the display (without the waveform), keyboard input and audio routing from the M8's output to the default audio device. It needs a bunch of work to make it more robust and probably fix numerous bugs.

## Supported Platforms

The following should generally work, details are below.

- Chrome on macOS
- Chrome on Windows, with experimental flag
- Chrome on Linux, with experimental flag
- Chrome on Android, without audio

This relies on the Web Serial API to communicate with the M8. This API is currently only supported by Google Chrome as an experimental feature. It is due to be fully available in the [next Chrome release](https://www.chromestatus.com/features/schedule) on 2nd March 2021. Until then you can enable it by going to `chrome://flags` and enabling the "Experimental Web Platform features" option.

As a temporary alternative the code can fallback to using the WebUSB API, which is supported in the current version of Chrome. However this only works correctly on macOS and Android due to the way that Windows and Linux load their serial drivers.

The way that that Android handles USB audio devices (such as the M8) prevents us from being able to redirect the audio to the phone's speakers or headphone output. When the M8 is attached, Android appears to completely disable the internal audio interface and uses the M8 for all audio input and output instead. So the page is able to receive the audio from the M8 but it does not have anywhere to redirect it to other than the M8 itself.

## TODO/Ideas

- Selectable audio output device
- Render everything with WebGL?
- Custom key mappings
- Gamepad input
- Notify updates from ServiceWorker
- Teensy firmware loader

## Licence

This code is released under the MIT licence.

See LICENSE for more details.
