# M8 Headless Web Display

This is alternative frontend for [M8 Headless](https://github.com/DirtyWave/M8HeadlessFirmware).

It runs entirely in the browser and only needs to be hosted on a server to satisfy browser security policies. No network communication is involved.

Try it out at https://derkyjadex.github.io/M8WebDisplay/. **Use at your own risk.**

This is still a work in progress. The following have been implemented so far:

- Render the M8 display
- Route M8's audio out to the default audio output
- Keyboard and gamepad input
- Custom key/button mapping
- Touch-compatible on-screen keys
- Firmware loader
- Full offline support
- Installable as a [PWA](https://en.wikipedia.org/wiki/Progressive_web_application)

## Supported Platforms

The following should generally work, details are below.

- Chrome on macOS
- Chrome on Windows, with experimental flag
- Edge on Windows, with experimental flag
- Chrome on Linux\*, with experimental flag
- Chrome on Android, without audio\*\*

This relies on the Web Serial API to communicate with the M8. This API is currently only supported by Google Chrome as an experimental feature. It is due to be fully available in the [next Chrome release](https://www.chromestatus.com/features/schedule) on 2nd March 2021. Until then you can enable it by going to `chrome://flags` and enabling the "Experimental Web Platform features" option.

As a temporary alternative the code can fallback to using the WebUSB API, which is supported in the current version of Chrome. However this only works correctly on macOS and Android due to the way that Windows and Linux load their serial drivers.

\*On Ubuntu and Debian systems (and perhaps others) users do not have permission to access the M8's serial port by default. You will need to add yourself to the `dialout` group and restart your login session/reboot. After this you should be able to connect normally.

\*\*The way that that Android handles USB audio devices (such as the M8) prevents us from being able to redirect the audio to the phone's speakers or headphone output. When the M8 is attached, Android appears to completely disable the internal audio interface and uses the M8 for all audio input and output instead. So the page is able to receive the audio from the M8 but it does not have anywhere to redirect it to other than the M8 itself.

## TODO/Ideas

- Avoid/automatically recover from bad frames
- Auto-reboot for firmware loader/real M8 support
- Selectable audio output device

## Licence

This code is released under the MIT licence.

See LICENSE for more details.
