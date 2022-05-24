// Copyright 2021-2022 James Deery
// Released under the MIT licence, https://opensource.org/licenses/MIT

import { show, hide, on } from './util.js';

const updateInterval = 30 * 60 * 1000;

let reloading = false;
function reload() {
    if (!reloading) {
        window.location.reload();
        reloading = true;
    }
}

let reloadAction = () => {};
on('#reload button', 'click', () => reloadAction());

export async function setup() {
    on(navigator.serviceWorker, 'controllerchange', () => reload());

    let firstInstall = !navigator.serviceWorker.controller;

    const reg = await navigator.serviceWorker.register('worker.js');
    on(reg, 'updatefound', () => {
        if (firstInstall) {
            firstInstall = false;
            return;
        }

        const newWorker = reg.installing;
        on(newWorker, 'statechange', () => {
            if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                    reloadAction = () =>
                        newWorker.postMessage({ action: 'skipWaiting' });

                } else {
                    reloadAction = reload;
                }

                show('#reload');
            }
        });
    });

    setInterval(() => reg.update(), updateInterval);
}
