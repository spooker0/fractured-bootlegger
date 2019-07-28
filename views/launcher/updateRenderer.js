const ipcRenderer = require('electron').ipcRenderer;

ipcRenderer.on('update', (event, message, details) => {
    document.querySelector('h1').innerHTML = message;
    document.querySelector('h4').innerHTML = details;
});
