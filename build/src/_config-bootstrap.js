var parsedPackage = require('../../package.json');

module.exports = function (cb) {

    var app, appName, iPrefix;
    
    function _assign (os) {
        var u = 'unix',
            w = 'win',
            osMap = {
                aix: u, android: u, cros: u,
                darwin: u, freebsd: u, linux: u,
                mac: u, openbsd: u, sunos: u,
                win: w, win32: w
            };

        os = osMap[os];

        this.config = {
            DONE: 4,
            app: app,
            appName: appName,
            baseColor: '#222930',
            blockchain: {
                defaultPrice: 500000,
                explorerURL: 'https://www.blocktrail.com/BTC/tx/',
                paymentWords: ['Send ', 'mBTC to address '],
                statuses: {
                    CONFIRMED: 'confirmed',
                    EXPIRED: 'expired',
                    PENDING: 'pending',
                    UNCONFIRMED: 'unconfirmed',
                    UNSENT: 'none'
                },
                routes: {
                    register: 'register',
                    status: 'status',
                },
                url: 'https://proofofexistence.com/api/',
                usage: 'optional',
                version: 'v1'
            },
            browserActionImg: '/images/browseraction.png',
            complimentColor: '#4eb1ba',
            configFolder: 'config',
            contentScripts: {
                annotate: {
                    copy: 'js/content/copy.js',
                },
                scanner: {
                    elements: 'js/content/elements.js',
                    finish: 'js/content/finish.js',
                    init: 'js/content/init.js',
                    scan: 'js/content/scan.js'
                }
            },
            downloads: {
                folderName: 'downloadFolder',
                tracerFileSuffix: '_find.txt'
            },
            annotateBackground: '../images/annotate-background.png',
            footer : {
                pad: 20,
                space: 10
            },
            fs: {
                local: {
                    using: true,
                    label: 'Local',
                    endString: '")',
                    ignore: {'..': 1, '.crdownload': 1, '.DS_Store': 1,
                             'thumbs': 1},
                    itemPrefix: '<script>addRow("',
                    itemSuffix: ';</script>',
                    proto: 'file',
                    startString: '</script><script>start("',
                    supported: true
                },
                sep: {
                    u: '/',
                    w: '\\\\'
                }
            },
            fsDefault: 'local',
            iPrefix: iPrefix,
            logLevel: '___LOG_LEVEL___',    // Set via environment
            logo: '/images/icon256.png',
            mainHtml: 'view.html',
            optionsTabId: 'optionsTabId',
            os: os,
            popup: {
                footer: {
                    text: 'c2fo lab',
                    link: 'https://keybase.io/c2folab'
                }
            },
            qrcode : {
                maxNotesLength: 256,
                maxURLlength: 2000,
                pad: 20,
                size: 200
            },
            regex: {
                image: new RegExp(iPrefix + '.{64}_\\d{13}\\.png'),
                imageDate: /^(\w{3}) (\w{3}) (\d{2}) \d{4} (\d{2}:\d{2}:\d{2}).+$/,
                imageTitle: / GMT-\d{4} \(\w{3}\)/,
                thumb: new RegExp(iPrefix + '.{7}_\\d{13}-thumb\\.png'),
                i2t1: /(.{7}).{57}(_\d{13,})(\.png)$/,
                i2t2: "$1$2-thumb$3",
                i2t3: new RegExp('(' + iPrefix + '.{7}_\\d{13,}-)'),
                i2t4: "thumbs/$1"
            },
            timers: {
                blockchainTimeout: 300000,
                crdownloadDelay: 500,
                downloadMonitorDelay: 1500,
                downloadTracerDelay: 5000,
                fileRetry: 5000,
                findFolderDelay: 2000,
                forceAnnotateTimeout: 30000,
                forceBlockchainTimeout: 300000,
                forceOptionsTimeout: 30000,
                forcePendingRegTimeout: 1800000,
                forcePollTimeout: 30000,
                initialDelay: '0',
                messageDisplay: 700,
                mouseTimeout: 100,
                perScreenDelay : 300,
                pollTimeout: 1500,
                resizeTimeout: 100,
                saveImagesTimeout: 700,
                tracerDelay: 1500
            },
            toasters: {
                timeout: 3000
            },
            version: '___VERSION___', // Set via package.json
            website: 'https://twitter.com/c2folab',
            workerScripts: {
                qrscan: 'js/vendor/decoder.min.js'
            }
        };
    
        this.config.annotateView = this.config.app + '-annotate';
        this.config.blockchainView = this.config.app + '-blockchain';
        this.config.downloads.folderFinder = this.config.app +
            this.config.downloads.tracerFileSuffix;
        this.config.imagesView = this.config.app + '-images';
        this.config.mainSubFolder = this.config.app + '/';
        this.config.regex.gallery = new RegExp('.+?\/' +
            this.config.app + '\/(\\w{3}-\\d{4})\/.+'),
        this.config.viewCleanup = this.config.itemCleanup + '("';
        this.config.viewDivider = this.config.mainSubFolder + '/");</script>';

        if (cb)
            cb(this.config);
    }

    var assign = _assign.bind(this);

    try {
        appName = chrome.runtime.getManifest().name;
        app = (chrome.runtime.getManifest().name).toLowerCase();
        iPrefix = ((chrome.runtime.getManifest().name).substring(0,2))
                                        .toLowerCase();
    }
    catch (e) {
        appName = parsedPackage.name;
        app = (parsedPackage.name).toLowerCase();
        iPrefix = ((parsedPackage.name).substring(0,2)).toLowerCase();
    }
    try { 
        chrome.runtime.getPlatformInfo(function (platform) {
            assign(platform.os);
        });
    }
    catch (e) {
        var os = require('os');
        assign(os.platform()); 
    }
    return this.config;

}
