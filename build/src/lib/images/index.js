var Base64 = require('base64-js'),
    Gallery = require('./gallery.js'),
    PhotoSwipe = require('photoswipe'),
    PSUI_Default = require('photoswipe/dist/photoswipe-ui-default'),
    SHA256 = require ('../util/sha256.js');

module.exports = function (background) {
    var _byId = document.getElementById.bind(document),
        config = background.config,
        fs = background.fs,
        images = this,
        log = config.log;
    images.detail = _byId('image-detail');
    images.items = [];
    images.message = _byId('message');
    images.numPositioned = 0;
    images.gallery = new Gallery(background, images);
    images.overlay = _byId('loading-div-background');
    images.showroom = _byId('images-showroom');
    images.total = 0;

    images.init = function (tab) {
        window.onbeforeunload = function() {
            return 1;
        };
        chrome.tabs.getCurrent(function (tab) {
            document.title = 'Saved images [' + config.appName + ']';
            fs.setAssetHandler(images);
        });
    };

    return images;
};
