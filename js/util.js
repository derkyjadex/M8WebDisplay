// Copyright 2021 James Deery
// Released under the MIT licence, https://opensource.org/licenses/MIT

export function show(query) {
    document
        .querySelectorAll(query)
        .forEach(e => e.classList.remove('hidden'));
}

export function hide(query) {
    document
        .querySelectorAll(query)
        .forEach(e => e.classList.add('hidden'));
}

export function toggle(query) {
    document
        .querySelectorAll(query)
        .forEach(e => e.classList.contains('hidden')
            ? e.classList.remove('hidden')
            : e.classList.add('hidden'));
}

export function wait(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

export function appendButton(target, title, onClick) {
    const button = document.createElement('button');
    button.innerText = title;
    on(button, 'click', onClick);

    if (typeof target === 'string') {
        target = document.querySelector(target)
    }

    target.append(button);

    return button;
}

export function on(target, eventType, action) {
    if (typeof target === 'string') {
        target = document.querySelectorAll(target);
    } else if (!(target instanceof Array)) {
        target = [target];
    }

    for (const element of target) {
        element.addEventListener(eventType, action);
    }
}
