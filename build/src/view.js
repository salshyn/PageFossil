var Annotate = require('./lib/annotate'),
    Images = require('./lib/images');

chrome.runtime.getBackgroundPage(function (b) {
    function getQueryStringValue (key) {    
        return decodeURIComponent(
            window.location.search.replace(
                new RegExp(
                    "^(?:.*[&\\?]" + 
                    encodeURIComponent(key).replace(
                        /[\.\+\*]/g, "\\$&") + 
                    "(?:\\=([^&]*))?)?.*$", "i"
                ), "$1")
        );    
    }    

    var body = document.getElementById('body'),
        dispatch = {
            annotate: Annotate,
            images: Images
        },
        v = getQueryStringValue('v'),
        v = (v.split('-'))[1];

    chrome.tabs.query({highlighted: true}, function (tabs) {
        var highlightedTab = tabs[0],
            object = new dispatch[v](b);
        switch (v) {
            case 'annotate':
                var annotate,
                    annotateTab = highlightedTab,
                    tabId = annotateTab.id;
                b.annotators[tabId] = annotate = new dispatch[v](b);
                annotate.init(annotateTab, b.capture);
                break;
            default:
                object.init(highlightedTab);
                break;
        }
        var section = document.getElementById(v + '-section');
        section.style.display = 'block';
    });
});
