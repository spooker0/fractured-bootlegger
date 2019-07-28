const {app, BrowserWindow, ipcMain, dialog} = require('electron');
const {autoUpdater} = require("electron-updater");
const electronPug = require('electron-pug');

let mainWindow, updateWindow;
let pug;

async function createInstallWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        }
    });

    mainWindow.loadFile('views/launcher/launcher.pug');

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

async function createLoginWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        }
    });

    mainWindow.loadFile('views/login/login.pug');

    // mainWindow.removeMenu();
    // mainWindow.webContents.openDevTools();
    // mainWindow.maximize();

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

async function createUpdateWindow() {
    updateWindow = new BrowserWindow({
        width: 500,
        height: 200,
        frame: false,
        resizable: false,
        webPreferences: {
            nodeIntegration: true
        }
    });

    updateWindow.loadFile('views/launcher/update.pug');

    updateWindow.removeMenu();

    updateWindow.on('closed', function () {
        updateWindow = null;
    });
}

app.on('ready', async () => {
    pug = await electronPug({pretty: true});
    await createUpdateWindow();
    autoUpdater.checkForUpdates();
});

autoUpdater.on('checking-for-update', () => {
    updateWindow.webContents.send('update', 'Checking for updates', '...');
});

autoUpdater.on('update-available', (info) => {
    updateWindow.webContents.send('update', 'Update found', '...');
});

autoUpdater.on('update-not-available', async (info) => {
    await createInstallWindow();
    updateWindow.close();
});

autoUpdater.on('error', (err) => {
    updateWindow.webContents.send('update', 'Error when updating', JSON.stringify(err));
});

autoUpdater.on('download-progress', (progress) => {
    let progressMsg = `Progress: ${progress.percent} (${progress.transferred} / ${progress.total})`;
    updateWindow.webContents.send('update', 'Downloading', progressMsg);
});

autoUpdater.on('update-downloaded', (info) => {
    autoUpdater.quitAndInstall();
});