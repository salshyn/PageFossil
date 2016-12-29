#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"
// fonts                     images                    js                            popup.html            style.css             view.html
RegExp.quote = function(str) {
    return str.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
};

require('shelljs/global');
var Config = require('../src/_config-bootstrap.js'),
    resize = require('resize-img');
    async = require('async'),
    attributeRegexes = [
        new RegExp('"(author)"\\s*:\\s*"(.+)"'),
        new RegExp('"(description)"\\s*:\\s*"(.+)"'),
        new RegExp('"(homepage)"\\s*:\\s*"(.+)"'),
        new RegExp('"(name)"\\s*:\\s*"(.+)"'),
        new RegExp('"(version)"\\s*:\\s*"(.+)"')
    ],
    browserifyBin = './node_modules/.bin/browserify',
    buildEnv = process.argv[2],
    buildFlags = '',
    compileEventString = '',
    compilePopupString = '',
    compileViewString = '',
    config = new Config(),
    configTemplate = 'build/src/_config-bootstrap.js',
    fontsFolderName = 'build/assets/fonts',
    imagesCSSSkin = './node_modules/photoswipe/dist/default-skin',
    imagesCSSSkinWin = imagesCSSSkin.replace(/\//g, '\\'),
    imagesCSSMain = './node_modules/photoswipe/dist/photoswipe.css',
    imagesCSSMainWin = imagesCSSMain.replace(/\//g, '\\'),
    cssTemplate = 'build/assets/style.css',
    fs = require('fs'),
    path = require('path'),
    dir = path.resolve(__dirname),
    imagesFolderName = 'build/assets/images',
    imageLogo = 'build/assets/images/icon256.png',
    jsFolderName = 'build/assets/js',
    cwd = dir + '/../../',
    extensionsFolder = 'chrome-extensions/',
    manifestTemplate = 'build/manifest.json',
    options = {},
    os = require('os'),
    platform = os.platform(),
    popupFileName = 'build/assets/popup.html',
    releaseFolder = extensionsFolder + 'js/',
    robocopyOptions = '/e /njh /njs /ndl /ns',
    sourceFolder = 'build/src/',
    uglifyBin = './node_modules/.bin/uglifyjs',
    viewFileName = 'build/assets/view.html';

if (platform !== 'win32')
    platform = 'other';

var exe = {
    createFolder1: {
        win32: 'rmdir "'    + cwd + 'chrome-extensions" /s /q',
        other: 'rm -rf "' + cwd + 'chrome-extensions"'
    },
    createFolder2: {
        win32: 'mkdir "' + cwd + 'chrome-extensions"',
        other: 'mkdir "' + cwd + 'chrome-extensions"'
    },
    copyFonts: {
        win32: 'robocopy "' + cwd + fontsFolderName.replace(/\//g,'\\') 
            + '" "' + extensionsFolder + '\\fonts" '    + robocopyOptions +
            ' || cmd /c exit / b 0',
        other: 'cp -R "' + cwd + fontsFolderName + '" "' +
            extensionsFolder + '"'
    },
    copyImages: {
        win32: 'robocopy "' + cwd + imagesFolderName.replace(/\//g,'\\') +
            '" "' + extensionsFolder + '\images" ' + robocopyOptions +
            ' || cmd /c exit / b 0',
        other: 'cp -R "' + cwd + imagesFolderName + '" "' +
            extensionsFolder + '"'
    },
    copyImagesMain: {
        win32: 'copy "' + cwd + imagesCSSMainWin + '" "' + extensionsFolder +
            '"', 
        other: 'cp "' + cwd + imagesCSSMain + '" "' + extensionsFolder + '"'
    },
    copyImagesSkin: {
        win32: 'robocopy "' + cwd + imagesCSSSkinWin + '" "' +
            extensionsFolder + '\\default-skin" ' + robocopyOptions +
            ' || cmd /c exit / b 0',
        other: 'cp -R "' + cwd + imagesCSSSkin + '" "' + extensionsFolder + '"'
    },
    copyJS: {
        win32: 'robocopy "' + cwd + jsFolderName.replace(/\//g,'\\') + '" "' +
            extensionsFolder + '\js" '         + robocopyOptions +
            ' || cmd /c exit / b 0',
        other: 'cp -R "' + cwd + jsFolderName + '" "' + extensionsFolder + '"'
    },
    copyPopup: {
        win32: 'copy "' + cwd + popupFileName.replace(/\//g,'\\') + '" "' +
            extensionsFolder + '"',
        other: 'cp "' + cwd + popupFileName + '" "' + extensionsFolder + '"'
    },
    copyView: {
        win32: 'copy "' + cwd + viewFileName.replace(/\//g,'\\') + '" "' +
            extensionsFolder + '"',
        other: 'cp "' + cwd + viewFileName + '" "' + extensionsFolder + '"'
    }
};

function print (msg) {
    process.stdout.write(msg + '...');
}

async.series([

    // Read our own package.json
    function(callback) {
        var pkgJsonReader = require('readline').createInterface({
            input: fs.createReadStream(cwd + 'package.json')
        });
        pkgJsonReader.on('line', function (line) {
            for (f in attributeRegexes) {
                var matches = line.match(attributeRegexes[f]);
                if (matches && matches[1] && matches[2]) {
                    options['___' + matches[1].toUpperCase() +
                    '___'] = matches[2];
                }
            }
        });
        pkgJsonReader.on('close', function () {
            if (buildEnv === 'dev') {
                buildFlags=' -d';
                console.log('Building for DEVELOPMENT (including sourcemaps)');
            }
            callback();
        });
    },

    // Create Extension subfolder
    function(callback) {
        print('Creating Extension subfolder');
        exec(exe.createFolder1[platform], function(status, output) {
            exec(exe.createFolder2[platform], function(status, output) {
                if (status) {
                    console.log('    ERROR.    Exit status:', status);
                    process.exit(0);
                }
                else {
                    console.log('done.');
                    callback();
                }
            });
        });
    },

    // Generate Extension manifest
    function(callback) {
        var manifestTemplateReader = require('readline').createInterface({
            input: fs.createReadStream(cwd + manifestTemplate)
        });
        var manifestJson = '';
        options.___MAINHTML___ = config.mainHtml;
        manifestTemplateReader.on('line', function (line) {
            var matches = line.match(/(___[A-Z_]+___)/g);
            if (matches) {
                for (var m=0; m < matches.length; m++) {
                    line = line.replace(matches[m], options[matches[m]]);
                }
            }
            manifestJson = manifestJson + line + "\n";
        });
        manifestTemplateReader.on('close', function () {
            print('Writing manifest');
            fs.writeFile(cwd + extensionsFolder + 'manifest.json', manifestJson,
                'utf8', function () {
                console.log('done.');
                callback();
            });
        });
    },

    function(callback) {
        console.log('Copying Images.');
        exec(exe.copyImages[platform], function(status, output) {
            if (status) {
                console.log('    ERROR building Images ' +
                    '- Exit status:', status);
                process.exit(0);
            }
            callback(); 
        });
    },

    function(callback) {
        var assets = [
            { name: 'view.html', cmd: exe.copyView[platform] },
            { name: 'popup.html', cmd: exe.copyPopup[platform] },
            { name: 'js', cmd: exe.copyJS[platform] },
            { name: 'fonts', cmd: exe.copyFonts[platform] },
            { name: 'Images CSS', cmd: exe.copyImagesMain[platform] },
            { name: 'Images skin', cmd: exe.copyImagesSkin[platform] },
        ];
        var count = assets.length - 1; 
        for (var i=0; i <= assets.length - 1; i++) {
            console.log('Copying ' + assets[i].name + '.');
            exec(assets[i].cmd, function(status, output) {
                if (status) {
                    console.log('    ERROR building ' + assets[i].name +
                        '- Exit status:', status);
                    process.exit(0);
                }
                count++;
                if (i === count)
                    callback(); 
            });
        }
    },

    function(callback) {
        console.log('Generating icons...');
        var sizes = {
            browseraction: [128, 128],
            icon128: [128, 128],
            icon48: [48, 48],
            icon32: [32, 32]
        };
        var filenames = Object.keys(sizes);
        async.each(filenames,
            function(file, cb){
                resize(fs.readFileSync(imageLogo), {
                    width: sizes[file][0], 
                    height: sizes[file][1]
                }).then(buf => {
                    fs.writeFileSync(extensionsFolder + 'images/' + file +
                        '.png', buf);
                    console.log(' Wrote ' + file + '.png.');
                    cb();
                });
            },
            function(err) {
                console.log( 'Done.');
                callback();
            }
        );
    },

    function(callback) {
        var configContent = '',
            configTemplateReader = require('readline').createInterface({
                input: fs.createReadStream(cwd + configTemplate)
            });
            options.___LOG_LEVEL___ = 'info';

        compileEventString = '"' + browserifyBin + '" "' + cwd + sourceFolder +
            'event.js" ' + buildFlags + ' | "' + uglifyBin + '" -c > "' + cwd +
            releaseFolder + 'event.js"';

        compilePopupString = '"' + browserifyBin + '" "' + cwd + sourceFolder +
            'popup.js" ' + buildFlags + ' | "' + uglifyBin + '" -c > "' + cwd +
            releaseFolder + 'popup.js"';

        compileViewString = '"' + browserifyBin + '" "' + cwd + sourceFolder +
            'view.js" ' + buildFlags + ' | "' + uglifyBin + '" -c > "' + cwd + 
            releaseFolder + 'view.js"';

        if (buildEnv === 'dev') {
            options.___LOG_LEVEL___ = 'debug';

            compileEventString = '"' + browserifyBin + '" "' + cwd +
                sourceFolder + 'event.js" > "' + cwd + releaseFolder +
                'event.js" ' + buildFlags;
            compilePopupString = '"' + browserifyBin + '" "' + cwd +
                sourceFolder + 'popup.js" > "' + cwd + releaseFolder +
                'popup.js" ' + buildFlags;
            compileViewString = '"' + browserifyBin + '" "' + cwd +
                sourceFolder + 'view.js" > "' + cwd + releaseFolder +
                'view.js" ' + buildFlags;
        }
        configTemplateReader.on('line', function (line) {
            var matches = line.match(/(___.+___)/);
            if (matches && matches[1]) {
                line = line.replace(matches[1], options[matches[1]]);
            }
            configContent = configContent + line + "\n";
        });
        configTemplateReader.on('close', function () {
            print('Writing config.js');
            fs.writeFile(cwd + sourceFolder + 'config.js', 
                configContent, 'utf8', function () {
                console.log('done.');
                callback();
            });
        });
    },
    
    // Generate custom sylesheet - style.css
    function(callback) {
        var cssContent = '',
        cssTemplateReader = require('readline').createInterface({
            input: fs.createReadStream(cwd + cssTemplate)
        }),
        styleOptions = {
            '___BASE_COLOR___' : config.baseColor,
            '___COMPLIMENT_COLOR___' : config.complimentColor,
            '___VISIBLE_YES___' : config.visibleYes
        };
        cssTemplateReader.on('line', function (line) {
            var matches = line.match(/(___.+___)/);
            if (matches && matches[1]) {
                line = line.replace(matches[1], styleOptions[matches[1]]);
            }
            cssContent = cssContent + line + "\n";
        });
        cssTemplateReader.on('close', function () {
            print('Writing stylesheet');
            fs.writeFile(cwd + extensionsFolder + 'style.css', cssContent,
            'utf8', function () {
                console.log('done.');
                callback();
            });
        });
    },

    // Generate custom sylesheet - style-invert.css
    function(callback) {
        var cssContent = '',
        cssTemplateReader = require('readline').createInterface({
            input: fs.createReadStream(cwd + cssTemplate)
        }),
        styleOptions = {
            '___BASE_COLOR___' : config.complimentColor,
            '___COMPLIMENT_COLOR___' : config.baseColor,
            '___VISIBLE_NO___' : config.visibleNo
        };
        cssTemplateReader.on('line', function (line) {
            var matches = line.match(/(___.+___)/);
            if (matches && matches[1]) {
                line = line.replace(matches[1], styleOptions[matches[1]]);
            }
            cssContent = cssContent + line + "\n";
        });
        cssTemplateReader.on('close', function () {
            print('Writing stylesheet');
            fs.writeFile(cwd + extensionsFolder + 'style-invert.css', cssContent,
            'utf8', function () {
                console.log('done.');
                callback();
            });
        });
    },

    // Create download tracer file.
    function(callback) {
        var folderFinder = config.downloads.folderFinder;
        print('Creating folder finder');
        exec('echo "-DELETE ME-" > "' + cwd + extensionsFolder + folderFinder +
            '"',
            function(status, output) {
            if (status) {
                console.log('    ERROR.    Exit status:', status);
                process.exit(0);
            }
            else {
                console.log('done.');
                callback();
            }
        });
    },

    // Browserify
    function (callback) {
        var browsifiers = [
            {name: 'event', cmd: compileEventString},
            {name: 'popup', cmd: compilePopupString},
            {name: 'view', cmd: compileViewString}
        ];
        var count = browsifiers.length - 1; 
        for (var i=0; i <= browsifiers.length -1; i++) {
            console.log('Browserfying ' + browsifiers[i].name + '.');
            async.map([browsifiers[i].name], function(f, cb) {
                exec(browsifiers[i].cmd, function(status, output) {
                    if (status) {
                        console.log('    ERROR.    Exit status:', status);
                        process.exit(0);
                    }
                    else {
                        cb();
                    }
                });},
                function (err, results) {
                    if (err) {
                        console.log('    ERROR.    Exit status:', status);
                        process.exit(0);
                    }
                    count++;
                    if (i === count)
                        callback();
                }
            );
        }
    },

    function (callback) {
        console.log("You can now load this Extension into\n" + 
            'Chrome while in Developer mode.');
        console.log("If you need assistance, please see\n" +
            "https://goo.gl/QOzPYy\n");
        callback();
    }
]);
