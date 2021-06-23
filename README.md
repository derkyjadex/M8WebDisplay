# M8 Headless Web Display

This is alternative frontend for [M8 Headless](https://github.com/DirtyWave/M8HeadlessFirmware).

It runs entirely in the browser and only needs to be hosted on a server to satisfy browser security policies. No network communication is involved.

Try it out at https://derkyjadex.github.io/M8WebDisplay/.

Features:

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

- Chrome 89+ on macOS, Windows and Linux\*
- Edge 89+ on macOS and Windows
- Chrome on Android, without audio\*\*

The web display uses the Web Serial API to communicate with the M8. This API is currently only supported by desktop versions of Google Chrome and Microsoft Edge in versions 89 or later. For Chrome on Android the code can fallback to using the WebUSB API.

\*On Ubuntu and Debian systems (and perhaps others) users do not have permission to access the M8's serial port by default. You will need to add yourself to the `dialout` group and restart your login session/reboot. After this you should be able to connect normally.

\*\*The way that that Android handles USB audio devices (such as the M8) prevents us from being able to redirect the audio to the phone's speakers or headphone output. When the M8 is attached, Android appears to completely disable the internal audio interface and uses the M8 for all audio input and output instead. So the page is able to receive the audio from the M8 but it does not have anywhere to redirect it to other than the M8 itself.

## Developing

To build this project you need a standard unix-like environment and a recent-ish version of [Node.js](https://nodejs.org/) (15.6 works, earlier versions might not). You should be able to build on macOS, Linux and [WSL](https://docs.microsoft.com/en-us/windows/wsl/) on Windows.

From a fresh clone, run this in your terminal:

```
make run
```

This will download the necessary node packages, build the files required to run a debug version of the display and launch a local web server. If this is successful you can open http://localhost:8000/ in Chrome to launch the display. Press `ctrl-c` to stop the server.

You can edit the `*.js` files and simply refresh the page to see the changes. If you edit the `*.scss` files or the shaders you will need to run `make` to regenerate the necessary files before refreshing. You can do this from another terminal window/tab, there is no need to restart the server.

Chrome requires that pages are served securely in order to enable features such as the Serial API. Normally this means using HTTPS but there is an exception when you use `localhost`. If you want to test your changes on another computer on your network you will need to run the local web server with HTTPS:

```
make run HTTPS=true
```

This will generate a certificate and the local web server will now work from `https://<your-computer-name>:8000` (the full list of addresses is shown in the command output). When you use this address you will need to either ignore the security warning or install the certificate at `cert/server.crt` as a trusted Certificate Authority on your device.

To build a release version of the display run:

```
make deploy
```

This will build and copy the release files to the `deploy/` directory. These files can be hosted on any static web server as long as has an HTTPS address.

## TODO/Ideas

- Avoid/automatically recover from bad frames
- Auto-reboot for firmware loader/real M8 support
- Selectable audio output device

## Licence

This code is released under the MIT licence.

See LICENSE for more details.
