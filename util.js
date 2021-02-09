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
    button.addEventListener('click', onClick);
    document
        .querySelector(target)
        .append(button);

    return button;
}
