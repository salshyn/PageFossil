module.exports = function (config, log, annotate, edge) {

    var mouse = this;

    function _pos(e) {
        var height = annotate.container.clientHeight,
            width = annotate.container.clientWidth,
            rect = annotate.container.getBoundingClientRect(),
            left = rect.left,
            top = rect.top,
            pageX = (e.clientX + document.body.scrollLeft),
            pageY = (e.clientY + document.body.scrollTop);
        var coords = {
            x: (edge.ex1 + pageX - left + annotate.container.scrollLeft),
            y: (edge.ey1 + pageY - top + annotate.container.scrollTop)
        };
        if (
            (coords.x < 0    || coords.y < 0) ||
            (pageX > left + width - annotate.scrollBarWidth) ||
            (pageY > top + height - annotate.scrollBarHeight) ||
            (pageX < left) ||
            (pageY < top)
        ) {
            return false;
        }
        else {
            return coords;
        }
    }

    mouse.hold = function (element, timeout, f) {
        if (timeout && typeof timeout === 'function') {
            f = timeout;
            timeout = 100;
        }
        if (f && typeof f === 'function') {
            var intervalId = 0;
            var step = 0;
            var elements = document.querySelectorAll('#' +
                element.getAttribute('id'));
            return Array.prototype.forEach.call(elements, function(el, i) {
                el.addEventListener('mousedown', function(e) {
                    step = 1;
                    var ctr = 0;
                    var t = element;
                    intervalId = setInterval(function() {
                        ctr++;
                        f.call(t, ctr);
                        step = 2;
                    }, timeout);
                });
                clearMousehold = function() {
                    clearInterval(intervalId);
                    if (step === 1) f.call(this, 1);
                    step = 0;
                }
                el.addEventListener('mouseout', clearMousehold);
                el.addEventListener('mouseup', clearMousehold);
             });
        }
    };

    mouse.listen = function() {
        document.body.addEventListener('mousedown',function (e) {
            if ((e.target.id == 'annotate-palette-close') ||
               (e.target.id == 'annotate-close-modal')) {
                return false;
            }
            if (
                parseInt(e.button) === 0 &&
                (e.target.id !== 'annotate-modal-notes')
            ) {
                e.preventDefault();
                var coords = _pos(e);
                if (!coords) annotate.pen.stop();
                if (coords && annotate.pen.status === 'ready')
                    annotate.pen.begin(coords);
                if ((e.currentTarget.id).toString() === 'annotate')
                    return false;
            }
        });
        document.body.addEventListener('mousemove',function (e) {
            var coords = _pos(e);
            annotate.container.style.cursor = 'default';
            if (coords) {
                if ( (annotate.pen.status=='ready' ||
                      annotate.pen.status=='started'))
                    annotate.container.style.cursor = 'crosshair';
                if(annotate.pen.status=='started')
                    annotate.pen.move(coords);
            }
        });
        document.body.addEventListener('mouseup',function (e) {
            annotate.pen.up();
        });
    };

    return mouse;
};

