module.exports = function (background) {

    var config = background.config,
        d = ['0', '100', '200', '300', '400', '500', '1000'],
        _byId = document.getElementById.bind(document),
        downloadsFolder = _byId('downloads-folder'),
        fsDetails = config.fs,
        fsMode = localStorage.fsMode || config.fsDefault,
        fsOptions = Object.keys(fsDetails),
        log = background.log,
        mainFolderKey = config.downloads.folderName,
        pinned = _byId('pinned'),
        options = this;
    
    options.init = function (tab) {

        // issue_18
        pinned.addEventListener('change', function(event) {
            localStorage.setItem('pinned', 'yes');
            if (!event.target.checked) {
                localStorage.setItem('pinned', 'no');
            }
        });
        pinned.checked = true;
        if (localStorage.getItem('pinned') == 'no') {
            pinned.checked = false;
        }

        if (localStorage.getItem(mainFolderKey)) {
            downloadsFolder.innerHTML = localStorage.getItem(mainFolderKey);
        }
        
        options.perScreenDelay = _byId('per-screen-delay');
        options.perScreenDelaySaved = _byId('per-screen-delay-saved');
        options.perScreenDelay.onchange = function() {
            try {
                var i = options.perScreenDelay.selectedIndex;
                config.timers.perScreenDelay =
                    options.perScreenDelay.options[i].getAttribute('value');
                localStorage.perScreenDelay =
                    options.perScreenDelay.options[i].getAttribute('value');
                options.perScreenDelaySaved.textContent = 'Saved';
                setTimeout(function () {
                    options.perScreenDelaySaved.textContent = '';
                }, config.timers.messageDisplay);
            }
            catch (e) {
                log.error(e);
                options.perScreenDelaySaved.textContent = 'Error';
                setTimeout(function () {
                    options.perScreenDelaySaved.textContent = '';
                }, config.timers.messageDisplay);
            }
        };
        if (localStorage.perScreenDelay) {
            for (var i=0; i<= d.length - 1; i++) {
                if (parseInt(localStorage.perScreenDelay) === parseInt(d[i])) {
                    options.perScreenDelay.options[i].selected = true;
                }
            }
        }
        else {
            for (var i=0; i<= d.length - 1; i++) {
                if (parseInt(config.timers.perScreenDelay) === parseInt(d[i])) {
                    options.perScreenDelay.options[i].selected = true;
                }
            }
        }
    
        options.initialDelay = _byId('initial-delay');
        options.initialDelaySaved = _byId('initial-delay-saved');
        options.initialDelay.onchange = function() {
            try {
                var i = options.initialDelay.selectedIndex;
                config.timers.initialDelay =
                    options.initialDelay.options[i].getAttribute('value');
                localStorage.initialDelay =
                    options.initialDelay.options[i].getAttribute('value');
                options.initialDelaySaved.textContent = 'Saved';
                setTimeout(function () {
                    options.initialDelaySaved.textContent = '';
                }, config.timers.messageDisplay);
            }
            catch (e) {
                log.error(e);
                options.initialDelaySaved.textContent = 'Error';
                setTimeout(function () {
                    options.initialDelaySaved.textContent = '';
                }, config.timers.messageDisplay);
            }
        };
        if (localStorage.initialDelay) {
            for (var i=0; i<= d.length - 1; i++) {
                if (parseInt(d[i]) === parseInt(localStorage.initialDelay)) {
                    options.initialDelay.options[i].selected = true;
                }
            }
        }
        else {
            for (var i=0; i<= d.length - 1; i++) {
                if (parseInt(d[i]) === parseInt(config.timers.initialDelay)) {
                    options.initialDelay.options[i].selected = true;
                }
            }
        }

        options.blockchainChoices =
            document.querySelectorAll('input[name="blockchain"]');
        for (var i=0; i<= options.blockchainChoices.length - 1; i++) {
            options.blockchainChoices[i].onchange = function() {
                try {
                    var blockchainValue =
                        document.querySelector(
                            'input[name="blockchain"]:checked'
                        ).value;
                    options.blockchainSaved = _byId('blockchain-' +
                        blockchainValue + '-saved');
                    localStorage.blockchain = blockchainValue;
                    config.blockchain.usage = blockchainValue;
                    options.blockchainSaved.textContent = ' Saved';
                    setTimeout(function () {
                        options.blockchainSaved.textContent = '';
                    }, config.timers.messageDisplay);
                }
                catch (e) {
                    log.error(e);
                    options.blockchainSaved.textContent = ' Error';
                    setTimeout(function () {
                        options.blockchainSaved.textContent = '';
                    }, config.timers.messageDisplay);
                }
            };
        }
        if (localStorage.blockchain) {
            var setNode = document.getElementById('blockchain-' +
              localStorage.blockchain);
            setNode.checked = true;
        }
        else {
            for (var i=0; i<= options.blockchainChoices.length - 1; i++) {
                if (options.blockchainChoices[i]
                    .getAttribute('value') === config.blockchain.usage) {
                    options.blockchainChoices[i].checked = true;
                }
            }
        }

    };

    return options;

};
