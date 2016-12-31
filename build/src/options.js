var Config = require('./config.js');

new Config(function (config) {
    var _byId = document.getElementById.bind(document),
        d = ['0', '100', '200', '300', '400', '500', '1000'],
        downloadsFolder = _byId('downloads-folder'),
        mainFolderKey = config.downloads.folderName,
        pinned = _byId('pinned'),
        invertColors = _byId('invert'),
        style = _byId('style'),
        style_invert = _byId('style-invert'),
        options = this;

    pinned.checked = true;
    pinned.addEventListener('change', function(event) {
        localStorage.setItem('pinned', 'yes');
        if (!event.target.checked) {
            localStorage.setItem('pinned', 'no');
        }
    });
    if (localStorage.getItem('pinned') === 'no')
        pinned.checked = false;

    invertColors.addEventListener('change', function (event) {
        if (invertColors.checked) {
            style.disabled = true;
            style_invert.disabled = false;
            localStorage.setItem('css', 'style-invert');
        } else {
            style.disabled = false;
            style_invert.disabled = true;
            localStorage.setItem('css', 'style');
        }
    });

    if (localStorage.getItem('css') !== 'style-invert' ||
        localStorage.getItem('css') == null) {
        style.disabled = false;
        style_invert.disabled = true;
        invertColors.checked = false;
        localStorage.setItem('css', 'style');
    } else {
        style.disabled = true;
        style_invert.disabled = false;
        invertColors.checked = true;
        localStorage.setItem('css', 'style-invert');
    }

    if (invertColors.checked) {
        style.disabled = true;
        style_invert.disabled = false;
        localStorage.setItem('css', 'style-invert');
    } else {
        style.disabled = false;
        style_invert.disabled = true;
        localStorage.setItem('css', 'style');
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
            console.log(e);
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
            console.log(e);
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
                console.log(e);
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
});
