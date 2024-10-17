# add-date-to-photo-filenames

> Used to add dates to filenames of photos after the fact to match PhotoPrism's date custom config.

## What it does in a nutshell

```bash
$ ls folderA
IMG_0001.HEIC IMG_0002.HEIC IMG_0003.HEIC 2024-01-24_18-30-31_IMG_0004.HEIC
$ add-date-photo-names notdryrun ./folderA
Doing ./folderA
operation: move folderA/IMG_0001.HEIC ---to--- 2024-01-24_16-30-01_IMG_0001.HEIC
operation: move folderA/IMG_0002.HEIC ---to--- 2024-01-24_17-21-11_IMG_0002.HEIC
operation: move folderA/IMG_0002.HEIC ---to--- 2024-01-24_17-22-59_IMG_0002.HEIC
skipping as already done: 2024-01-24_18-30-31_IMG_0004.HEIC
Done with ./folderA
```

## Installation

```bash
# prerequisites: exiftool, nodejs >=18

# *clone repo, and cd into it*

npm install -g pkg
npm install

pkg -t node18 -o add-date-photo-names index.js
# for macos/linux
sudo mv add-date-photo-names /usr/local/bin
# for win
# note: untested on windows. use at your own risk
# follow instructions for adding folder to PATH in https://www.youtube.com/watch?v=9umV9jD6n80
# create folder C:\bin and add path to C:\bin
# move file "add-date-photo-names" to C:\bin

```

## Usage
```bash
add-date-photo-names [dryrun/notdryrun] /path/to/folder (debugfile.png)
# where dryrun will print out what it will do, but won't rename anything, folder is the folder of all the photos to be processed, and debugfile.png is path to a file for debugging erroneously renaming
```

## Notes

If exiftool can't find a suitable date, then it will default to using UTC time. You can see which ones have been modified this way by looking for "\_UTC\_" in DATE_TIME_UTC_imgfilename
