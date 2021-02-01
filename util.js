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

export function wait(time) {
    return new Promise(resolve => setTimeout(resolve, time));
};
