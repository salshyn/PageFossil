module.exports = function (config, log, fs, prefix) {

    var assets = this,
        foot = config.footer.pad,
        fsDetails = config.fs['local'],
        msg = fs.handler.message,
        pad = config.qrcode.pad,
        prefix = fsDetails.proto + '://',
        qsz = config.qrcode.size,
        sep = config.fs.sep.u;

    if (config.os === 'win') 
      sep = config.fs.sep.w;


    function _examineAssets(subfolderURL, fileList, subfolderContents) {
        fileList = fileList.split(new RegExp(
            RegExp.quote(fsDetails.itemSuffix)
        ));
        for (var i = 0; i < fileList.length - 1; i++) {
            var folderDetail = ((fileList[i].replace(new RegExp(
                RegExp.quote(fsDetails.itemPrefix)), ''))
                    .replace(/\)/, '')).replace(/("|\s|)/gm, "");
            folderDetail = folderDetail.split(',');
            var lastDay = folderDetail[6],
                lastTime = folderDetail[7],
                name = folderDetail[0],
                size = folderDetail[3],
                sizeEst = folderDetail[4];
            if (name.match(/crdownload/)) {
                name = name.replace(/\.crdownload$/, '');
            }
            else if (!fsDetails.ignore[name]) {
                lastTime = lastTime.replace(/[A|P]M$/, '');
                var file = {
                    name: name,
                    path: subfolderURL + name,
                    lastActive: new Date(Date.parse(lastDay + ' ' +
                        lastTime)).toUTCString(),
                    size: sizeEst
                };
                subfolderContents.push(file);
            }
        }
        _processAssets(null, subfolderContents);
    }

    function _processAssets(err, files) {
        if (err) {
            log.error(err);
        }
        else {
            if (fs.handler) {
                fs.handler.total = fs.handler.total + files.length;
                if (fs.handler.total < 1)
                    return;
                var qrCanvas = document.createElement("canvas");
                qrCanvas.id = 'qr-canvas';
                qrCanvas.width = qsz + config.qrcode.pad;
                qrCanvas.height = qsz + config.qrcode.pad;
                qrCanvas.style.display = 'none';
                fs.handler.detail.appendChild(qrCanvas);
                var qrCtx = qrCanvas.getContext('2d');
                msg.innerHTML = '<p>Please wait while ' +
                  'we process all outstanding asset data.</p>';
                fs.handler.overlay.style.display = 'block';
                for (var i = 0; i <= files.length - 1; i++) {
                    (_scanAsset)(
                        (files[i].name).substring(2,9), 
                        files[i].path, 
                        files[i].size,
                        files.length,
                        qrCtx
                    );
                }
            }
        }
    }

    function _scanAsset(id, path, size, total, ctx) {
        chrome.storage.local.get('image-' + id, function (pswp) {
            if (Object.keys(pswp).length === 0 && pswp.constructor === Object) {
                var img = new Image();
                img.src = path;
                img.id = id,
                img.size = size;
                img.total = total;
                img.onload = function () {
                    var    png = this;
                    png.notes = '';
                    try {
                        var qr1 = new Worker(config.workerScripts.qrscan);
                        qr1.onmessage = function (e) {
                            fs.handler.gallery.figure.scanInit(e, png, ctx);
                        };
                        var x = png.height - qsz - foot/2;
                        ctx.drawImage(png, foot, x, qsz, qsz, pad, pad, qsz,
                        qsz);
                        var imgData1 = ctx.getImageData(pad, pad, qsz, qsz);
                        qr1.postMessage(imgData1);
                    }
                    catch (e) {
                        log.error(e);
                    }
                };
            }
            else {
                msg.innerHTML = 'Load ' + pswp['image-' + id] + ' from local storage.';
                fs.handler.gallery.add(pswp['image-' + id]);
            }
        });
    }

    assets.get = function (subfolderName) {
        var getAssets = new XMLHttpRequest();
        var subfolderURL;
        if (config.os === 'win') {
            var mF = (fs.getMainFolder()).replace(/\\/g, '/');
            subfolderURL = prefix + '/' + mF + '/' + subfolderName + '/';
        }
        else {
            subfolderURL = prefix + '/' + fs.getMainFolder() + '/' +
                subfolderName + '/';
        }
        getAssets.onreadystatechange = function () {
            var DONE = this.DONE || config.DONE;
            if (this.readyState === DONE) {
                var subSourceDivider;
                if (config.os === 'win') {
                    var mF = (fs.getMainFolder()).replace(/\\/g, sep);
                    subSourceDivider = fsDetails.startString + mF + sep +
                        subfolderName + sep + fsDetails.endString +
                          fsDetails.itemSuffix;
                }
                else {
                    subSourceDivider = fsDetails.startString + 
                        fs.getMainFolder() + '/' + subfolderName + '/' + 
                        fsDetails.endString + fsDetails.itemSuffix;
                }
                try {
                    var chromeFolderListing = this.responseText,
                        pageSections = chromeFolderListing
                            .split(new RegExp(RegExp.quote(subSourceDivider)));

                    var fileList = pageSections[1].replace(/(\r\n|\n|\r)/gm,
                      ""),
                      subfolderContents = [];
                    _examineAssets(subfolderURL, fileList, subfolderContents);
                }
                catch (err) {
                    log.error(err);
                }
            }
        };
        msg.innerHTML = 'Request ' + subfolderURL;
        getAssets.open('GET', subfolderURL, true);
        getAssets.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        getAssets.send(null);
    };

    assets.showNoneFoundMsg = function () {
        log.debug('No assets found.');
        if (fs.handler) {
            msg.innerHTML = 'No ' + config.appName +
                ' assets found.<br>Waiting for ' + config.appName +
                ' assets...';
            if (fs.handler.overlay.style.display !== 'block')
                fs.handler.overlay.style.display = 'block';
        }
    };

    return assets;
};
