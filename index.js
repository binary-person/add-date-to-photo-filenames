const fs = require('fs');
const path = require('path');
const spawn = require('child_process').spawn;
const PromisePool = require('es6-promise-pool');

if ((process.argv[2] !== 'dryrun' && process.argv[2] !== 'notdryrun') || !process.argv[3]) {
  console.log('Usage: add-date-photo-names [dryrun/notdryrun] /path/to/folder (debugfile.png)');
  process.exit(1);
}

const mainFolder = process.argv[3];
const threads = 10;

// modified from npmjs.com/package/exiftool
function exiftool(filePath) {
  return new Promise((resolve, reject) => {
    const exif = spawn('exiftool', [filePath]);
    exif.on('error', function (err) {
      reject('Fatal Error: Unable to load exiftool. ' + err);
    });

    // Read the binary data back
    var response = '';
    var errorMessage = '';
    exif.stdout.on("data", function (data) {
      response += data;
    });

    // Read an error response back and deal with it.
    exif.stderr.on("data", function (data) {
      errorMessage += data.toString();
    });

    // Handle the response to the callback to hand the metadata back.
    exif.on("close", function () {
      if (errorMessage) {
        reject(errorMessage);
      }
      else {
        // Split the response into lines.
        response = response.split("\n");

        //For each line of the response extract the meta data into a nice associative array
        var metaData = [];
        response.forEach(function (responseLine) {
          var pieces = responseLine.split(": ");
          //Is this a line with a meta data pair on it?
          if (pieces.length == 2) {
            //Turn the plain text data key into a camel case key.
            var key = pieces[0].trim().split(' ').map(
              function (tokenInKey, tokenNumber) {
                if (tokenNumber === 0)
                  return tokenInKey.toLowerCase();
                else
                  return tokenInKey[0].toUpperCase() + tokenInKey.slice(1);
              }
            ).join('');
            //Trim the value associated with the key to make it nice.
            var value = pieces[1].trim();
            if (!isNaN(value)) {
              value = parseFloat(value, 10);
            }
            metaData[key] = value;
          }
        });
        resolve(metaData);
      }
    });
  });
}

async function getDateStr(filePath, debug = false) {
  const metadata = await exiftool(filePath);
  try {
    // dateCreated: '2024:09:05 18:00:09',
    // createDate: '0000:00:00 00:00:00',
    // creationDate: '2024:09:05 17:43:36-04:00',

    let dateStr = metadata['creationDate']?.split('-')[0].replace(/:/g, '-').replace(' ', '_')
      || metadata.createDate?.replace(/:/g, '-').replace(' ', '_').split('.')[0]
      || metadata.dateCreated?.replace(/:/g, '-').replace(' ', '_');

    if (debug) console.log(metadata);

    if (!dateStr || dateStr.includes('0000-00-00')) {
      const fsStat = fs.statSync(filePath);
      if (debug) console.log(fsStat);
      const p = num => num.toString().padStart(2, '0')
      const statTime = fsStat.mtime;
      return `${statTime.getUTCFullYear()}-${p(statTime.getUTCMonth() + 1)}-${p(statTime.getUTCDate())}_${p(statTime.getUTCHours())}-${p(statTime.getUTCMinutes())}-${p(statTime.getUTCSeconds())}_UTC`;
    }
    return dateStr;
  } catch (e) {
    console.log(metadata);
    return `filePath: ${filePath}\nunable to parse createDate:\n${e}`;
  }
}

async function eachInteration(folder, file) {
  const originalFile = file;
  if (await new Promise((resolve, reject) => fs.stat(path.join(folder, file), (err, stats) => {
    if (err) return reject(err);
    resolve(stats.isDirectory());
  }))) {
    console.log('Recursion into ' + path.join(folder, file));
    return main(path.join(folder, file));
  }
  const dateStr = await getDateStr(path.join(folder, file));

  // check if file already has date on it
  if (/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_/.test(file)) {
    // check if it matches ours
    if (!file.includes(dateStr)) {
      console.log(`
dateStr mismatch with already dated file.
our dateStr: ${dateStr}
file:        ${file}
full path:   ${path.join(folder, file)}\n`);
    } else {
      console.log('skipping as already done: ' + file);
    }
    return;
  }

  const newFileName = `${dateStr}_${file}`;
  console.log(`operation: move ${path.join(folder, originalFile)} ---to--- ${newFileName}`);
  if (process.argv[2] === 'notdryrun') {
    await new Promise((resolve, reject) => fs.rename(path.join(folder, originalFile), path.join(folder, newFileName), (err) => {
      if (err) return reject(err);
      resolve();
    }));
  }
}

async function main(folder) {
  if (process.argv[4]) {
    console.log(await getDateStr(process.argv[4], true));
    return;
  }

  console.log('Doing folder ' + folder);
  const pool = new PromisePool(function* () {
    for (const file of fs.readdirSync(folder)) {
      yield eachInteration(folder, file);
    }
  }, threads);
  await pool.start();
  console.log('Done with ' + folder);
}

main(mainFolder);
