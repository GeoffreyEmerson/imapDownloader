// const fs = require('fs');
const Imap = require('imap');
// const Utimes = require('@ronomon/utimes');
// const simpleParser = require('mailparser').simpleParser;
// const homedir = require('os').homedir();

let imapSettings;
try {
    imapSettings = require('../defaults.json');
} catch (err) {
    console.log('No default imap settings found.');
}

module.exports = {
    setMainWindow,
    setImapConfig,
    getBoxList
};

let mainWindow;
let imapConnection;
let emailIdArray = null;
const boxContentCount = {};

function setMainWindow(_mainWindow) {
    mainWindow = _mainWindow;
    console.log('-- mainWindow set --');
    mainWindow.webContents.once('dom-ready', () => {
        if (imapSettings) setImapConfig(imapSettings);
    });
}

async function setImapConfig(data) {
    console.log('-- imap hit --');
    console.log('--> data :', data);
    imapConnection = new Imap(data);
    console.log('-- imapConnection created --');
    mainWindow.webContents.send('frontend-message', {msg: 'config-set', data}); // asynchronous message
}

function imapExecute(callback) {
    return new Promise((resolve,reject) => {
        imapConnection.once('ready', callback);
        imapConnection.once('error', (err) => {
            console.log('--> Imap Connection err :', err);
            reject(err);
        });
        imapConnection.once('end', () => {
            console.log('-- Connection ended --');
            resolve();
        });
        console.log('-- Starting Imap Connect --');
        imapConnection.connect();
    });
}

function getBoxList() {
    imapExecute(async () => {
        try {
            // Get box list and details from server
            const boxData = await imapGetBoxes();

            // Create object with box names as keys. This will later be populated with the number
            //  of emails in each box.
            Object.keys(boxData).forEach(box => {
                if (boxData[box].children && Object.keys(boxData[box].children).length > 0) {
                    Object.keys(boxData[box].children).forEach(child => {
                        boxContentCount[`${box}${boxData[box].delimiter}${child}`] = null;
                    });
                } else {
                    boxContentCount[`${box}`] = null;
                }
            });
            console.log('--> boxes before :', JSON.stringify(boxContentCount, null, 4));

            // Begin counting emails for each box
            // const boxList = Object.keys(boxContentCount);
            for (let box in boxContentCount) {
                await getCountForBox(box);
            }

            await getCountForBox(Object.keys(boxContentCount)[0]);

            console.log('--> boxes after :', JSON.stringify(boxContentCount, null, 4));
        } catch (err) {
            console.log('Error getting box list:', err);
            mainWindow.webContents.send('frontend-message', {msg: 'box-list-error', data: err}); // asynchronous message
        }

        // Box list and email count - close connection
        imapConnection.end();
    });
}

async function getCountForBox(box) {
    try {
        // const boxes = await imapGetBoxes();
        // console.log('--> boxes :', JSON.stringify(boxes, null, 4));
        console.log(`-- imapOpenBox ${box} --`);
        await imapOpenBox(box);
        console.log(`-- imapSearch ${box} --`);
        emailIdArray = await imapSearch(['ALL']);
        boxContentCount[box] = emailIdArray.length;
        mainWindow.webContents.send('frontend-message', {msg: 'box-list', data: boxContentCount}); // asynchronous message
    } catch (err) {
        console.log(`Error getting count for box "${box}":`, err);
        mainWindow.webContents.send('frontend-message', {msg: 'box-list-error', data: err}); // asynchronous message

    }
}

async function imapOpenBox(boxName) {
    return new Promise((resolve,reject) => {
        imapConnection.openBox(boxName, true, (err, boxInfo) => {
            if (err) reject(err);
            resolve(boxInfo);
        });
    });
}

async function imapSearch(filter) {
    return new Promise((resolve,reject) => {
        imapConnection.search(filter,(err,results) => {
            if (err) reject(err);
            resolve(results);
        });
    });
}

async function imapGetBoxes(nsPrefix) {
    return new Promise((resolve,reject) => {
        if (nsPrefix) {
            console.log('-- imapConnection.getBoxes 1 --');
            imapConnection.getBoxes(nsPrefix,(err,boxes) => {
                if (err) reject(err);
                resolve(boxes);
            });
        } else {
            console.log('-- imapConnection.getBoxes 1 --');
            imapConnection.getBoxes((err,boxes) => {
                if (err) reject(err);
                resolve(boxes);
            });
        }
    });
}

// async function imapMain() {
//     try {
//         // const boxes = await imapGetBoxes();
//         // console.log('--> boxes :', JSON.stringify(boxes, null, 4));
//         console.log('-- imapOpenBox --');
//         await imapOpenBox('[Gmail]/All Mail');
//         console.log('-- imapSearch --');
//         emailIdArray = await imapSearch(['ALL', ['SUBJECT', 'PagerDuty ALERT]']]);
//         imapConnection.end();
//     } catch (err) {
//         console.log('Error opening inbox:', err);
//         searchError = err;
//     }
// }

// function saveMessages(emailIdArray) {
//     const f = imapConnection.fetch(emailIdArray, { bodies: '' });

//     f.on('message', receiveMessage);

//     f.once('error', function (err) {
//         console.log('Fetch error: ' + err);
//     });

//     f.once('end', function () {
//         console.log('Done fetching all messages!');
//         imapConnection.end();
//     });
// }

// function receiveMessage(msg, seqno) {
//     const message = { info: [] };
//     msg.on('body', function (stream, info) {
//         console.log('Message #' + seqno + ' body segment recieved.');
//         message.stream = stream;
//         message.info.push(info);
//     });

//     msg.once('attributes', function (attrs) {
//         console.log('Message #' + seqno + ' Attributes received.');
//         message.attributes = attrs;
//     });

//     msg.once('end', async function() {
//         console.log('Message #' + seqno + ' Finished!');
//         await parseAndSave(message, seqno);
//     });
// }

// async function parseAndSave(message, seqno) {
//     try {
//         message.data = await simpleParser(message.stream);
//         delete message.stream;

//         if (message.data && message.data.headerLines) {
//             message.data.headerLines.forEach(headerLine => {
//                 message.data.headers[headerLine.key] = headerLine.line;
//             });
//             delete message.data.headerLines;
//         }

//         const fileName = homedir + '/mail_archive/msg-' + seqno + '.json';
//         const data = JSON.stringify(message, null, 4);
//         fs.writeFileSync(fileName, data);

//         // var btime = 447775200000; // 1984-03-10T14:00:00.000Z
//         // var mtime = undefined;
//         // var atime = undefined;
//         // Utimes.utimes(path, btime, mtime, atime, callback);

//     } catch (err) {
//         console.log(`Error parsing or saving Message #${seqno}:`, err);
//     }
// }


