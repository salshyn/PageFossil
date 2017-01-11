module.exports = function (config, log, annotate, edge) {

    var currentCanvas,
        currentContext,
        currentLayer = {},
        czindex = 5,
        drawing,
        maxIndex = -1,
        pen = this;

    pen.currentIndex = -1;
    pen.history = {}
    pen.numDrawings = 0,
    pen.status = 'ready';
    pen.layers=[];

    function _adjustSize(d,x1,y1,x2,y2) {
        if (x1 < x2) {ex1 = x1; ex2 = x2;} else {ex1 = x2; ex2 = x1;}
        if (y1 < y2) {ey1 = y1; ey2 = y2;} else {ey1 = y2; ey2 = y1;}
        currentLayer.canvasOffset = {
            x: ex1 -7,
            y: ey1 -7
        };
        d.style.left = (ex1 - 7) + 'px';
        d.style.top = (ey1 - 7) + 'px';
        d.width = (ex2 - ex1 + 25);
        d.height = (ey2 - ey1 + 25);

        pen.history[d.id].img.style.left = d.style.left;
        pen.history[d.id].img.style.top = d.style.top;
        pen.history[d.id].img.style.width = d.width;
        pen.history[d.id].img.style.height = d.height;
        return({x: ex1, y:ey1});
    }

    function _createHighlight(coords) {
        var newHighlightId = pen.numDrawings++;
        pen.history[newHighlightId] = {};

        drawing = document.createElement('canvas');
        drawing.setAttribute('id', newHighlightId);
        drawing.classList.add('tool');
        drawing.style.position = 'relative';
        annotate.edge.appendChild(drawing);

        var newImg = document.createElement('img');
        newImg.setAttribute('id', 'img_' + newHighlightId);
        annotate.edge.appendChild(newImg);

        pen.history[newHighlightId].img = newImg;
        pen.history[newHighlightId].xH = document.createElement('div');
        pen.history[newHighlightId].xH.setAttribute('id', 'x_' +
            newHighlightId);
        currentContext = drawing.getContext('2d');
        drawing.width = annotate.whole.style.width + 'px';
        drawing.height = annotate.whole.style.height + 'px';
        pen.history[newHighlightId].layer = currentLayer;
        currentLayer.canvas = drawing;
        currentLayer.currentContext = currentContext;

        drawing.style['margin-left'] = -edge.ex1 + 'px';
        drawing.style['margin-top'] = -edge.ey1 + 'px';
        drawing.style.position = 'absolute';
        drawing.style['z-index'] = czindex++;
        drawing.style.left = coords.x + 'px';
        drawing.style.top = coords.y + 'px';
        newImg.style['margin-left'] = -edge.ex1 + 'px';
        newImg.style['margin-top'] = -edge.ey1 + 'px';
        newImg.style.position = 'absolute';
        newImg.style['z-index'] = czindex++;
        newImg.style.left = coords.x + 'px';
        newImg.style.top = coords.y + 'px';

        annotate.container.addEventListener('mousemove', (function(drawing) {
            annotate.palette.className = 'hide';
            return function(e) { _dragAndDrop(e, drawing); };
        }) (drawing), false);

    }

    function _dragAndDrop(e, d) {

        var _fadeOut = function (elem, ms) {
                if(!elem) return;

                var id = elem.getAttribute('id');

                var opacity = 1;
                var intervalId = setInterval( function() {
                    opacity -= 50 / ms;
                    if( opacity <= 0 ) {
                        clearInterval(intervalId);
                        opacity = 0;
                        elem.style.display = 'none';
                        elem.style.visibility = 'hidden';
                        pen.layers[id].points = [];
                        elem.parentNode.removeChild(elem);
                        var img = document.getElementById('img_' + id);
                        var xHandle = document.getElementById('x_' + id);
                        img.parentNode.removeChild(img);
                        xHandle.parentNode.removeChild(xHandle);
                    }
                    elem.style.opacity = opacity;
                    elem.style.filter = 'opacity(' + opacity * 100 + '%)';
                }, 50 );
            },
            _addXHandle = function (d, edge) {
                var textNode = document.createTextNode('\u2716'),
                    xH = pen.history[id].xH;
                xH.className = 'xHandle';
                xH.style.left = (d.offsetLeft + d.offsetWidth - edge.ex1) +
                    'px';
                xH.style.top    = (d.offsetTop - edge.ey1) + 'px';
                xH.style['z-index'] = 900;
                xH.appendChild(textNode);
                xH.addEventListener('click',function (e) {
                    e.stopImmediatePropagation();
                    _fadeOut(d, 400);
                })
                xH.addEventListener('mousedown', function (e) {
                    e.stopImmediatePropagation();
                    _newLayer();
                    currentLayer.item = d;
                    pen.history[id].deleted = true;
                    pen.history[id].layer.hide = true;
                });
                var closeRect = xH.getBoundingClientRect();
                if (closeRect.left > edge.ex2 - edge.ex1) {
                    xH.style.left = (edge.ex2 - edge.ex1 - 30) + 'px';
                }
                if (closeRect.top < 0) {
                    xH.style.top = 0 + 'px';
                }
                return xH;
            };

        if(pen.status !== 'ready') return;

        d.style.border = '2px dahed gray';
        var id = d.getAttribute('id'),
            ctx = d.getContext('2d'),
            x = e.offsetX + e.target.offsetLeft - d.offsetLeft + edge.ex1,
            y = e.offsetY + e.target.offsetTop - d.offsetTop + edge.ey1,
            display = window.getComputedStyle(d, null)
                .getPropertyValue('display'),
            shouldDraw = false;

        if (x > 0 && y > 0 && x < d.width && y < d.height && display !== 'none') {
            var mark = ctx.getImageData(x, y, 1, 1).data;
            shouldDraw = 0;
            for(var i = 0;i < 4; i++) {
                if (mark[i] != 0) {
                    shouldDraw=true;
                }
            }
        }
        if (!shouldDraw) return;
        pen.history[id].layer = {};
        if (!pen.history[id].xHandle) {
            pen.history[id].xHandle = _addXHandle(d, edge);
            annotate.container.appendChild(pen.history[id].xHandle);
        }
    }

    function _getMinMax(points) {
        x1 = y1 = 65535;
        x2 = y2 =0;
        Array.prototype.forEach.call(points, function(b, a) {
            if (b.x < x1) x1 = b.x;
            if (b.x > x2) x2 = b.x;
            if (b.y < y1) y1 = b.y;
            if (b.y > y2) y2 = b.y;
        });
        return ({x1:x1, x2:x2, y1:y1, y2:y2});
    }

    function _newLayer() {
        pen.currentIndex++;
        maxIndex++;
        if (pen.layers.length > pen.currentIndex) {
            pen.layers.slice(pen.currentIndex);
            maxIndex = pen.currentIndex;
        }
        var newObject = JSON.parse(JSON.stringify(edge))
        newObject.canvas = currentCanvas;
        newObject.currentContext = currentContext;
        pen.layers[pen.currentIndex] = newObject;
        currentLayer = Object.assign(newObject, currentLayer);
        currentLayer.active = true;
        currentLayer.color = localStorage.getItem('palette-color');
        currentLayer.lineWidth = 2;
        return(newObject);
    }

    function _updateImgFromCanvas() {
        var i = pen.history[currentLayer.canvas.id].img;
        i.style['margin-top'] = currentLayer.canvas.style['margin-top'] + 'px';
        i.style['margin-left'] = currentLayer.canvas.style['margin-left'] +
            'px';
        i.style.position = 'absolute';
        i.style.left = currentLayer.canvas.style.left;
        i.style.top = currentLayer.canvas.style.top;
        i.style.width = currentLayer.canvas.width + 'px';
        i.style.height = currentLayer.canvas.height + 'px';
        i.setAttribute('src', currentLayer.canvas.toDataURL());
    }

    pen.begin = function (coords) {
        pen.status = 'started';
        _newLayer();
        _createHighlight(coords);
        currentLayer.points = [];
        pen.move(coords);
    };

    pen.draw = function(o) {
        o.ctx.shadowBlur = 5;
        o.ctx.shadowOffsetX = 5;
        o.ctx.shadowOffsetY = 5;
        o.ctx.globalAlpha = 0.45
        o.ctx.lineWidth = 20;
        o.ctx.beginPath();
        o.ctx.strokeStyle = o.data.color;
        o.ctx.fillStyle = o.data.color;
        for(var i=1; i < o.data.points.length; i++) {
            o.ctx.lineTo(o.data.points[i].x - o.data.canvasOffset.x,
                o.data.points[i].y -o.data.canvasOffset.y);
        }
        o.ctx.stroke();
        o.ctx.closePath();
        o.ctx.shadowOffsetX = 0;
        o.ctx.shadowOffsetY = 0;
        o.ctx.shadowBlur = 0;
        _updateImgFromCanvas();
    };

    pen.move = function(e) {
        currentLayer.points.push({x: e.x, y: e.y});
        var coords = _getMinMax(currentLayer.points);
        _adjustSize(currentLayer.canvas, coords.x1, coords.y1, coords.x2,
            coords.y2);
        pen.draw({ctx:currentContext, data:currentLayer});
    };

    pen.stop = function() {
        if (pen.status === 'started') {
            pen.up();
            pen.finish();
        }
    };

    pen.up = function () { pen.status = 'ready'; };

    return pen;
};
