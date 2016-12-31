module.exports = function (background) {

    var config = background.config,
       imagesView = config.imagesView,
       log = background.log,
       tabHandler = this;

    function _createImagesTab () {
        var existingTabId = false;

        chrome.tabs.query({}, function (tabs) {
            for (var i=0; i<= tabs.length - 1; i++) {
                if ((tabs[i]) && (tabs[i].url).indexOf(imagesView) > 0) {
                    log.debug('Find existing Images tab with id ' + tabs[i].id);
                    existingTabId = tabs[i].id;
                }
            }
            if (existingTabId) {
                chrome.tabs.update(existingTabId, {active: true},
                    function (tab) {
                    if (chrome.runtime.lastError) {
                        log.error('Error ' + chrome.runtime.lastError.message);
                    }
                    else {
                        log.debug('Activate existing Images tab with id ' +
                            tab.id);
                        tabHandler.imagesTabId(existingTabId);
                    }
                });
            }
            else {

                // issue_18
                var pinned = true;
                if (localStorage.getItem('pinned') == 'no') {
                    pinned = false;
                }

                chrome.tabs.create(
                    {
                        url: chrome.extension.getURL(config.mainHtml + '?v=' +
                            imagesView),
                        active: true,
                        pinned: pinned
                    },
                    function (tab) {
                        if (chrome.runtime.lastError) {
                            log.error('Error creating images tab: ' +
                                chrome.runtime.lastError.message);
                        }
                        else {
                            log.debug('Create Images tab with id ' + tab.id);
                            tabHandler.imagesTabId(tab.id);
                        }
                    }
                );
            }
        });
    }

    function _getImagesTab(intervalId) {
        if (tabHandler.imagesTabId()) {
            var id = tabHandler.imagesTabId();
            if (intervalId) {
                log.debug('Clear interval: ' + intervalId);
                clearInterval(intervalId);
            }
            chrome.tabs.update(id, {active: true}, function (tab) {
                if (chrome.runtime.lastError) {
                    log.error('Error ' + chrome.runtime.lastError.message);
                    _createImagesTab();
                }
                else {
                    log.debug('Activated existing Images tab with id ' + tab.id);
                }
            });
        }
        else {
            _createImagesTab();
        }
    };

    tabHandler.checkForImagesTab = function (cb) {
        if (tabHandler.imagesTabId()) {
            var id = tabHandler.imagesTabId();
            chrome.tabs.get(id, function (tab) {
                if (chrome.runtime.lastError)
                    log.debug('Ignoring stale images tab in local storage.');
                if (tab && tab.id == tabHandler.imagesTabId()) {
                    cb(true);
                }
                else  {
                    cb(false);
                }
            });
        }
        else {
          cb(false);
        }
    };

    tabHandler.handleCapture = function () {
        var view = config.annotateView;
        chrome.tabs.create({
            url: chrome.extension.getURL(config.mainHtml) + '?v=' + view
        }, function (tab) {
            if (chrome.runtime.lastError) {
                log.error(chrome.runtime.lastError.message);
            }
            else {
                log.debug('Create capture tab with id: ' + tab.id);
            }
        });
    };

    tabHandler.handleImages = function (tabId, intervalId) {
        if (tabId) {
            chrome.tabs.remove(tabId, function () {
                if (chrome.runtime.lastError) {
                    log.error('Error: ' + chrome.runtime.lastError.message);
                }
                else {
                    log.debug('Close annotator tab.');
                }
            });
        }
        _getImagesTab(intervalId);
    };

    tabHandler.imagesTabId = function (id) {
        if (id) {
            log.debug('Set Images tab id to ' + id);
            localStorage.setItem('images', id);
        }
        return parseInt(localStorage.getItem('images'));
    };

    tabHandler.removeImagesTab = function () {
        chrome.tabs.remove(tabHandler.imagesTabId(), function () {
            log.debug('Remove Images tab with id: ' + tabHandler.imagesTabId());
        });
    };

    return tabHandler;

}; 
