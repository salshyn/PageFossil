var Popup = require('./lib/popup-handler.js');
chrome.runtime.getBackgroundPage(function (b) {
    var popup = new Popup(b.config, b.log);
    chrome.tabs.query({highlighted: true}, function (tabs) {
        var highlightedTab = tabs[0];
        if ((highlightedTab.url).indexOf('newtab') >= 0) {
            var highlightedTab = tabs[1];
        }
        popup.init(highlightedTab);
    });
});
