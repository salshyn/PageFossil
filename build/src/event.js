var Blockchain = require('./lib/blockchain.js'),
    Config = require('./config.js'),
    Filesystem = require('./lib/filesystem');
    TabHandler = require('./lib/util/tabhandler.js');

new Config(function (config) {

    config.blockchain.usage = localStorage.blockchain ||
        config.blockchain.usage;
    config.timers.perScreenDelay = localStorage.perScreenDelay ||
        config.timers.perScreenDelay;
    config.timers.initialDelay = localStorage.initialDelay ||
        config.timers.initialDelay;

    window.config = config;
    window.log = require('loglevel');
    window.fs = new Filesystem(window);

    window.blockchain = new Blockchain(window.config, window.log, window.fs);
    if (!window.fs.polling) window.fs.pollMainFolder();
    if (!window.blockchain.polling) window.blockchain.monitor();

    var log = window.log,
        tabHandler = new TabHandler(config, log);

    log.setLevel(config.logLevel);
    log.info(config.appName + ' version ' + config.version +
        ' loaded @ ' + (new Date()).toString()
    );

    window.annotators = {};

    chrome.downloads.onDeterminingFilename.addListener(
        function(downloadItem, cb) {
            var file = downloadItem.filename,
                mainFolderKey = config.downloads.folderName,
                folderFinder = config.downloads.folderFinder;
                iPrefix = config.iPrefix,
                UTCparts = (((new Date()).toUTCString()).split(' ')),
                subfolder = UTCparts[2] + '-' + UTCparts[3];

            if ((file).match(config.regex.image)) {
                if (config.os === 'win') {
                    cb({
                        filename: config.app + '\\' + subfolder + '\\' + file,
                        conflictAction: 'overwrite'
                    });
                }
                else {
                    cb({
                        filename: config.app + '/' + subfolder + '/' + file,
                        conflictAction: 'overwrite'
                    });
                }
            }
            else if ((file).match(config.regex.thumb)) {
                if (config.os === 'win') {
                    cb({
                        filename: config.app + '\\' + subfolder + '\\thumbs\\' +
                          file,
                        conflictAction: 'overwrite'
                    });
                }
                else {
                    cb({
                        filename: config.app + '/' + subfolder + '/thumbs/' +
                          file,
                        conflictAction: 'overwrite'
                    });
                }
            }
            else if ((file).match( new RegExp(folderFinder))) {

                if (config.os === 'win') {
                    cb({
                        filename: config.app + '\\' + file,
                        conflictAction: 'overwrite'
                    });
                }
                else {
                    cb({
                        filename: config.app + '/' + file,
                        conflictAction: 'overwrite'
                    });
                }

                setTimeout(function () {
                    chrome.downloads.search({filenameRegex: folderFinder},
                    function(items) {
                        if (items[0] && (items[0].state === 'complete')) {
                            var fullPath = items[0].filename,
                                parts, path, pathOnly;
                            if (config.os === 'win') {
                                parts = fullPath.split('\\');
                                pathOnly = parts.splice(0, parts.length - 1);
                                path = pathOnly.join('\\');
                                log.debug('Set ' + mainFolderKey + ' to ' +
                                  path);
                                localStorage.setItem(mainFolderKey, path);
                            }
                            else {
                                parts = fullPath.split('/'),
                                pathOnly = parts.splice(0, parts.length - 1),
                                path = pathOnly.join('/');
                                log.debug('Set ' + mainFolderKey +
                                  ' to ' + path);
                                localStorage.setItem(mainFolderKey, path);
                            }
                            localStorage.downloadTracerId = items[0].id;
                            window.fs.searching = false;
                            chrome.downloads.removeFile(items[0].id,
                                function () {
                                    log.debug('Folder finder file removed.');
                                }
                            );
                        }
                    });
                }, config.timers.tracerDelay);
            }
            else {
                cb({ filename: file });
            }
            return true;
        }
    );
    
    chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
        if (parseInt(tabId) === parseInt(tabHandler.imagesTabId())) {
            log.debug('Release Images tab with id ' + tabId);
            localStorage.removeItem('images');
        } 
    });
    
    chrome.runtime.onMessage.addListener(function (msg, sender, callback) {
        log.debug('Received ' + msg.command);
        var dispatch = {
            captureComplete: function () {
                window.capture = msg.content.capture;
                tabHandler.handleCapture();
            },
            editNotes: function () {
                if (msg.content.fromTab)
                    window.displayModal = msg.content.fromTab;
            },
            log: function () {log[msg.level](msg.content);},
            saveImage: function () {
                if (msg.content.fromTab)
                    window.page2image = msg.content.fromTab;
            },
            viewImages: function () {
                tabHandler.handleImages(false);
            }
        };
        dispatch[msg.command]();
    });
});
