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
        qsz = config.qrcode.size,
        pad = config.qrcode.pad,
        sha256 = new SHA256(),
        space = config.footer.space;

    function _addHash(e, png, arrayBuffer) {
        try {
            var byteArray = new Uint8Array(arrayBuffer),
                iPrefix = config.iPrefix,
                sha256sum = sha256.hash(byteArray);
            log.debug('Image hash: ' + iPrefix + sha256sum);
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

    function _clickFigure(e) {
        e = e || window.event;
        e.preventDefault ? e.preventDefault() : e.returnValue = false;
        var clicked = e.target;
        figure.thumbnail = _handleFigureClick(clicked, e);
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
        else {
            log.error('No thumbnail click detected.');
        }
        return false;
    }

    function _handleFigureClick(clicked, e) {
        if (clicked.tagName === 'IMG') {
            return clicked;
        }
        else if (clicked.tagName === 'FIGURE') {
            return (clicked.childNodes[0]).childNodes[0];
        }
        else if (clicked.tagName === 'FIGCAPTION') {
            return (clicked.previousSibling).childNodes[0];
        }
        else if (clicked.tagName === 'H2' ||
                         clicked.tagName === 'SPAN') {
            return (clicked.parentNode.previousSibling).childNodes[0];
        }
        else if (clicked.tagName === 'STRONG') {
            return (clicked.parentNode.parentNode.previousSibling)
              .childNodes[0];
        }
        else if (clicked.tagName === 'A') {
            chrome.tabs.create(
                {
                    url: clicked.getAttribute('href'),
                    active: true
                },
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
        else {
            log.error('Error: Unexpected click on ' + clicked.tagName);
        }
    }

    function _getPhotoSwipeOptions(figureId, shareButtons) {
        return {
            addCaptionHTMLFn: function(pswp, captionEl, isFake) {
                if(!pswp.title) {
                    captionEl.children[0].innerHTML = '';
                    return false;
                }
                var payInfo;
                if (pswp.blockchain && pswp.blockchain.address) {
                    payInfo = 'title="Please pay ' + 
                        pswp.blockchain.price/100000 +
                        'mBTC to Bitcoin address ' + 
                        pswp.blockchain.address + '."';
                }
                pswp.blockchain.status = _byId(figureId)
                    .getAttribute('data-blockchain-status') ||
                         pswp.blockchain.status;
                captionEl.children[0].innerHTML = '<strong>TIME</strong>: ' +
                    pswp.title + '<br><strong>URL</strong>: ' +
                    '<a target="_blank" ' + 'style="color:' + 
                    config.complimentColor + ';text-decoration:none;" href="' +
                    pswp.url + '">' + pswp.url + '</a><br><span><strong>' +
                    'HASH</strong>: ' + (pswp.hash).substring(2) +
                    '</span><br><span><strong>NOTES</strong>: ' + pswp.notes +
                    '</span></span><br><span><strong>BLOCKCHAIN Tx</strong>: ' +
                    '<span ' + payInfo + ' class="blockchain-status-' +
                    pswp.id + '">' + pswp.blockchain.status + '</span></span>';
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
            (blockchainStatus !== config.blockchain.statuses.PENDING)
                &&
            (blockchainStatus !== config.blockchain.statuses.CONFIRMED)
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
        g.listen('shareLinkClick', (function (details) {
            return function (e, target) {
                if (target.id === 'queue-for-blockchain') {
                    blockchain.register(figureId, hash); // ##>
                }
            };
        })(gallery.images.detail));
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
        var x = document.getElementById(figureId);
        x.setAttribute('data-blockchain-status', pswp.blockchain.status);
        var blockchainStatusUpdaters = document.getElementsByClassName(
            'blockchain-status-' + pswp.id);
        for(var i=0; i < blockchainStatusUpdaters.length; i++) {
            blockchainStatusUpdaters[i].innerHTML = pswp.blockchain.status;
            blockchainStatusUpdaters[i].setAttribute('title',
                'Please pay ' + pswp.blockchain.price/100000 +
                    'mBTC to Bitcoin address ' + pswp.blockchain.address + '.'
            );
        } 
    };

    return figure;
};
