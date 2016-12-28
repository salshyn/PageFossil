# PageFossil Chrome Extension 

Save web pages as images and register them on the blockchain.

  * [Purpose](#purpose)
  * [Prior art](#prior-art)
  * [Install](#installation)
    * [Users](#users)
    * [Developers](#developers)
  * [Usage](#usage)
  * [Tested platforms](#tested-platforms)
  * [Blockchain option](#blockchain-option)
  * [Symbolic links](#symbolic-links)
      * [Dropbox](#dropbox)
      * [Google Drive](#google-drive)
  * [Security](#security)
      * [Contact](#contact)
      * [File URL](#file-url)
  * [Acknowledgements](#acknowledgements)
      * [Services](#services)
      * [Libraries](#libraries)        
      * [Functions](#functions)  
      * [Images](#images)

---

## Purpose

PageFossil exists for users that want to save web page content and attest to their view of it at a certain point in time.  Pagefossil helps them do this by saving web pages as images and recording the unique digital fingerprints of those images within the Bitcoin blockchain.

[[top]](#pagefossil-chrome-extension)

## Prior art

* [OpenScreenshot](https://github.com/AminaG/OpenScreenshot) - Edit, save the current page as image or PDF and share it

* [Full Page Screen Capture](https://github.com/mrcoles/full-page-screen-capture-chrome-extension) - Save the current page as an image, regardless of length

* [Blockai](https://github.com/blockai) - Record permanent and immutable copyrights of digital works on the blockchain

* [How to add QR codes to your photos](https://www.cnet.com/how-to/how-to-add-qr-codes-to-your-photos/#!) - Brute force method to append metadata

[[top]](#pagefossil-chrome-extension)

## Install

### Users

PageFossil is best installed directly from [Chrome's Web Store](https://chrome.google.com/webstore/detail/pagefossil/ilggmabmhaojeblhmhnkccpcbmjkbjbp).

### Developers

If you are developing with PageFossil, here are a couple to commands to help build it from source:

#### Production builds

      npm run build

#### Development builds

Debug messages in console + sourcemaps:

      npm run build-dev

Currently there's a Windows-only [bug](/../../issues/27) that breaks ``npm run build`` so at present it's best to use only ``build-dev`` on Windows.

#### Loading into Chrome

The Google Chrome web site provides the [steps for loading the extension into Chrome](https://developer.chrome.com/extensions/getstarted#unpacked) in Developer mode.

[[top]](#pagefossil-chrome-extension)

## Usage

Until you enable PageFossil's option labeled **Allow access to file URLs**, BROWSE and manual blockchain registration will remain disabled.  The popup should offer a link to help you enable this but you may also access this option by typing ``about:extensions`` into Chrome's location bar or navigating to it via Chrome's global nav menu, ``Window > Extensions``.

* CAPTURE **copies current web page to a canvas** ~ Displays the canvas in a new tab
* ADD NOTES **lets you enter some text** ~ Will be encoded in a [QR code](https://en.wikipedia.org/wiki/QR_code) at the bottom (max 256 chars) during SAVE
* _Click + drag_ **draws a highlight stroke on the canvas** 
* _Right click_ **lets you select a different highlight color**
* SAVE **stores the canvas as a PNG image** ~ Metadata is appended as a series of QR codes
* BROWSE **lets you review and queue images for blockchain registration**

[[top]](#pagefossil-chrome-extension)

## Tested platforms

| Platform | Operating system | Notes | Chrome Version |
| :------- | :--------------- | :---- | :------------- |
| Linux | Ubuntu 16.04 LTS | VirtualBox 4.4.0-31-generic | 54.0.2840.100 |
| Mac |OSX El Capitan Version 10.11.6 | Kernel Version Darwin 15.6.0 | 55.0.2883.75 |
| Windows | Windows 10 Enterprise Evaluation | Build 14393.rs1_release_inmarket.161102-0100 | 55.0.288.75 m |

[[top]](#pagefossil-chrome-extension)

## Blockchain option

To manually queue any saved page image for blockchain registration:

1. Click on its thumbnail to reveal image detail
1. Click the curved arrow (➦) in the upper right corner
1. Click **Queue for blockchain**

After a moment, blockchain status should update to **pending** and you'll have 30 minutes to make a bitcoin payment to the specified Bitcoin address.  

Shortly after that Bitcoin transaction is **confirmed**, local status for the page image will update accordingly and should link to the relevant Bitcoin transaction where your image hash should be stored after the transaction's [OP_RETURN opcode](https://en.bitcoin.it/wiki/OP_RETURN#Is_storing_data_in_the_blockchain_acceptable.3F). 

### Blockchain statuses

Blockchain registration statuses are queried and **updated every five minutes**.

* **none** - No blockchain activity in relation to this page
* **pending** - Image hash has been queued with [Proof of Existence](https://www.proofofexistence.com)
* **confirmed** - Image hash is registered on the Bitcoin blockchain 

Visit the extension's Options menu and locate the **Blockchain** section to alter registration queueing behavior:

#### Always queue

Cause every image to automatically queue for registration (set to **pending**).

#### Never queue

Disable all blockchain activity. 

[[top]](#pagefossil-chrome-extension)

## Symbolic links

By removing the default ``pagefossil`` subfolder and replacing it with an identically-named symbolic link to a folder residing at a [file hosting service](https://en.wikipedia.org/wiki/Comparison_of_file_hosting_services#File_hosting_services), images can be shared with anyone who also has access that hosted folder.   Here are two examples that all assume the extension has already been installed and that your Chrome download folder is ``~/Downloads``.

### Dropbox

    λ cd ~/Dropbox
    λ mkdir -p pagefossil
    λ rm -rf ~/Downloads/pagefossil
    λ cd ~/Downloads/
    λ ln -s ~/Dropbox/pagefossil/ .
    
### Google Drive

    λ cd ~/Google\ Drive
    λ mkdir -p pagefossil
    λ rm -rf ~/Downloads/pagefossil
    λ cd ~/Downloads/
    λ ln -s ~/Google\ Drive/pagefossil/ .

[[top]](#pagefossil-chrome-extension)

## Security

### Contact

Security Mail: labs@c2fo.com<br>
PGP key fingerprint: ````E838 B51C C63F 7ED6 0980 9535 4D46 5218 A674 6F81````<br> 
Keyserver: pgp.mit.edu<br> 

### File URL

BROWSE is enabled via the [file URI](https://en.wikipedia.org/wiki/File_URI_scheme) corresponding to your [Chrome downloads folder](https://support.google.com/chrome/answer/95759?co=GENIE.Platform%3DDesktop&hl=en).  Since your downloads folder can reside almost anywhere on your device, we scope a [wildcard permission](/build/manifest.json#L29) for local file access.  If you do not want to allow this permission but do want to continue to use PageFossil's page saving feature, leave _Allow access to file URLs_ unchecked.  Your images will still save as expected but as mentioned above you won't have access to BROWSE or per-image blockchain registration.

[[top]](#pagefossil-chrome-extension)

## Local cache

PageFossil uses local storage to cache the metadata read from QR codes and to track blockchain metadata.  If the extensions' local storage is deleted, page metadata will be reread and blockchain metadata will be recreated by resubmitting the relevant hashes to PoE.

## Acknowledgements

### Services 

* [Proof of Existence](https://proofofexistence.com) - [maraoz](https://twitter.com/maraoz)

### Libraries

* [base64-js](https://github.com/beatgammit/base64-js) - [beatgammit](http://beatgammit.github.io/)
* [grapheme-breaker](https://github.com/devongovett/grapheme-breaker) - [devongovett](http://badassjs.com/)
* [loglevel](https://github.com/pimterry/loglevel) - [pimterry](https://tim.fyi/)
* [Modal box](https://github.com/CristianDeveloper/modalbox) - [Cristian Marian](https://github.com/CristianDeveloper/)
* [PhotoSwipe](https://github.com/dimsemenov/PhotoSwipe) - [disemenov](http://dimsemenov.com/)
* [pica](https://github.com/nodeca/pica) - [nodeca](http://dev.nodeca.com/)
* [qrious](https://github.com/neocotic/qrious) - [neocotic](https://neocotic.com/)
* [QRScanJS](https://github.com/Jeija/QRScanJS) - [Jeija](https://github.com/Jeija)
* [SHA256](https://github.com/AndersLindman/SHA256) - [AndersLindman](https://github.com/AndersLindman/)

### Functions

* [_dataURItoBlob](http://stackoverflow.com/a/12300351) - [devnull69](http://stackoverflow.com/users/1030974/devnull69)
* [_detectZoom](http://stackoverflow.com/a/16091319) - [Jay](http://stackoverflow.com/users/265797/jay)
* [_fragmentText](https://github.com/rlemon/lememe/blob/alpha3/js/app.js#L25) - [Robert Lemon](https://github.com/rlemon)
* [_ordinalSuffix](http://stackoverflow.com/a/13627586) - [salman-a](http://stackoverflow.com/users/87015/salman-a)

### Images

* [Camera](https://commons.wikimedia.org/wiki/File:Crystal_128_camera.png) - [Everaldo Coelho](https://en.wikipedia.org/wiki/Everaldo_Coelho)
* [Clipboard](https://pixabay.com/en/paper-pencil-writing-stationery-312111/) - [Clkr Free Vector Images](https://pixabay.com/en/users/Clker-Free-Vector-Images-3736/)
* [Disk](https://pixabay.com/en/floppy-icons-rodentia-icons-save-1293738/) - [OpenClipart-Vectors](https://pixabay.com/en/users/OpenClipart-Vectors-30363/)
* [Fossil](https://pixabay.com/en/extinct-fossil-invertebrate-1296604/) - [OpenClipart-Vectors](https://pixabay.com/en/users/OpenClipart-Vectors-30363/)
* [Magnifying glass](https://pixabay.com/en/magnifying-glass-magnifier-glass-189254/) - [TheUjulala](https://pixabay.com/en/users/TheUjulala-59978/)
* [X](https://pixabay.com/en/cancel-icon-icons-matt-symbol-1294426/) - [OpenClipart-Vectors](https://pixabay.com/en/users/OpenClipart-Vectors-30363/)

[[top]](#pagefossil-chrome-extension)
