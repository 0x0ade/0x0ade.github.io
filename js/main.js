Main = {
    initialized: false,
    scheduled: [],

    path: window.location.pathname,

    domParser: new DOMParser(),

    hook(container) {
        var anchors = Array.prototype.slice.call(container.getElementsByTagName('a'));
        if (container.tagName.toLowerCase() == 'a')
            anchors.push(container);
        for (var i = 0; i < anchors.length; i++) {
            var elem = anchors[i];
            elem.addEventListener('click', e => {
                e.preventDefault();
                Main.goto(e.target.href, true);
            }, false);
        }
    },

    goto(path, manual) {
        if (path.startsWith(window.location.origin))
            path = path.substr(window.location.origin.length);

        if (Main.path === path)
            return;
        
        if (!Main.initialized) {
            Main.scheduled.push(() => Main.goto(path, push));
            return;
        }

        console.log('goto: ', path);

        Main.path = path;
        
        var fade = true;
        var fadeInEnd = 0;

        if (path.indexOf('://') !== -1) {
            // External path.
            window.location = path;
            // TODO: Don't fade out when f.e. opening external app.
            
        } else {
            // "Internal" path.

            if (window.DatArchive && window.location.protocol === "dat:") {
                // TODO: Make use of DatArchive.

            } else {
                fetch(path)
                .then(response => response.text())
                .then(body => {
                    if (!body.startsWith('<!DOCTYPE html>') || body.indexOf('<!-- MODDOC -->') === -1)
                        throw null;
                    
                    // "Parsing" HTML in the worst way possible.
                    
                    var titleIStart = body.indexOf('<title>');
                    var titleIEnd = body.indexOf('</title>', titleIStart);
                    var title = body.substring(titleIStart + '<title>'.length, titleIEnd);
                    title = Main.domParser.parseFromString(title, 'text/html').documentElement.textContent;
                    
                    var contentIStart = body.indexOf('<!-- MODDOC CONTENT START -->');
                    var contentIEnd = body.indexOf('<!-- MODDOC CONTENT END -->', contentIEnd);
                    var content = body.substring(contentIStart + '<!-- MODDOC CONTENT START -->'.length, contentIEnd);

                    if (manual)
                        history.pushState({
                            path: path
                        }, '', path);
                    
                    setTimeout(() => {
                        Main.mainElem.innerHTML = content;
                        Main.hook(Main.mainElem);
                        document.title = title;
                        if (manual && (!window.location.hash || window.location.hash.length < 1))
                            window.scrollTo(0, 0);
                        if (Main.BG)
                            Main.BG.dark = path !== '/';
                        Main.mainElem.setAttribute('data-fade', 'in');
                    }, Math.max(0, Math.ceil(fadeInEnd - window.performance.now())));
                })
                .catch(() => window.location = path);
            }
        }

        if (fade) {
            Main.mainElem.setAttribute('data-fade', 'out');
            fadeInEnd = window.performance.now() + 100;
        }

    }
};

window.addEventListener('popstate', e => {
    Main.goto(e.state.path, false);
}, false);

document.addEventListener('DOMContentLoaded', e => {
    history.replaceState({
        path: window.location.pathname
    }, '', window.location.pathname);

    Main.mainElem = document.getElementById('main');
    Main.hook(Main.mainElem);

    Main.logoElem = document.getElementById('logo');
    Main.hook(Main.logoElem);
    Main.logoElem.addEventListener('mousedown', e => e.preventDefault(), false);

    Main.initialized = true;

    if (history.state)
        Main.goto(history.state.path, false);

    for (var i = 0; i < Main.scheduled.length; i++) {
        Main.scheduled[i]();
    }

}, false);