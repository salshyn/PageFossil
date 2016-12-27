var Base64 = require('base64-js'),
    PhotoSwipe = require('photoswipe'),
    PSUI_Default = require('photoswipe/dist/photoswipe-ui-default'),
    SHA256 = require ('../util/sha256.js');

module.exports = function (background, gallery) {
    var blockchain = background.blockchain,
        _byId = document.getElementById.bind(document),
        config = background.config,
        decoder = new TextDecoder(),
        figure = this,
        foot = config.footer.pad,
        fs = background.fs,
        log = background.log,
        msg = gallery.images.message,
        qsz = config.qrcode.size,
        pad = config.qrcode.pad,
        sha256 = new SHA256(),
        space = config.footer.space;

    function _addHash(e, png, arrayBuffer) {
        try {
            var byteArray = new Uint8Array(arrayBuffer),
                iPrefix = config.iPrefix,
                sha256sum = sha256.hash(byteArray);
            msg.innerHTML = 'Image hash: ' + iPrefix + sha256sum;
            png.hash = iPrefix + sha256sum;
        }
        catch (err) {
            log.error('Could not derive image hash: ' + err);
        }
        var regex = config.regex,
            thumb = png.src.replace(regex.i2t1, regex.i2t2);
        png.thumb = thumb.replace(regex.i2t3, regex.i2t4);
        gallery.add(_png2Pswp(png));
    };

    function _checkExpired(pswp) {
        if (pswp.blockchain.status === config.blockchain.statuses.PENDING) {
            var now = (new Date()).getTime(),
                created = pswp.timestamp,
                age = now - created;
            if (age >= config.timers.forcePendingRegTimeout) {
                 pswp.blockchain.status = config.blockchain.statuses.EXPIRED
            }
        }
        return pswp;
    }

    function _clickFigure(e) {
        e = e || window.event;
        e.preventDefault ? e.preventDefault() : e.returnValue = false;
        figure.thumbnail = _handleFigureClick(e);
        if (figure.thumbnail) {
            var clickedFigure = (figure.thumbnail.parentNode).parentNode,
                childNodes = clickedFigure.parentNode.childNodes,
                index,
                numChildNodes = childNodes.length,
                nodeIndex = 0;
            for (var i = 0; i < numChildNodes; i++) {
                if(childNodes[i].nodeType !== document.ELEMENT_NODE) {
                    continue; 
                }
                if(childNodes[i] === clickedFigure) {
                    index = nodeIndex;
                    break;
                }
                nodeIndex++;
            }
            if(index >= 0) {
                _openPhotoSwipe(clickedFigure.id);
            }
        }
        return false;
    }

    function _handleFigureClick(e) {
        var clicked = e.target,
          figure = e.currentTarget;
        if (clicked.tagName === 'A') {
            chrome.tabs.create(
                {url: clicked.getAttribute('href'),
                 active: true},
                function (tab) {
                    if (chrome.runtime.lastError) {
                        log.error('Error visiting link: ' +
                            chrome.runtime.lastError.message);
                    }
                    else {
                        log.debug('Open link in tab id ' + tab.id + '.');
                    }
                }
            );
            return false; 
        }
        else if (clicked.className.match(/blockchain-detail/)) {
            window.prompt("Copy Bitcoin address to clipboard: Ctrl+C, Enter",
                ((clicked.innerHTML).split('address '))[1]);
        }
        else {
            return (figure.childNodes[0]).childNodes[0];
        }
    }

    function _getPhotoSwipeOptions(figureId, shareButtons) {
        return {
            addCaptionHTMLFn: function(pswp, captionEl, isFake) {
                if(!pswp.title) {
                    captionEl.children[0].innerHTML = '';
                    return false;
                }
                var payInfo = '',
                    payStatus = pswp.blockchain.status || config.blockchain.statuses.UNSENT;
                if (pswp.blockchain.status === config.blockchain.statuses.PENDING) {
                    payInfo = gallery.marshalPaymentMessage(
                        pswp.blockchain.price, pswp.blockchain.address);
                    payStatus = pswp.blockchain.status;
                }
                else if (pswp.blockchain && pswp.blockchain.tx) {
                    payStatus = '<a target="_blank" href="' + config.blockchain.explorerURL +
                        pswp.blockchain.tx + '">' + pswp.blockchain.status +
                        '</a>';
                }
                pswp.blockchain.status = _byId(figureId)
                    .getAttribute('data-blockchain-status') ||
                         pswp.blockchain.status;
                pswp.blockchain.price = _byId(figureId)
                    .getAttribute('data-blockchain-price') ||
                         pswp.blockchain.price;
                pswp.blockchain.address = _byId(figureId)
                    .getAttribute('data-blockchain-address') ||
                         pswp.blockchain.address;
                captionEl.children[0].innerHTML = '<strong>TIME</strong>: ' +
                    pswp.title + '<br><strong>URL</strong>: ' +
                    '<a target="_blank" ' + 'style="color:' + 
                    config.complimentColor + ';text-decoration:none;" href="' +
                    pswp.url + '">' + pswp.url + '</a><br><span><strong>' +
                    'HASH</strong>: ' + (pswp.hash).substring(2) +
                    '</span><br><span><strong>NOTES</strong>: ' + pswp.notes +
                    '</span></span><br><span><strong>BLOCKCHAIN</strong>: ' +
                    '<span ' + payInfo + ' class="blockchain-status-' +
                    pswp.id + '">' + payStatus + '</span>' + 
                    '<span class="blockchain-detail blockchain-detail-' + pswp.id + '">  ' +
                        payInfo + '</span></span>';
                return true;
            },
            clickToCloseNonZoomable: false, closeEl:true, closeElClasses: [],
            closeOnScroll: false, closeOnVerticalDrag: false, escKey: true,
            galleryPIDs: true,
            getNumItemsFn: function () {return gallery.images.items.length;},
            getThumbBoundsFn: function(figureId) {
                var pageYScroll = window.pageYOffset ||
                        document.documentElement.scrollTop,
                    rect = figure.thumbnail.getBoundingClientRect();
                return {x:rect.left, y:rect.top + pageYScroll, w:rect.width};
            },
            index: 0,
            mouseUsed: true,
            parseShareButtonOut: function(shareButtonData, shareButtonOut) {
                if (shareButtonOut.match(/Queue/gi)) {
                    shareButtonOut = shareButtonOut
                        .replace('href="javascript: void(0)" target="_blank" ',
                            'id="queue-for-blockchain"');
                    return shareButtonOut;
                }
                else {
                    return shareButtonOut;
                }
            },
            pinchToClose: false,
            shareButtons: shareButtons,
            tapToToggleControls: false
        };
    }

    function _scanNotesQRCode(e, png) {
        if (e.data.length > 0) {
            png.notes = decoder.decode(
                Base64.toByteArray(e.data[0][2]));
            msg.innerHTML = png.notes;
        }
        else {
            log.error('Could not find notes in QR code.');
        }
        var sha = new XMLHttpRequest();
        sha.open("GET", png.src, true);
        sha.responseType = 'arraybuffer';
        sha.onload = function (e) {
            var DONE = this.DONE || config.DONE;
            if (this.readyState === DONE) {
                _addHash(e, png, sha.response);
            }
        };
        sha.send(null); 
    }

    var _openPhotoSwipe = function(figureId) {
        var blockchainStatus = _byId(figureId)
            .getAttribute('data-blockchain-status'),
            hash = _byId(figureId)
                .getAttribute('data-hash');

        shareButtons = [
				{id:'download', label:'Download image', url:'{{raw_image_url}}',
                    download:true}
            ],
            thumbnail = _byId('image-' + figureId);
        if (
            (config.blockchain.usage === 'optional')
                &&
            (blockchainStatus === config.blockchain.statuses.UNSENT)
        ) {
            shareButtons.push({
                id:'blockchain',
                label:'Queue for blockchain',
                url: 'javascript: void(0)'
            });
        }
        var options = _getPhotoSwipeOptions(figureId, shareButtons);
        for(var j = 0; j < gallery.images.items.length; j++) {
            if(gallery.images.items[j].pid === ('image-' + figureId) ) {
                options.index = j;
                break;
            }
        }
        var g = new PhotoSwipe(gallery.images.detail, PSUI_Default,
            gallery.images.items, options);
        g.listen('shareLinkClick', function (e, target) {
            if (target.id === 'queue-for-blockchain') {
                var modal = (document.getElementsByClassName(
                    'pswp__share-modal'
                )[0]);
                if (_byId(figureId).getAttribute('data-blockchain-status') === config.blockchain.statuses.PENDING) {
                    alert('This image is already queued for registration');
                }
                else {
                    blockchain.register(figureId, hash);
                }
            }
        });
        g.init();
    };

    function _png2Pswp(png) {
        return {
            blockchain: {
                created: (new Date()).getTime(),
                address: '',
                price: 0,
                status: config.blockchain.statuses.UNSENT,
                tx: '',
                updated: (new Date()).getTime()
            },
            h: png.height,
            hash: png.hash,
            id: png.id,
            notes: png.notes,
            pid: 'image-' + png.id,
            size: png.size,
            src: png.src,
            timestamp: png.timestamp,
            title: ((new Date(png.timestamp)).toString())
                .replace(config.regex.imageTitle,''),
            thumb: png.thumb,
            url: png.url,
            w: png.width
        };
    };

    function _scanStatsQRCode(e, png, qrCtx) {
        if (e.data.length > 0) {
            var result = e.data[0][2];
            var info = result.split('w');
            png.timestamp = parseInt(info[0]);
            var s = info[1].split('h');
            png.w = parseInt(s[0]);
            png.h = parseInt(s[1]);
            msg.innerHTML = ((new Date(png.timestamp)).toString()) +
              ' Width: ' + png.w + ' Height: ' + png.h;
        }
        else {
            log.error('Could not find stats in QR code.');
        }
        var qrNext = new Worker(config.workerScripts.qrscan);
        qrNext.onmessage = function (e) { _scanNotesQRCode(e, png) };
        qrCtx.drawImage(png, foot + (qsz*2) + (space*2), 
            png.height - qsz - foot/2, qsz, qsz, pad, pad,
            qsz, qsz);
        var imgData3 = qrCtx.getImageData(pad, pad, qsz, qsz);
        qrNext.postMessage(imgData3);
    }

    figure.addImage = function (pswp) {
        var img = document.createElement('img');
        img.setAttribute('src', pswp.thumb);
        img.setAttribute('itemprop', 'thumbnail');
        img.setAttribute('alt', pswp.notes);
        img.id = 'image-' + pswp.id;
        return img;
    };

    figure.addLink = function (pswp) {
        var a = document.createElement('a');
        a.setAttribute('href', pswp.src);
        a.setAttribute('itemprop', 'contentUrl');
        a.setAttribute('data-size', pswp.h + 'x' + pswp.w);
        return a;
    };

    figure.create = function (subfolderLabel, pswp) {
        var figure = document.createElement('figure');
        figure.setAttribute('itemprop', 'associatedMedia');
        figure.setAttribute('itemscope', '');
        figure.setAttribute('itemtype', 'http://schema.org/ImageObject');
        pswp = _checkExpired(pswp);
        figure.setAttribute('id', pswp.id);
        var attrs = Object.keys(pswp.blockchain);
        for (var i=0; i <= attrs.length - 1; i++) {
            figure.setAttribute('data-blockchain-' + attrs[i],
                pswp.blockchain[attrs[i]]);
        }
        figure.setAttribute('data-timestamp', pswp.timestamp);
        figure.setAttribute('data-hash', (pswp.hash).substring(2));
        figure.setAttribute('data-subfolder', subfolderLabel);
        figure.onclick = _clickFigure;
        return figure;
    };

    figure.scanInit = function (e, png, qrCtx) {
        if (e.data.length > 0) {
            var result = e.data[0][2];
            png.url = result;
            msg.innerHTML = png.url;
        }
        else {
            log.error('Could not find URL in QR code.');
        }
        var qrNext = new Worker(config.workerScripts.qrscan);
        qrNext.onmessage = function (e) { _scanStatsQRCode(e, png, qrCtx) };
        qrCtx.drawImage(png, foot + qsz + space,
            png.height - qsz - foot/2, qsz, qsz, pad, pad, qsz,
            qsz);
        var imgData2 = qrCtx.getImageData(pad, pad, qsz, qsz);
        qrNext.postMessage(imgData2);
    };

    figure.update = function(figureId, pswp) {
        var f = document.getElementById(figureId);
        var attrs = Object.keys(pswp.blockchain);
        for (var i=0; i <= attrs.length - 1; i++) {
            f.setAttribute('data-blockchain-' + attrs[i],
                pswp.blockchain[attrs[i]]);
        }
        pswp = _checkExpired(pswp);

        var statusUpdaters = document.getElementsByClassName(
            'blockchain-status-' + pswp.id);
        for(var i=0; i <= statusUpdaters.length - 1; i++) {
            if (
                (pswp.blockchain.status === config.blockchain.statuses.CONFIRMED)
                   ||
                (pswp.blockchain.status === config.blockchain.statuses.UNCONFIRMED)
            ) {
                statusUpdaters[i].innerHTML = '<a target="_blank" href="' +
                    config.blockchain.explorerURL + pswp.blockchain.tx +
                    '" >' + pswp.blockchain.status + '</a>';
            }
            else {
                statusUpdaters[i].innerHTML = pswp.blockchain.status;
            }
        } 
        if (pswp.blockchain.status === config.blockchain.statuses.PENDING) {
            var detailUpdaters = document.getElementsByClassName(
                'blockchain-detail-' + pswp.id);
            for(var i=0; i <= detailUpdaters.length - 1; i++) {
                detailUpdaters[i].innerHTML = gallery.marshalPaymentMessage(
                    pswp.blockchain.price, pswp.blockchain.address);
            }
        }
        else {
            var detailUpdaters = document.getElementsByClassName(
                'blockchain-detail-' + pswp.id);
            for(var i=0; i <= detailUpdaters.length - 1; i++) {
                detailUpdaters[i].innerHTML = '';
            }
        }
    };

    return figure;
};
