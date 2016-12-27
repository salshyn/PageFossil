var Base64 = require('base64-js'),
    QRious = require('qrious');

module.exports = function (config, log, annotate) {
    var qr = this;

    function _fragmentText(ctx, text, maxWidth) {
        var words = text.split(' '),
            lines = [],
            line = '';
        if (ctx.measureText(text).width < maxWidth)
            return [text];
        while (words.length > 0) {
            while (ctx.measureText(words[0]).width >= maxWidth) {
                var tmp = words[0];
                words[0] = tmp.slice(0, -1);
                if (words.length > 1)
                    words[1] = tmp.slice(-1) + words[1];
                else
                    words.push(tmp.slice(-1));
            }
            if (ctx.measureText(line + words[0]).width < maxWidth)
                line += words.shift() + " ";
            else {
                lines.push(line);
                line = "";
            }
            if (words.length === 0)
                lines.push(line);
        }
        return lines;
    }

    qr.renderFooterText = function(c) {
        var canvas = c.canvas,
            ctx = c.context,
            pad = c.pad,
            size = c.size,
            space = c.space,
            textStartX = (size*3) + (space*3) + pad,
            textStartY = canvas.height - size + (pad / 2);
        ctx.font = '8pt Monospace';
        var lines = _fragmentText(ctx, annotate.modalNotes.value, canvas.width -
            ((pad*2) + (size*3) + (space*2)));
        ctx.fillStyle = '#111';
        ctx.fillText('Location ' + c.url, textStartX, textStartY);
        ctx.fillText('Created    ' + c.dateObject.toUTCString(), textStartX,
            textStartY + 15);
        ctx.fillText('Size         ' + 'width:' + canvas.width +
            ' height: ' + canvas.height, textStartX, textStartY + 30);
        ctx.fillText('Notes', textStartX, textStartY + 45);
        var start = 60;
        for (var i = 0; i <= lines.length - 1; i++) {
            ctx.fillText(lines[i], textStartX, textStartY + start);
            start = start + 15;
        }
    };

    qr.renderCodes = function(c) {
        var canvas = c.canvas,
            ctx = c.context,
            encoder = new TextEncoder(),
            image1 = new Image(),
            image2 = new Image(),
            image3 = new Image(),
            loc = c.url.substring(0, config.qrcode.maxURLlength),
            notes = annotate.modalNotes.value,
            pad = c.pad,
            size = c.size,
            stats = c.timestamp.toString() + 'w' + canvas.width + 'h' +
                canvas.height;
        var qr1 = new QRious({value: loc}),
            qr2 = new QRious({value: stats}),
            qr3 = new QRious({
                value: Base64.fromByteArray(encoder.encode(notes))}),
            qr1Canvas = qr1.canvas,
            qr2Canvas = qr2.canvas,
            qr3Canvas = qr3.canvas;
        qr1.size = qr2.size = qr3.size = size;
        image1.src = qr1Canvas.toDataURL();
        image2.src = qr2Canvas.toDataURL();
        image3.src = qr3Canvas.toDataURL();
        ctx.drawImage(image1, 0, 0, size, size, pad,
            canvas.height - size - pad/2, size, size);
        ctx.drawImage(image2, 0, 0, size, size,
            pad + size + config.footer.space,
            canvas.height - size - pad/2, size, size);
        ctx.drawImage(image3, 0, 0, size, size, pad +
            (size*2) + (config.footer.space*2),
            canvas.height - size - pad/2, size, size);
    };

    return qr;
};
