window.document.___capture___ = function () {
    
    function _log (level, msg) {
        chrome.runtime.sendMessage({
            command: 'log',
            level: level,
            content: msg
        });
    }

    var capture = this,
        scrollBarWidth = 0,
        scrollLeft = 0,
        scrollTop = 0,
        pageWidth = 0,
        pageHeight = 0,
        winHeight = 0,
        winWidth = 0;
    capture.log = {
        debug : function (msg) { _log('debug', msg); },
        error : function (msg) { _log('error', msg); },
        info    : function (msg) { _log('info',    msg); },
        warn    : function (msg) { _log('warn',    msg); }
    };
    capture.buffer = {};
    capture.cache = {};
    capture.url = document.location.toString();
    capture.title = document.title;
    capture.screen = {
        x1: 0,
        x2: 32768,
        y1: 0,
        y2: 32765,
        scrollTop: document.body.scrollTop,
        scrollLeft: document.body.scrollLeft
    };

    // http://stackoverflow.com/a/16091319
    function _detectZoom() {
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.setAttribute('version', '1.1');
        document.body.appendChild(svg);
        var z = svg.currentScale;
        document.body.removeChild(svg);
        return z;
    }

    capture.convertFixedElements = function (key, value) {
        capture.restoreFixed = [];
        var all = document.getElementsByTagName("*");
        for (var i=0, max=all.length; i < max; i++) {
            var computed = (window.getComputedStyle(all[i]))
                    .getPropertyValue('position'),
                inline = all[i].style && all[i].style.position;
            if (computed === 'fixed' || inline === 'fixed') {
                var details = {
                    element: all[i],
                    top: all[i].top,
                    position: all[i].style.position
                };
                details[key] = all[i].style[key];
                capture.restoreFixed.push(details);
                all[i].style.top = '';
                all[i].style[key] = value;
            }
        }
    };

    capture.scrollToCurrent = function() {
        capture.log.debug('Scroll left: ' + capture.X + ' top: ' + capture.Y);
        document.body.scrollLeft = capture.X;
        document.body.scrollTop = capture.Y;
    }

    function _getDimensions (screen) {
        if (screen.y2 > document.height) screen.y2 = document.height;
        if (screen.x2 > document.width) screen.x2 = document.width;
        winWidth = window.innerWidth;
        pageWidth = document.body.scrollWidth;
        pageHeight = document.body.scrollHeight;
        winHeight = window.innerHeight;
        capture.X = 0;
        capture.Y = 0;
        if (
            (screen && screen.y1 > document.body.scrollTop)
                &&
            (screen.x1 > document.body.scrollLeft)
        ) {
            capture.Y = document.body.scrollTop;
            capture.X = document.body.scrollLeft;
        }
        else {
            capture.X = screen.x1;
            capture.Y = screen.y1;
        }
        var maxCanvas = 32668;

        if (screen.y2 - screen.y1 > maxCanvas) screen.y2 = screen.y1 +
            maxCanvas;
        if (screen.x2 - screen.x1 > maxCanvas) screen.x2 = screen.x1 +
            maxCanvas;

        if (
            (screen && screen.y1 > document.body.scrollTop)
                && 
            (screen.x1 > document.body.scrollLeft)
        ) {
            capture.Y = document.body.scrollTop;
            capture.X = document.body.scrollLeft;
        }
        else {
            capture.X = screen.x1;
            capture.Y = screen.y1;
        }
        capture.log.debug('capture.X: ' + capture.X + ' capture.Y: ' +
            capture.Y + ' screen: ' + JSON.stringify(screen));
        if (screen.y2 > 15000) {
            alert('Image too big');
            capture.restore();
            return;
        }
    }

    capture.isMorePage = function() {
        var isMore = false;
        if (capture.screen)
            if (capture.X + winWidth > capture.screen.x2 &&
                capture.Y + winHeight > capture.screen.y2)
                isMore=false;
        if (capture.X + winWidth < pageWidth) {
            capture.X += winWidth;
            isMore = true;
        } else {
            capture.X = 0;
            if (capture.Y + winHeight >= pageHeight)
                isMore = false;
            else {
                capture.Y += winHeight;
                isMore = true;
            }
        }
        return isMore;
    };

    capture.restore = function() {
        capture.X = scrollLeft;
        capture.Y = scrollTop;
        capture.scrollToCurrent();
        (document.getElementsByTagName('html'))[0]
            .setAttribute('style', 'overflow:auto');
        for (var i=0, max=capture.restoreFixed.length; i < max; i++) {
            var e = capture.restoreFixed[i].element;
            var style = window.getComputedStyle(e);
            e.style.top = capture.restoreFixed[i].top;
            e.style.position = capture.restoreFixed[i].position;
        }
    };

    capture.zoomLevel = _detectZoom();

    for (var i = 0; i < document.getElementsByTagName('meta').length; i++) {
        var a = document.getElementsByTagName('meta')[i];
        if (
            (a.getAttribute('name')
                && 
            a.getAttribute('name').toLowerCase() === 'description')
        ) {
            capture.description = a.getAttribute('content');
        }
    }
    capture.log.debug('Save position- scrollLeft: ' +
        document.body.scrollLeft + ' scrollTop: ' + document.body.scrollTop);
    scrollLeft = document.body.scrollLeft;
    scrollTop = document.body.scrollTop;
    (document.getElementsByTagName('html'))[0].setAttribute('style',
        'overflow:hidden');

    capture.convertFixedElements('position', 'absolute');
    _getDimensions(capture.screen);

    return capture;

};

document.width = (Math.max(
    document.body.scrollWidth,
    document.body.offsetWidth,
    document.documentElement.clientWidth,
    document.documentElement.scrollWidth,
    document.documentElement.offsetWidth
));

document.height = (Math.max(
 document.body.scrollHeight,
 document.body.offsetHeight,
 document.documentElement.clientHeight,
 document.documentElement.scrollHeight,
 document.documentElement.offsetHeight
));
var c = window.document.___capture___();
window.devicePixelRatio;
