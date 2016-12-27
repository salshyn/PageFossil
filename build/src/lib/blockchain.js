var Url = require('url');

module.exports = function (background) {
    var _byId = document.getElementById.bind(document),
     blockchainDetail = _byId('blockchain-detail');
     blockchainSection = _byId('blockchain-section');
     blockchainStatus = _byId('blockchain-status'),
     config = background.config,
     blockchainView = config.imagesView,
     blockchain = this,
     fs = background.fs,
     log = background.log;

    function _checkStatus(id, hash) {
        log.debug('_checkStatus');
        var checkStatus = new XMLHttpRequest(),
            c = config.blockchain,
            url = c.url + c.version + '/' + c.routes.status;
        checkStatus.onreadystatechange = function () {
            var DONE = this.DONE || config.DONE;
            if (this.readyState === DONE) {
                var resp = JSON.parse(this.responseText);
                log.debug('Received response.');
                if (resp.success && resp.pending) {
                    _setPending(id, resp);
                }
                else {
                    log.debug('ERROR: ' + resp.reason);
                }
            }
        };
        log.debug('Contacting server...');
        checkStatus.open('GET', url + '?d=' + hash, true);
        checkStatus.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        log.debug('HASH is ' + hash);
        checkStatus.send(null);
    }

    function _examineCache() {
        tabHandler.checkForImagesTab(function (isOpen) {
            if (isOpen) {
                log.debug('polling blockchain...');
                if (!blockchain.polling)
                    blockchain.polling = true;
                chrome.storage.local.get(_getLocalStorage);
            }
            else {
                // log.debug('Images tab is not open, will not poll.');
                if (blockchain.polling)
                    blockchain.polling = false;
            }
        });
    }

    function _getLocalStorage(storage) {
        var figures = Object.keys(storage);
        for (var i=0; i <= figures.length - 1; i++) {
           var id = figures[i],
            figure = storage[figures[i]];
            log.debug('image ID from cache: ' + id);
            if (figure.blockchain &&
                figure.blockchain.status) {
                var b = figure.blockchain,
                    statuses = config.blockchain.statuses;
                if ((b.status === statuses.PENDING) ||
                    (b.status === statuses.UNCONFIRMED)) {
                    _query(id, (storage[figures[i]].hash)
                      .substring(2));
                }
                else if (b.status === statuses.CONFIRMED) {
                    log.debug('Figure ' + id + ' is ' +
                        'already confirmed on the ' +
                        'blockchain with tx id ' + 
                        figure.blockchain.tx
                    );
                }
                else {
                    if (
                        (config.blockchain.usage === 'always')  &&
                        (b.status !== statuses.EXPIRED)
                    ) {
                        log.debug('Submitting image with ' +
                            'unknown status.');
                        _query(id, (storage[figures[i]].hash)
                            .substring(2));
                    }
                }
            }
        }
    }

    function _query(id, digest) {
        var queryBlockchain = new XMLHttpRequest(),
            c = config.blockchain,
            url = c.url + c.version + '/' + c.routes.status;
        queryBlockchain.onreadystatechange = function () {
            var DONE = this.DONE || config.DONE;
            if (this.readyState === DONE) {
                var resp = JSON.parse(this.responseText);
                if (resp.success && !resp.pending) {
                    // confirmed
                    if (resp.blockstamp) {
                        log.debug(id + ' is CONFIRMED. Tx id: ' + resp.tx);
                        log.debug(id + ' Blockstamp: ' + resp.blockstamp);
                        resp.status = c.statuses.CONFIRMED;
                    }
                    // not yet confirmed
                    else {
                        log.debug(id + ' is unconfirmed. Tx id: ' + resp.tx);
                        resp.status = c.statuses.UNCONFIRMED;
                    }
                    _setConfirmStatus(id, resp);
                }
                else if (resp.pending) {
                    resp.status = c.statuses.PENDING;
                    _setPending(id, resp);
                }
                else {
                    if (resp.reason === 'nonexistent') {
                      _registerAsset(id, digest);
                    }
                    else {
                        log.error('Unknown blockchain error.');
                        log.debug(JSON.stringify(resp));
                    }
                }
            }
        };
        queryBlockchain.open('GET', url + '?d=' + digest, true);
        queryBlockchain.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        queryBlockchain.send(null);
    }

    function _registerAsset(id, hash) {
        var registerAsset = new XMLHttpRequest(),
            c = config.blockchain,
            url = c.url + c.version + '/' + c.routes.register;
        registerAsset.onreadystatechange = function () {
            var DONE = this.DONE || config.DONE;
            if (this.readyState === DONE) {
                var resp = JSON.parse(this.responseText);
                log.debug('Received response.');
                if (!resp.success) {
                    if (resp.reason === 'existing') {
                        log.debug('Preexisting registration request.');
                        if (resp.digest = hash)
                            _checkStatus(id, hash);
                        else
                            log.debug('ERROR.    Digest ' + resp.digest +
                                ' does not match submitted hash ' + hash + '.');
                    }
                    else {
                        log.debug('ERROR: ' + resp.reason);
                    }
                }
                else if (resp.digest !== hash) {
                    log.debug('ERROR.    Digest ' + resp.digest +
                        ' does not match submitted hash ' + hash + '.');
                }
                else {
                    _setPending(id, resp);
                }
            }
        };
        log.debug('Contacting server...');
        registerAsset.open('GET', url + '?d=' + hash, true);
        registerAsset.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        log.debug('HASH is ' + hash);
        registerAsset.send(null);
    }

    function _setConfirmStatus(id, resp) {
        log.debug('_setConfirmStatus');
        chrome.storage.local.get(id, function (pswp) {
            pswp[id].blockchain.status = resp.status;
            pswp[id].blockchain.address = '';
            pswp[id].blockchain.updated = (new Date()).getTime();
            pswp[id].blockchain.price = '';
            pswp[id].blockchain.tx = resp.tx;
            chrome.storage.local.set(pswp, function () {
                log.debug('SUCCESS.    Blockchain transaction id is ' +
                    resp.tx + '.');
                fs.dirtyCache();
            })
        });
    }

    function _setPending(id, resp) {
        log.debug('_setPending');
        // current PoE status route does not return price
        // so hack it
        resp.price = resp.price || config.blockchain.defaultPrice;
        chrome.storage.local.get(id, function (pswp) {
            pswp[id].blockchain.status = config.blockchain.statuses.PENDING;
            pswp[id].blockchain.address = resp.pay_address ||
              resp.payment_address;
            pswp[id].blockchain.updated = (new Date()).getTime();
            pswp[id].blockchain.price = resp.price;
            chrome.storage.local.set(pswp, function () {
                log.debug('SUCCESS.    To register on the blockchain ' +
                    'please send ' + (resp.price/100000) + ' mBTC to Bitcoin ' +
                    'address ' + (resp.pay_address || resp.payment_address) +
                    '.');
                fs.dirtyCache();
            })
        });
    }

    blockchain.register = function (id, hash) {
      _registerAsset('image-' + id, hash);
    };

    blockchain.monitor = function() {
        blockchain.intervalId = setInterval(function () {
            if (config.blockchain.usage !== 'never') {
                _examineCache();
            }
        }, config.timers.blockchainTimeout);
        setTimeout(function () {
            log.debug('Force interval timeout on blockchain poll.');
            clearInterval(blockchain.intervalId);
            blockchain.polling = false;
            blockchain.monitor();
        }, config.timers.forceBlockchainTimeout);
    };

    return blockchain;
};
