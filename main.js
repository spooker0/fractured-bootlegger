const {app, BrowserWindow, ipcMain, dialog} = require('electron');
const {autoUpdater} = require("electron-updater");
const pug = require('pug');
const storage = require('electron-json-storage');
const request = require('request');


let mainWindow, updateWindow;
let appPath = app.getAppPath();

async function createInstallWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        }
    });

    let params = {
        title: 'Launcher'
    };

    let html = pug.renderFile(appPath + '/views/launcher.pug', params);
    mainWindow.loadURL('data:text/html,' + encodeURIComponent(html), {
        baseURLForDataURL: `file://${appPath}/views/`
    });

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

    storage.get('cookie', function (error, data) {
        if (error)
            console.err(error);
        let cookie = data.login;

        let postData = {
            cookie: cookie
        };


        request.post('https://doublecolossus.com/autologin', {json: postData}, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                let params = {
                    title: 'Fractured Bootlegger',
                    udata: body
                };

                let html = pug.renderFile(appPath + '/views/home.pug', params);
                mainWindow.loadURL('data:text/html,' + encodeURIComponent(html), {
                    baseURLForDataURL: `file://${appPath}/views/`
                });
            } else {
                let params = {
                    title: 'Login'
                };

                let html = pug.renderFile(appPath + '/views/login.pug', params);
                mainWindow.loadURL('data:text/html,' + encodeURIComponent(html), {
                    baseURLForDataURL: `file://${appPath}/views/`
                });
            }
        });
    });


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

    let params = {
        title: 'Launcher'
    };

    let html = pug.renderFile(appPath + '/views/update.pug', params);
    updateWindow.loadURL('data:text/html,' + encodeURIComponent(html), {
        baseURLForDataURL: `file://${appPath}/views/`
    });

    updateWindow.removeMenu();

    updateWindow.on('closed', function () {
        updateWindow = null;
    });
}

app.on('ready', async () => {
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
    await createLoginWindow();
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