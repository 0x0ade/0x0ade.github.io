Main = {
    initialized: false,

    goto(path) {
        // TODO
        window.location.hash = path;
    }
};

document.addEventListener('DOMContentLoaded', e => {
    Main.initialized = true;

    Main.logoElem = document.getElementById('logo');
    
    Main.logoElem.addEventListener('click', e => {
        Main.goto('/');

        e.preventDefault();
    }, false);
    Main.logoElem.addEventListener('mousedown', e => e.preventDefault(), false);

}, false);