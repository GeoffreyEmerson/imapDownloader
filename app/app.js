// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const { ipcRenderer } = require('electron');


document.getElementById('imap-form').setAttribute('style', 'display:show');
document.getElementById('btnSubmit').addEventListener('click', configBtnClick, false);
document.getElementById('btnBoxes').addEventListener('click', boxBtnClick, false);

const imapConfigFormElements = {
    user: document.getElementById('uniqueID'),
    password: document.getElementById('plainpassword'),
    host: document.getElementById('host'),
    port: document.getElementById('port'),
    tls: document.getElementById('tls'),
    button: document.getElementById('btnSubmit')
};

// set up messaging system to node service
function send(msgObj) {
    ipcRenderer.send('node-message', msgObj);
}

ipcRenderer.on('frontend-message', (event, msgObj) => {
    if (msgObj.msg === 'config-set'){
        console.log('--> msgObj :', msgObj);
        for (let field in imapConfigFormElements) {
            imapConfigFormElements[field].value = msgObj.data[field];
        }
        Object.keys(imapConfigFormElements).forEach(key => {
            imapConfigFormElements[key].setAttribute('disabled', true);
        });
        document.getElementById('btnBoxes').setAttribute('style', 'display:show');
    } else if (msgObj.msg === 'search-count'){
        const html = `<div>Matches found: ${msgObj.data} </div>`;
        document.getElementById('main-window').innerHTML = html;
    } else if (msgObj.msg === 'search-error'){
        const html = `<div>Error: ${msgObj.data} </div>`;
        document.getElementById('main-window').innerHTML = html;
    } else if(msgObj.msg === 'box-list'){
        const boxInputs = Object.entries(msgObj.data)
            .sort((a, b) => {
                if (a[1] === b[1]) return 0;
                if (a[1] < b[1]) return 1;
                return -1;
            })
            .reduce((acc,[box,count]) => {
                return acc += `<input type="radio" name="emailBox" value="${box}"> ${box}: ${count}<br>\n`;
            },'');
        const html = `
            <div>
                <h3>Select Email Box:</h3>
                <form id="boxSelectionForm">
                    ${boxInputs}
                </form>
            </div>`;
        document.getElementById('main-window').innerHTML = html;
    } else {
        console.log('--> msgObj :', msgObj);
    }
});

function configBtnClick() {
    const formValues = {
        user: document.getElementById('uniqueID').value,
        password: document.getElementById('plainpassword').value,
        host: document.getElementById('host').value,
        port: Number(document.getElementById('port').value),
        tls: Boolean(document.getElementById('tls').value),
    };

    send({method: 'setImapConfig', data: formValues});
}

function boxBtnClick() {
    document.getElementById('btnBoxes').setAttribute('disabled', true);

    send({method: 'getBoxList'});
}