let ctx;

export function start() {
    if (ctx) {
        return ctx
            .close()
            .then(() => {
                ctx = null;
                return start();
            });
    }

    ctx = new AudioContext();

    navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(stream => navigator.mediaDevices
            .enumerateDevices())
        .then(devices => {
            const device = devices.filter(d =>
                d.kind === 'audioinput' &&
                /M8/.test(d.label) &&
                d.deviceId !== 'default' &&
                d.deviceId !== 'communications')[0];

            if (!device)
                throw new Error('M8 not found');

            return device.deviceId;
        })
        .then(deviceId => navigator.mediaDevices
            .getUserMedia({ audio: {
                deviceId: { exact: deviceId },
                autoGainControl: false,
                echoCancellation: false,
                noiseSuppression: false
            } }))
        .then(stream => {
            const source = ctx.createMediaStreamSource(stream);
            source.connect(ctx.destination);
        })
        .catch(err => console.log(err));
}

