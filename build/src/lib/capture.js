module.exports = function (background, tabId, tabURL, windowId) {

    var capture = this,
        config = background.config,
        log = background.log
        tabHandler = background.tabHandler;

    capture.tabId = tabId;
    capture.url = tabURL;
    
    function _capture() {
        log.debug('Execute ' + config.contentScripts.scanner.scan);
        chrome.tabs.executeScript(capture.tabId, {
            file: config.contentScripts.scanner.scan,
            runAt: 'document_end',
            allFrames: false
        },
        function(results) {
            var p = results[0];
            if (p.top === null) {
                p.top = 0;
                p.left = 0;
            }
            log.debug('Execute ' + config.contentScripts.scanner.elements);
            chrome.tabs.executeScript(capture.tabId, {
                file: config.contentScripts.scanner.elements,
                runAt: 'document_end',
                allFrames: false
            },
            function(results) {
                var results = results[0];
                if (chrome.runtime.lastError) {
                    log.error(chrome.runtime.lastError);
                }
            });
            
            var cb = function (data) {
                if (chrome.runtime.lastError) {
                    log.error(chrome.runtime.lastError);
                }
                if ((p.top || parseInt(p.top) === 0 )) {
                    capture.screens.push({
                        left: parseInt(p.left),
                        top: parseInt(p.top),
                        data: data
                    });
                }
                if (p.finish) {
                    _sendToAnnotator(p.width, p.height);
                }
                else {
                    _capture();
                }
            };
            setTimeout(function () {
                chrome.tabs.update(capture.tabId, {active: true}, function () {
                    if (chrome.runtime.lastError) {
                        log.error(chrome.runtime.lastError);
                    }
                    chrome.tabs.captureVisibleTab(windowId, {
                        format: 'png'
                    }, cb);
                });
            }, config.timers.perScreenDelay);
        });

    }

    function _sendMessage (command, content) {
        log.debug('Send %s', JSON.stringify(command));
        chrome.runtime.sendMessage({
            command: command,
            content: content
        }, function() {
            log.warn('Popup error: ' + chrome.runtime.lastError.message);
        });
    }

    function _sendToAnnotator (w, h) {

        log.debug('Execute ' + config.contentScripts.scanner.finish);
        chrome.tabs.executeScript(capture.tabId, {
            file: config.contentScripts.scanner.finish,
            runAt: 'document_end',
            allFrames: false
        },
        function(results) {
            var aView = config.annotateView,
                canvas,
                img = [],
                screens = capture.screens;

            capture.canvas = canvas = document.createElement('canvas');

            var loadIt = function (i) {
                img[i] = document.createElement('img');
                img[i].setAttribute('tag', i);
                img[i].addEventListener('load', function () {
                    var i = parseInt(this.getAttribute('tag'));
                    if (capture.devicePixelRatio > 1) {
                        screens[i].top = screens[i].top *
                          capture.devicePixelRatio;
                    }
                    ctx.drawImage(img[i], screens[i].left,
                        capture.screens[i].top);
                    screens[i].data = null;
                    img[i].setAttribute('src', '');
                    img[i] = null;
                    img[i] = null;
                    if (i === screens.length - 1) {
                        capture.dataURL = canvas.toDataURL();
                        _sendMessage('captureComplete', {capture: capture});
                        capture.screens = [];

                        return;
                    }
                    loadIt(++i);
                });
                try {
                    if (i === 0)
                        capture.thumbnail = capture.screens[i].data;
                    img[i].setAttribute('src', capture.screens[i].data);
                    delete capture.screens[i].data;
                }
                catch (e) { log.error('Caught error: ' + e); }
            }
            ctx = canvas.getContext('2d');
            if(capture.devicePixelRatio > 1){
                ctx.scale(1/capture.devicePixelRatio,
                    1/capture.devicePixelRatio);
            }
            canvas.width = w;
            canvas.height = h;
            if (capture.devicePixelRatio > 1) {
                canvas.width = canvas.width * capture.devicePixelRatio;
                canvas.height = canvas.height * capture.devicePixelRatio;
            }
            loadIt(0);
        });

    }

    capture.handoff = function () {
        setTimeout(function () {
                capture.canvas            = '';
                capture.command         = 'remember';
                capture.description = '';
                capture.screens         = [];
                log.debug('Execute ' + config.contentScripts.scanner.init);
                chrome.tabs.executeScript(capture.tabId, {
                    file: config.contentScripts.scanner.init,
                    runAt: 'document_end',
                    allFrames: false
                },
                function(results) {
                    log.debug('Content script devicePixelRatio: ' + results[0]);
                    capture.devicePixelRatio = results[0];
                    _capture();
                });
        }, config.timers.initialDelay);
    };

    return capture;
};
