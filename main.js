// Modules to control application life and create native browser window
const {app, BrowserWindow} = require('electron');
const path = require('path');
const {autoUpdater} = require("electron-updater");

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        }
    });

    // and load the index.html of the app.
    mainWindow.loadFile('index.html');

    // mainWindow.removeMenu();
    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', function () {
        mainWindow = null
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
    autoUpdater.checkForUpdates();
    // createWindow();
});

autoUpdater.on('update-not-available', (info) => {
    createWindow();
});

autoUpdater.on('update-downloaded', (info) => {
    autoUpdater.quitAndInstall();
});