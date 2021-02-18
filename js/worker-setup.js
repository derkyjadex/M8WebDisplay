// Copyright 2021 James Deery
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
    navigator.serviceWorker
        .addEventListener('controllerchange', () => reload());

    let firstInstall = !navigator.serviceWorker.controller;

    const reg = await navigator.serviceWorker.register('worker.js');
    reg.addEventListener('updatefound', () => {
        if (firstInstall) {
            firstInstall = false;
            return;
        }

        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
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
