var SHA256 = require ('../util/sha256.js');

module.exports = function (config, log, fs, annotate) {

  var renderer,
    save = this,
    sha256 = new SHA256(),
    tab = annotate.tab;

  // http://stackoverflow.com/a/12300351
  function _dataURItoBlob (dataURI) {
    var byteString = atob(dataURI.split(',')[1]);
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    var blob = new Blob([ab], {type: mimeString});
    return blob;
  }

  save.exec = function () {
    var downloadHandler = function (doneDataURL, thumbnail) {
      renderer.exec(doneDataURL, thumbnail);
      fs.handleDownload(tab.id);
    };
    annotate.produceFinalImage(downloadHandler, annotate.url);
  };

  save.init = function() {

    renderer = {
      _exec: function() {
       
        var fRegex = /[%&\(\)\\\/\:\*\?\"\<\>\|\/\]]/g,
          imgPre = config.iPrefix,
          imgURL = URL.createObjectURL(renderer.imgBlob()),
          imgFilename = imgPre + sha256.hash(imgURL) +
            '_' + ((new Date()).getTime()).toString(),
          imgFilenameParts = imgFilename.split('_'),
          imgTimestamp = imgFilenameParts[imgFilenameParts.length - 1],
          thumbURL = URL.createObjectURL(renderer.imageThumb());

        imgFilename = imgFilename.replace(fRegex,' ');
        imgFilename += '.png' ;

        thumbFilename = imgFilename.substring(0, 9) + '_' +
          imgTimestamp + '-thumb.png';

        var evt1 = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true
        });
        var a1 = document.createElement('a');
        a1.setAttribute('href', imgURL);
        a1.setAttribute('download', imgFilename);
        document.body.appendChild(a1);
        var canceled = !a1.dispatchEvent(evt1);
        if (canceled) {
          log.info('Event dispatch canceled.');
        } else {
          var evt2 = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
          });
          var a2 = document.createElement('a');
          a2.setAttribute('href', thumbURL);
          a2.setAttribute('download', thumbFilename);
          document.body.appendChild(a2);
          canceled = !a2.dispatchEvent(evt2);
          if (canceled) {
            log.info('Event dispatch canceled.');
          }
        } 
      },

      exec: function(doneDataURL, thumbnail) {
        renderer.imgB64 = function() {var d = doneDataURL; return d;};
        renderer.thumbB64 = function() {
          var d = thumbnail.toDataURL(); return d;
        };
        renderer.imgBlob = function () {
          return _dataURItoBlob(renderer.imgB64());
        };
        renderer.imageThumb = function () {
          return _dataURItoBlob(renderer.thumbB64());
        };
        this._exec();
      },
    };

    window.setTimeout(function(){
      document.dispatchEvent(new Event('resize'));
    }, 100);

  };


  return save;

};
