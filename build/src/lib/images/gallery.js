var Figure = require('./figure.js');

module.exports = function (background, images) {

    var blockchain = background.blockchain,
        _byId = document.getElementById.bind(document),
        config = background.config,
        fs = background.fs,
        msg = images.message,
        gallery = this,
        log = background.log,
        subfoldersSeen = {};

    gallery.images = images;
    gallery.figure = new Figure(background, gallery);

    function _addCaption(f, pswp) {
        var caption = document.createElement('figcaption'),
            payInfo = '',
            payStatus = pswp.blockchain.status || config.blockchain.statuses.UNSENT,
            pre = '<span><strong style="font-size:120%;">';
        caption.setAttribute('itemprop', 'caption description');
        caption.id = 'caption-' + pswp.id;
        if (pswp.blockchain.status === config.blockchain.statuses.PENDING) {
            payInfo = gallery.marshalPaymentMessage(pswp.blockchain.price, 
                pswp.blockchain.address);
                payStatus = pswp.blockchain.status;
        }
        else if (
            (pswp.blockchain.status === config.blockchain.statuses.CONFIRMED)
                ||
            (pswp.blockchain.status === config.blockchain.statuses.UNCONFIRMED)
        ) {
          payStatus = '<a target="_blank" href="' +
              config.blockchain.explorerURL + pswp.blockchain.tx + '">' +
              pswp.blockchain.status + '</a>';
        }
        var time = _placeOrdinal((new Date(pswp.timestamp)
            .toString()).replace(config.regex.imageDate,
                "$1 $2 " + "$3" + " $4"));
        caption.innerHTML = '<h2 style="margin:2px;">' + time + '</h2>' +
            pre + 'DIMENSIONS</strong>: ' + pswp.w + 'x' + pswp.h +
                '</span><br>' +
            pre + 'HASH</strong>: ' + (pswp.hash).substring(2) + '</span><br>' +
            pre + 'SIZE</strong>: ' + pswp.size + '</span><br>' +
            pre + 'URL</strong>: <a href="' + pswp.url + '">' + pswp.url +
                '</a><br>' +
            pre + 'NOTES</strong>: ' + pswp.notes + '</span><br>' +
            '<span><strong style="font-size:120%;">' +
            'BLOCKCHAIN</strong>: <span ' +
            'class="blockchain-status-' + pswp.id + '">' +
            payStatus + '</span>' +
            '<span class="blockchain-detail blockchain-detail-' + pswp.id +
                '">  ' + payInfo + '</span></span><br>';
        f.appendChild(caption);
    }

    function _insertAfter(newNode, referenceNode) {
        referenceNode.parentNode.insertBefore(newNode,
            referenceNode.nextSibling);
    }

    // http://stackoverflow.com/a/13627586
    function _ordinalSuffix(i) {
        var j = i % 10,
            k = i % 100;
        if (j === 1 && k !== 11) {
            return i + "st";
        }
        if (j === 2 && k !== 12) {
            return i + "nd";
        }
        if (j === 3 && k !== 13) {
            return i + "rd";
        }
        return i + "th";
    }

    function _placeFigure(f, pswp) {

        subfoldersSeen[f.getAttribute('data-subfolder')] = 1;
        var allFigures = document.querySelectorAll('figure'),
            cache = {};
        cache[pswp.pid] = pswp

        chrome.storage.local.set(cache, function () {
            if (chrome.runtime.lastError) {
                log.error('Error: ' + chrome.runtime.lastError.message);
            }
            else {
                log.debug('PhotoSwipe object saved.');
            }
        });

        if (!allFigures[0]) {
            images.showroom.appendChild(f);
            images.items.push(pswp);
        }
        else if (_byId(pswp.id)) {
            msg.innerHTML = pswp.id + ' already in DOM.';
            gallery.figure.update(f.id, pswp);
        }
        else {
            var figures = Array.prototype.slice.call(allFigures);
            figures.push(f);
            figures.sort(function(a, b) { 
                return parseInt(b.getAttribute('data-timestamp')) -
                    parseInt(a.getAttribute('data-timestamp'));
            });
            var position = figures.indexOf(f);
            if (position >= allFigures.length) {
                images.showroom.appendChild(f);
                images.items.push(pswp);
            }
            else {
                allFigures.forEach(
                    function(element, index) {
                        if (parseInt(index) === parseInt(position)) {
                            images.showroom.insertBefore(f, element);
                            images.items.splice(position, 0, pswp);
                        }
                    }
                );
            }
        }
        images.numPositioned++;
        msg.innerHTML = 'Placed ' + images.numPositioned + ' of ' +
            (images.total) + ' images.';

        // All nodes inserted.
        if (
            ((images.numPositioned === images.total) &&
                (Object.keys(subfoldersSeen).length  === fs.numSubfolders)) ||
            ((images.total === 1) || (!images.total))
        ) {
            var allFigures = document.querySelectorAll('figure'),
                lastSubfolder;
            allFigures.forEach(function(element, index) {
                var subfolder = element.getAttribute('data-subfolder');
                if (subfolder !== lastSubfolder) {
                    if (!_byId(subfolder)) {
                        var header = document.createElement('h1');
                        header.innerHTML = subfolder;
                        header.id = subfolder;
                        header.style.clear = 'both';
                        lastSubfolder = subfolder;
                        images.showroom.insertBefore(header, element);
                        if (header.previousSibling.tagName === 'H1') {
                            var label = header.previousSibling;
                            label.parentNode.removeChild(label);
                            _insertAfter(label, element);
                        }
                    }
                }
            });
            images.overlay.style.display = 'none';
        }
    }

    function _placeOrdinal(time) {
        var timeSplit = time.split(' ');
        timeSplit[2] = _ordinalSuffix(parseInt(timeSplit[2], 10));
        return timeSplit.join(' ');
    }

    gallery.add = function(pswp, cb) {
        var subfolderLabel = pswp.src.replace(config.regex.gallery, "$1");
        var f = gallery.figure.create(subfolderLabel, pswp);
        var link = gallery.figure.addLink(pswp);
        var img = gallery.figure.addImage(pswp);
        link.appendChild(img);
        f.appendChild(link);
        _addCaption(f, pswp);
        msg.innerHTML = 'Add figure ' + pswp.id + ' from subfolder: ' +
            subfolderLabel;
        _placeFigure(f, pswp);
    };
  
    gallery.marshalPaymentMessage = function(amount, address) {
        var segments = config.blockchain.paymentWords;
        if (amount > 0 && address)
          return ' &#8594; ' + segments[0] + amount/100000 + segments[1] +
              address;
        return '';
    };

    return gallery;
};
