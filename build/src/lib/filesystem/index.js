var Assets = require('./assets.js'),
   SHA256 = require ('../util/sha256.js'),
   TabHandler = require('../util/tabhandler.js');

module.exports = function (background) {

   var _byId = document.getElementById.bind(document),
      config = background.config,
      filesystem = this,
      fsDetails = config.fs['local'],
      log = background.log,
      mainFolderKey = config.downloads.folderName,
      prefix = fsDetails.proto + '://',
      sep = config.fs.sep.u,
      sha256 = new SHA256(),
      tabHandler = new TabHandler(config, log);
      filesystem.assets = new Assets(config, log, filesystem);

   if (config.os === 'win') 
      sep = config.fs.sep.w;

   RegExp.quote = function(str) {
      return str.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
   };

   function _checkMainFolder() {
      var DONE = this.DONE || config.DONE;
      if (this.readyState === DONE) {
         try {
            var sourceDivider = _getSourceDivider(),
               chromeFolderListing = this.responseText,
               folderHash = sha256.hash(chromeFolderListing),
               pageSections = chromeFolderListing.split(new RegExp(
                  RegExp.quote(sourceDivider))),
               subfolders = [];
            if (pageSections && pageSections[1]) {
               var folderList = pageSections[1].replace(/(\r\n|\n|\r)/gm, '');
               filesystem.folderList = folderList.split(new RegExp(
                  RegExp.quote(fsDetails.itemSuffix)
               ));
               if (filesystem.folderList.length <= 2) { // empty main folder
                  filesystem.folderHash = folderHash;
                  filesystem.assets.showNoneFoundMsg();
               }
               else if (folderHash !== filesystem.folderHash) {
                  log.debug('Set folder hash: ' + folderHash + '.');
                  filesystem.folderHash = folderHash;
                  _examineSubfolders(subfolders);
               }
               else {
                  log.debug('No folder change.');
               }
            }
         }
         catch (err) {
            log.error(err);
            return err;
         }
      }
   }

   function _examineSubfolders(subfolders) {
      var folderList = filesystem.folderList
      for (var i = 0; i < folderList.length - 1; i++) {
         var folderDetail = ((folderList[i].replace(new RegExp(
         RegExp.quote(fsDetails.itemPrefix)), '')).replace(/\)/, ''))
            .replace(/("|\s|)/gm, "");
         folderDetail = folderDetail.split(',');
         var lastDay = folderDetail[6],
            lastTime = folderDetail[7],
            name = folderDetail[0];
         if (!fsDetails.ignore[name]) {
            lastTime = lastTime.replace(/[A|P]M$/, '');
            var url = prefix + '/' + filesystem.getMainFolder();
            if (config.os === 'win') {
               url = prefix + '/' + 
                  (filesystem.getMainFolder()).replace(/\\/g, '/');
            }
            var folder = {
               name: name,
               path: url,
               lastActive: new Date(Date.parse(lastDay + ' ' +
                  lastTime)).toUTCString()
            };
            subfolders.push(folder);
         }
      }
      _getSubfolders(null, subfolders);
   }

   function _findMainFolder() {
      if (!filesystem.handler || filesystem.searching)
         return;
      filesystem.searching = true;
      var folderFinder = config.downloads.folderFinder;
      filesystem.handler.overlay.style.display = 'block';
      setTimeout(function () {
         var evt1 = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
         });
         var a1 = document.createElement('a');
         a1.setAttribute('href', chrome.extension.getURL(folderFinder));
         a1.setAttribute('download', folderFinder);
         document.body.appendChild(a1);
         var canceled = !a1.dispatchEvent(evt1);
         if (canceled) {
            log.info('Event dispatch canceled.');
         }
         else {
            setTimeout(function() {
               var mainFolderKey = config.downloads.folderName;
               if (localStorage.getItem(mainFolderKey)) {
                  filesystem.checkMainFolder();
               }
               else {
                  var msg = 'Could not determine download folder.   ' +
                     config.appName + ' may not operate as expected.';
                  log.error(msg);
                  filesystem.handler.message.innerHTML = msg;
               }
            }, config.timers.downloadTracerDelay);
         }
      }, config.timers.findFolderDelay);
   }

   function _getPath(absPath) {
      var parts, path, pathOnly, thePath;
      if (config.os === 'win') {
         parts = absPath.split('\\');
         pathOnly = parts.splice(0, parts.length - 1);
         // account for Drive letter e.g. 'C:'
         pathOnly.pop(); // Remove MMM-YYYY named subdir
         path = pathOnly.join('\\');
         thePath = path;
         log.debug('Set ' + config.downloads.folderName + ' to ' + thePath);
      }
      else {
         parts = absPath.split('/');
         pathOnly = parts.splice(0, parts.length - 1);
         if (pathOnly[pathOnly.length - 1] === 'thumbs') {
            pathOnly.pop();
         }
         pathOnly.pop(); // Remove MMM-YYYY named subdir
         path = pathOnly.join('/');
         thePath = path;
      }
      log.debug('Set ' + config.downloads.folderName + ' to ' + thePath);
      return thePath;
   }

   filesystem.getMainFolder = function() {
      return localStorage.getItem(mainFolderKey);
   }

   function _getSourceDivider() {
      var sourceDivider;
      if (config.os === 'win') {
         var mF = (filesystem.getMainFolder()).replace(/\\/g, sep); 
         sourceDivider = fsDetails.startString + mF + sep +
            fsDetails.endString + fsDetails.itemSuffix;
      }
      else {
         sourceDivider = fsDetails.startString + 
            filesystem.getMainFolder() + sep +
            fsDetails.endString + fsDetails.itemSuffix;
      }
      return sourceDivider;
   }

   function _getSubfolders(err, folders) { 
      if (err) {
         log.error(err);
      }
      else {
         if (filesystem.handler) {
            filesystem.handler.total = 0;
            filesystem.handler.numPositioned = 0;
         }
         for (var i = 0; i < folders.length; i++) {
            log.debug('Get subfolder contents: ' + folders[i].name + '.');
            filesystem.assets.get(folders[i].name);
         }
      }
   }

   function _setDownloadPath(items) {
      var absPath = items[0].filename;
      if (
         (absPath.match(config.regex.image)) ||
         (absPath.match(config.regex.thumb))
      ) {
         var path = _getPath(absPath);
         if (!filesystem.getMainFolder()) {
            localStorage.setItem(mainFolderKey, path);
         }
         else if (path !== filesystem.getMainFolder()) {
            alert('It looks like the ' + config.appName + 
               ' download folder has changed!   The new folder at ' + 
               path + ' will start with 1 item (the current one).');
            localStorage.setItem(mainFolderKey, path);
         }
      }
   }

   filesystem.checkMainFolder = function () {
      var urlPath = filesystem.getMainFolder();
      if (urlPath) {
         if (config.os === 'win')
            urlPath = urlPath.replace(/\\/g, '/');
         filesystem.mainUrl = prefix + urlPath + '/';
         var xmlHttp = new XMLHttpRequest();
         xmlHttp.onreadystatechange = _checkMainFolder;
         xmlHttp.open('GET', filesystem.mainUrl, true);
         xmlHttp.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
         xmlHttp.send(null);
      }
      else {
         log.debug('No download folder found.');
         _findMainFolder();
      }
   };

   filesystem.dirtyCache = function() {
      filesystem.folderHash = sha256.hash(((new Date()).getTime() +
         Math.random()).toString());
   }

   filesystem.folderList = '';

   filesystem.handleDownload = function(tabId) {
      var intervalId = setInterval(function() {
         chrome.downloads.search({}, function (items) {
            if (items[0].state === 'complete') {
               _setDownloadPath(items);
               tabHandler.handleImages(tabId, intervalId);
            }
         });
      }, config.timers.downloadMonitorDelay);
   };

   filesystem.pollMainFolder = function() {
      filesystem.intervalId = setInterval(function () {
         log.debug('polling local filesystem...');
         if (filesystem.handler) {
             if (!filesystem.polling)
                 filesystem.polling = true;
             filesystem.checkMainFolder();
         }
      }, config.timers.pollTimeout);
      setTimeout(function () {
         log.debug('Force interval timeout on poll.');
         clearInterval(filesystem.intervalId);
         filesystem.polling = false;
         filesystem.pollMainFolder();
      }, config.timers.forcePollTimeout);
   };

   filesystem.setAssetHandler = function(handler) {
      filesystem.dirtyCache();
      filesystem.handler = handler;
      return;
   };

   return filesystem;

};
