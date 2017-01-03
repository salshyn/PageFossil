var GraphemeBreaker = require('grapheme-breaker'),
    Mouse = require('./mouse.js'),
    Pen = require('./pen.js'),
    Pica = require('pica'),
    QR = require('./qr.js'),
    Save = require('./save.js');

module.exports = function (background) {

    // LABS-602
    if (localStorage.getItem('css') == 'style-invert') {
        document.getElementById('style').disabled = true;
        document.getElementById('style-invert').disabled = false;
    } else {
        document.getElementById('style').disabled = false;
        document.getElementById('style-invert').disabled = true;
    }

    var annotate = this,
        blockchain = background.blockchain,
        _byId = document.getElementById.bind(document),
        config = background.config,
        edge = {ex1: 0, ex2: 0, ey1: 0, ey2: 0},
        firstCanvas,
        fs = background.fs,
        log = background.log,
        mouse = new Mouse(config, log, annotate, edge),
        qr = new QR(config, log, annotate);

    annotate.scrollBarHeight = 0;
    annotate.scrollBarWidth = 0;

    Pica.WW = true;
    Pica.WEBGL = false;
    Pica.debug = console.log.bind(log);

    function _assignDOMnodes() {
        var elements = ['close-modal', 'container', 'border', 'edge',
            'grapheme-counter', 'header', 'image', 'modal-title',
            'modal-content', 'modal-notes', 'open-modal', 'screenshot-area',
            'tooltip', 'whole', 'palette', 'palette-black', 'palette-close',
            'palette-yellow', 'palette-orange', 'palette-red', 'palette-purple',
            'palette-blue', 'palette-green', 'palette-display'];
        for (var i=0; i<= elements.length - 1; i++) {
            var camelCased = elements[i].replace(/-([a-z])/g,
                function (c) { return c[1].toUpperCase(); }
            );
            annotate[camelCased] = _byId('annotate-' + elements[i]);
        }
    }

    function _getContext(done, edge) {
        var ctx = done.getContext('2d');
        ctx.drawImage(annotate.image,
            edge.ex1, edge.ey1, edge.ex2 - edge.ex1,
            edge.ey2 - edge.ey1, 0, 0,
            edge.ex2 - edge.ex1,
            edge.ey2 - edge.ey1
        );
        return ctx;
    }

    function _setEditBehavior() {
        var mouseDown = 0;
        annotate.screenshotArea.addEventListener('mousemove', function(e) {
            var pageX = e.clientX + document.body.scrollLeft,
                pageY = e.clientY + document.body.scrollTop;
            if (!mouseDown) {
                annotate.tooltip.style.left = pageX + 10 + 'px';
                annotate.tooltip.style.top = pageY + 10 + 'px';
                annotate.tooltip.style.display = 'block';
            }
        });
        annotate.screenshotArea.addEventListener('mouseout', function(e) {
            annotate.tooltip.style.display = 'none';
        });
        annotate.screenshotArea.addEventListener('mouseup', function(e) {
            mouseDown = 0;
        });
        mouse.hold(annotate.screenshotArea, 200, function() { mouseDown = 1; });
    }

    function _setSize() {
        canvasWidth = edge.ex2 - edge.ex1;
        canvasHeight = edge.ey2 - edge.ey1;
        annotate.edge.style.height = edge.ey2 - edge.ey1 + 'px';
        annotate.edge.style.overflow = 'hidden';
        annotate.edge.style.width = edge.ex2 - edge.ex1 + 'px';
        annotate.edge.style.position = 'absolute';
        if (firstCanvas) {
            annotate.whole.setAttribute('height', edge.ey2 - edge.ey1);
            var ctx = annotate.whole.getContext('2d');
            ctx.drawImage(firstCanvas, 0, 0);
        }
        annotate.whole.style['margin-left'] = -edge.ex1 + 'px';
        annotate.whole.style['margin-top'] = -edge.ey1 + 'px';
        annotate.whole.style.position = 'absolute';
        annotate.image.style['margin-left'] = -edge.ex1;
        annotate.image.style['margin-top'] = -edge.ey1;
        annotate.border.style['margin-left'] = -edge.ex1;
        annotate.border.style['margin-top'] = -edge.ey1;
        var maxWidth = window.innerWidth;
        var maxHeight = window.innerHeight;
        annotate.header.style.width = maxWidth + 'px';
        var height = canvasHeight;
        if (height > maxHeight) height = maxHeight;
        annotate.container.style.left = (canvasWidth > maxWidth) ? 0 :
            ( (maxWidth / 2) - (canvasWidth / 2) ) + 'px';
        annotate.container.style.width = ((canvasWidth > maxWidth) ? maxWidth :
            canvasWidth) + 'px';
        annotate.container.style.height = height + 'px';
        annotate.container.style['overflow-x'] = canvasWidth + 16 < maxWidth ?
            'hidden' : 'auto';
        annotate.container.style['overflow-y'] = canvasHeight < maxHeight ?
            'hidden' : 'auto';
        annotate.container.style.top = '50%';
        annotate.container.style['margin-top'] =
            (annotate.header.style.height/2) - (height/2) + 'px';
        annotate.scrollBarHeight = canvasWidth < maxWidth ? 0 : 16;
        annotate.scrollBarWidth = canvasHeight < maxHeight    ? 0 : 16;
    }

    annotate.produceFinalImage = function (renderer, url) {
        var done = document.createElement('canvas'),
            pad = config.footer.pad;
        done.style.display = 'none';
        done.className = 'done';
        done.width = edge.ex2 - edge.ex1;
        done.height = edge.ey2 - edge.ey1 +
            (config.qrcode.size + config.footer.pad);
        var creation = new Date(),
            creationTimestamp = creation.getTime(),
            ctx = _getContext(done, edge),
            size = config.qrcode.size;
        qr.renderCodes({
            canvas: done,
            context: ctx,
            url: url,
            pad: pad,
            size: size,
            timestamp: creationTimestamp
        });
        qr.renderFooterText({
            canvas: done,
            context: ctx,
            dateObject: creation,
            pad: pad,
            size: size,
            space: config.footer.space,
            url: url
        });
        for(var i=0 ;i <= annotate.pen.currentIndex; i++) {
            var thisLayer = annotate.pen.layers[i];
            thisLayer.canvasOffset = {
                x: edge.ex1,
                y: edge.ey1
            };
            if (thisLayer.type !== 'delete' && !thisLayer.hide)
                annotate.pen.draw({canvas: done, ctx: ctx, data: thisLayer});
        }
        document.body.appendChild(done);
        var img = document.createElement('img');
        img.setAttribute('src', annotate.thumbnail);
        var    thumbnail = document.createElement('canvas');
        var taskId = Pica.resizeCanvas(img, thumbnail, {
            quality: 1,
            alpha: false,
            unsharpAmount: 0,
            unsharpRadius: 0.5,
            unsharpThreshold: 0
        }, function (err) {
            if (err)
                log.error('Resize error: ' + err)
            else
                renderer(done.toDataURL(), thumbnail);
        });
    };

    annotate.init = function(tab, capture) {
        document.title = 'Annotator [' + config.appName + ']';
        annotate.tab = tab;
        annotate.thumbnail = capture.thumbnail;
        annotate.url = capture.url;
        _assignDOMnodes();
        annotate.canvas = null;
        annotate.graphemeCounter.innerHTML = config.qrcode.maxNotesLength;
        annotate.modalNotes.addEventListener('input', function (e) {
            if (e.which < 0x20) return;
            var count = parseInt(GraphemeBreaker.countBreaks(this.value));
            var max = parseInt(config.qrcode.maxNotesLength);
            if (e.which < 0x20) return;
            if (count === max)    e.preventDefault();
            else if (count > max) {
                annotate.graphemeCounter.innerHTML = 0;
                this.value = this.value.substring(0, max);
            }
            else
                annotate.graphemeCounter.innerHTML = max - count;
        });

        // LABS-622
        // Contains palettes
        var palettes = [annotate.paletteBlack, annotate.paletteYellow, annotate.paletteOrange,
        annotate.paletteRed, annotate.palettePurple, annotate.paletteBlue, annotate.paletteGreen];
        // Black color by default
        annotate.paletteBlack.className += " palette-selected";
        // Assigns 'selected' class name and local storage value in a loop
        for (var i = 0; i < palettes.length; i++) {
            palettes[i].onclick = function () {
                localStorage.setItem('palette-color', this.style.backgroundColor);
                // Assign base/compliment if background color is black
                if (this.style.backgroundColor == 'rgb(0, 0, 0)') {
                    localStorage.setItem('palette-color', config.baseColor);
                }
                clearPaletteSelected();
                this.className += " palette-selected";
            }
        }
        // Clears all class names and sets one
        var clearPaletteSelected = function() {
            for (var i = 0; i < palettes.length; i++) {
                palettes[i].className = 'palette-general';
            }
        }
        // This runs on right click
        window.addEventListener('contextmenu', function(ev) {
            ev.preventDefault();
            _byId('annotate-tooltip').style.display = 'none';
            annotate.palette.style.display = 'block';
            annotate.palette.style.left = ev.pageX + "px";
            annotate.palette.style.top = ev.pageY + "px";
            return false;
        }, false);

        var content = _byId('modal-box');
        var element = _byId('annotate-open-modal')
            .getAttribute('data-target');
        var modal = _byId(element);
        if (!animationDuration)
            var animationDuration = '0.5s';
        if (openAnimation === true)
            var openAnimation = 'open-modal-animation';
        if (openAnimation === false)
            var openAnimation = null;
        else
            var openAnimation = 'open-modal-animation';

        // LABS-622
        annotate.paletteClose.onclick = function() {
            annotate.palette.style.display = 'none';
        }

        annotate.openModal.onclick = function() {
            modal.style.display = 'block';
            content.style.animation = openAnimation;
            content.style.animationDuration = animationDuration;
        }
        annotate.closeModal.onclick = function() {
            var toast = _byId('annotate-toast');
            toast.className = 'show';
            toast.innerHTML = 
                "<span id='annotate-notes-set'>"
                + 'Notes set to: ' + '</br>' + _byId('annotate-modal-notes').value
                + '</span>';
            setTimeout(function() {
                toast.className = toast.className.replace("show", "");
            }, config.toasters.timeout);
            modal.style.display = "none";
        }
        annotate.modalTitle.textContent = 'ADD NOTES';
        window.onclick = function(event) {
            if (event.target === modal) {
                modal.style.display = "none";
            }
        }
        annotate.pen = new Pen(config, log, annotate, edge);
        mouse.listen();
        _setEditBehavior();
        var save = new Save(config, log, fs, annotate);
        save.init();

        // LABS-622
        localStorage.setItem('palette-color', config.baseColor);
        
        if(capture.canvas) {
            annotate.image.onload = function () {
                annotate.whole.width = this.width;
                annotate.whole.height = this.height;
                firstCanvas = this;
                var ctx = annotate.whole.getContext('2d');
                if(window.devicePixelRatio > 1){
                    ctx.scale(1/window.devicePixelRatio,
                        1/window.devicePixelRatio);
                }
                ctx.drawImage(this, 0, 0);
                edge.ex1 = 0;
                edge.ex2 = annotate.whole.width;
                edge.ey1 = 0;
                edge.ey2 = annotate.whole.height;
                _setSize();
            };
            try {
                annotate.image.src = capture.dataURL;
            }
            catch(e) {
                log.error('Load error: ' + e);
                return;
            }
            capture.canvas.width = capture.canvas.height = 1;
            capture.canvas = null;
            delete capture.canvas;
        }
        annotate.waitForEvents();
    };
 
    annotate.displayModal =    function () {
        var evt1 = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
        });
        var a1 = document.createElement('a');
        document.body.appendChild(a1);
        var canceled = !a1.dispatchEvent(evt1);
        if (canceled) {
            log.info('Event dispatch canceled.');
        }
        else {
            annotate.openModal.dispatchEvent(evt1);
        }
    }

    annotate.manage = function (i) {
        log.debug('Manage tab ' + annotate.tab.id);
        chrome.runtime.getBackgroundPage(function (b) {
            if (b.page2image) {
                clearInterval(i);
                var annotate = b.annotators[b.page2image];
                b.page2image = false;
                annotate.page2image();
            }
            if (b.displayModal) {
                var annotate = b.annotators[b.displayModal];
                b.displayModal = false;
                annotate.displayModal();
            }
        });
    };

    annotate.page2image = function () {
        var save = new Save(config, log, fs, annotate);
        save.init();
        save.exec();
    };
 
    annotate.waitForEvents = function () {
        var intervalId = setInterval(function () {
            annotate.manage(intervalId);
            }, config.timers.saveImagesTimeout
        );
        setTimeout(function () {
            log.debug('Force interval timeout on save image.');
            clearInterval(intervalId);
            annotate.waitForEvents();
        }, config.timers.forceAnnotateTimeout);
        return;
    };

    return annotate;

};
