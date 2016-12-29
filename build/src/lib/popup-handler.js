var Capture = require('./capture.js');

module.exports = function (background) {

    var config = background.config,
        log = background.log;

    function _checkFileURIPerms() {
        chrome.extension.isAllowedFileSchemeAccess(function (isAllowed) {
            if (isAllowed) {
                if (!popup.tab || popup.tab.url.indexOf(config.imagesView) < 0)
                    popup.images.style.display = 'block';
            }
            else {
                popup.images.style.display = 'none';
                popup.noimagesText.style = 'font-size:80%';
                popup.noimagesText.innerHTML = '(Click to configure BROWSE permissions)';
                popup.noimages.style.display = 'block';
            }
        });
    }
 
    function _sendMessage (command, content) {
        log.debug('Send: %s', JSON.stringify(command));
        chrome.runtime.sendMessage(
            {command: command,
             content: content
            }, function() {
                log.warn('Popup error: ' + chrome.runtime.lastError.message);
            }
        );
    }

    var _byId = document.getElementById.bind(document),
        popup = this;

    popup.init = function (tab) { 

        if (!tab) { // empty tab
          tab = {};
          tab.id = 0;
        } 
        popup.editNotes = _byId('edit-notes');
        popup.extensionSettings = _byId('extension-settings');
        popup.footer = _byId('popup-footer');
        popup.overlay = _byId('loading-div-background');
        popup.capture = _byId('capture-page');
        popup.close = _byId('close-images');
        popup.images = _byId('view-images');
        popup.noimages = _byId('noview-images');
        popup.noimagesText = _byId('noview-text');
        popup.saveImage = _byId('save-image');
        popup.tab = tab;
        var tab = popup.tab;
        popup.footer.innerHTML = config.popup.footer.text;

        popup.capture.onclick = function () {
            var capture = new Capture(background, tab.id, tab.url,
                tab.windowId);
            popup.overlay.style.display = 'block';
            capture.handoff();
        };
        popup.close.onclick = function () {
            chrome.tabs.remove(tab.id, function() {
                log.info('Removed tab ' + tab.id); 
            });
        };
        popup.footer.onclick = function () {
            chrome.tabs.create(
                {
                    url: config.popup.footer.link,
                    active: true
                },
                function (tab) {
                    if (chrome.runtime.lastError) {
                        log.error('Error creating popup footer tab: ' +
                            chrome.runtime.lastError.message);
                    }
                    else {
                        log.debug('Open footer link in tab id ' + tab.id);
                    }
                }
            );
        };
        popup.images.onclick = function () {
            _sendMessage('viewImages', {fromTab: tab.id});
        };
        popup.noimages.onclick = function () {
            _sendMessage('showExtension', {fromTab: tab.id});
        };
        popup.saveImage.onclick = function () {
            _sendMessage('saveImage', {fromTab: tab.id});
            popup.overlay.style.display = 'block';
        };
        popup.editNotes.onclick = function () {
            _sendMessage('editNotes', {fromTab: tab.id});
        };
        popup.check();
    };

    popup.check = function () {
        // empty tab is in focus
        if (!popup.tab) {
            _checkFileURIPerms();
        }
        // view-images should show Close
        else if (popup.tab.url.indexOf(config.imagesView) >= 0) {
            // document.body.style.height = '20px;'
            popup.capture.style.display = 'none';
            popup.close.style.display = 'block';
            _checkFileURIPerms();
            popup.saveImage.style.display = 'none';
            popup.editNotes.style.display = 'none';
        }
        // annotate should show Save Image & Edit Notes,
        else if (popup.tab.url.indexOf(config.annotateView) >= 0) {
            popup.saveImage.style.display = 'block';
            popup.editNotes.style.display = 'block';
        }
        // anything else internal should just show
        // view-images 
        else if (
            popup.tab.url.indexOf('chrome://') >= 0 ||
            popup.tab.url.indexOf('chrome-extension:') >= 0 ||
            popup.tab.url.indexOf('https://chrome.google.com') >= 0
         ) {
            _checkFileURIPerms();
            popup.saveImage.style.display = 'none';
            popup.editNotes.style.display = 'none';
            popup.capture.style.display = 'none';
        }
        // regular pages should show capture-page and
        // view-images 
        else {
            _checkFileURIPerms();
            popup.saveImage.style.display = 'none';
            popup.editNotes.style.display = 'none';
            popup.capture.style.display = 'block';
        }
    };

    return popup;
};
