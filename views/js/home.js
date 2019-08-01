const pug = require('pug');
const fs = require('fs');
const remote = require('electron').remote;
const storage = require('electron-json-storage');

// Launch imports
const electron = require("electron");
const path = require('path');
const registry = require('winreg');
const vdf = require("vdf");
const child_process = require('child_process');

const dataMapping = [
    {
        src: "Fractured Space.exe",
        dest: "spacegame/Binaries/Win64/Fractured Space.exe"
    },
    {
        src: "ClientConfig.json",
        dest: "spacegame/ClientConfig.json"
    },
    {
        src: "startgame-script.js",
        dest: "spacegame/Content/UIResources/frontend/views/startgame/startgame-script.js"
    },
    {
        src: "startgame-style.css",
        dest: "spacegame/Content/UIResources/frontend/views/startgame/startgame-style.css"
    },
    {
        src: "gamemodes-config.js",
        dest: "spacegame/Content/UIResources/frontend/views/gamemodes/gamemodes-config.js"
    },
    {
        src: "nsloctext.js",
        dest: "spacegame/Content/UIResources/frontend/data/translations/nsloctext.js"
    },
    {
        src: "BP.pak",
        dest: "spacegame/Content/Paks/BP.pak"
    }
];

$(document).ready(() => {
    let accountValidator = new AccountValidator();

    $('#account-form').ajaxForm({
        beforeSubmit: (formData) => {
            return accountValidator.validateForm();

        },
        success: (responseText, status) => {
            if (status === 'success') {
                let modalAlert = $('.modal-alert');
                modalAlert.modal({show: false, keyboard: true, backdrop: true});
                $('.modal-alert .modal-header h4').text('Success!');
                $('.modal-alert .modal-body p').html('Your account has been updated.');
                modalAlert.modal('show');
                $('.modal-alert button').off('click');
            }
        },
        error: error => {
            if (error.responseText === 'email-taken') {
                accountValidator.showInvalidEmail();
            } else if (error.responseText === 'username-taken') {
                accountValidator.showInvalidUserName();
            }
        }
    });
    $('#name-tf').focus();

    $('#account-form h2').text('Account Settings');
    $('#account-form #sub').text('Here are the current settings for your account.');
    let accountForm = $('#account-form-btn1');
    accountForm.html('Delete');
    accountForm.removeClass('btn-outline-dark');
    accountForm.addClass('btn-danger');
    $('#account-form-btn2').html('Update');
    $('#welcome-name').html('Welcome, ' + $('#userName').val());

    $('.modal-confirm').modal({show: false, keyboard: true, backdrop: true});
    $('.modal-confirm .modal-header h4').text('Delete Account');
    $('.modal-confirm .modal-body p').html('Are you sure you want to delete your account?');
    $('.modal-confirm .cancel').html('Cancel');

    let modalConfirmSubmit = $('.modal-confirm .submit');
    modalConfirmSubmit.html('Delete');
    modalConfirmSubmit.addClass('btn-danger');

    $('#btn-logout').click(() => {
        $.ajax({
            url: 'https://doublecolossus.com/logout',
            type: 'POST',
            data: {logout: true},
            success: data => {
                storage.set('cookie', {'login': ''}, function (error) {
                    if (error)
                        console.err(error);
                });

                showLockedAlert('You are now logged out.<br>Redirecting you back to the homepage.');
            },
            error: error => {
                console.log(error.responseText + ' :: ' + error.statusText);
            }
        });
    });

    accountForm.click(() => {
        $('.modal-confirm').modal('show')
    });

    modalConfirmSubmit.click(() => {
        $('.modal-confirm').modal('hide');
        $.ajax({
            url: 'https://doublecolossus.com/delete',
            type: 'POST',
            success: data => {
                showLockedAlert('Your account has been deleted.<br>Redirecting you back to the homepage.');
            },
            error: error => {
                console.log(error.responseText + ' :: ' + error.statusText);
            }
        });
    });

    let installButton = $('#install-files');
    installButton.click(() => {
        findSteamFolder((folder) => {
            replaceFiles(folder.replace(/\\\\/g, "/"));
            installButton.html('Reinstall');
        });
    });

    let launchButton = $('#launch-game');
    launchButton.click(() => {
        findSteamFolder((folder) => {
            let launchPath = '"' + folder.replace(/\\\\/g, "/") + '/spacegame/Binaries/Win64/Fractured Space.exe"';
            let guid = $('#guid').val();
            let username = $('#userName').val();
            let host = ' -flhost=https://lifeline.returnvector.net';
            let launchCmd = 'set SteamAppId=310380 & ' + launchPath + host + ' -netid=' + guid + ' -nick=' + username;

            console.log(launchCmd)
            child_process.exec(launchCmd,
                (error, stdout, stderr) => {
                    console.log(error);
                    console.log(stdout);
                    console.log(stderr);
                });

            launchButton.html('Playing');
            launchButton.addClass("disabled");

            let gameUpChecker = setInterval(() => {
                child_process.exec('tasklist', (error, stdout) => {
                    let gameUp = stdout.indexOf('Fractured Space.exe') > -1;
                    if (!gameUp || error) {
                        launchButton.html('Play');
                        launchButton.removeClass("disabled");
                        clearInterval(gameUpChecker);
                    }
                });
            }, 5000);

        });
    });


});

function showLockedAlert(message) {
    let modalAlert = $('.modal-alert');
    modalAlert.modal({show: false, keyboard: false, backdrop: 'static'});
    $('.modal-alert .modal-header h4').text('Success!');
    $('.modal-alert .modal-body p').html(message);
    modalAlert.modal('show');
    $('.modal-alert button').click(function () {
        sendToRoot();
    });
    setTimeout(sendToRoot, 3000);

}

function sendToRoot() {
    let params = {
        title: 'Login'
    };

    let appPath = remote.app.getAppPath();
    let html = pug.renderFile(appPath + '/views/login.pug', params);
    remote.getCurrentWindow().loadURL('data:text/html,' + encodeURIComponent(html), {
        baseURLForDataURL: `file://${appPath}/views/`
    });
}

function replaceFiles(directory) {
    dataMapping.forEach((v) => {
        fs.copyFileSync("resources/data/" + v.src, directory + "/" + v.dest);
    });
}

function findSteamFolder(callback) {
    if (fs.existsSync("Space")) {
        callback("Space");
        return;
    }

    let regKey = new registry({
        hive: registry.HKLM,
        key: '\\SOFTWARE\\Wow6432Node\\Valve\\Steam'
    });

    regKey.values((err, items) => {
        let steamPath = items.filter((item) => {
            return item.name === "InstallPath"
        })[0].value;

        let steamappsPath = steamPath + "/steamapps";

        let matchMainFolder = matchAppManifest(steamappsPath, callback);
        if (matchMainFolder) {
            return;
        }

        let libraryFolders = fs.readFileSync(steamappsPath + "/libraryfolders.vdf", "utf8");
        let vdfResult = vdf.parse(libraryFolders);
        let steamOtherFolders = [];
        for (let i = 1; true; i++) {
            let steamFolder = vdfResult.LibraryFolders[i];
            if (steamFolder) {
                steamOtherFolders.push(steamFolder + "/steamapps");
            } else {
                break;
            }
        }

        for (let i = 0; i < steamOtherFolders.length; i++) {
            let matchFolder = matchAppManifest(steamOtherFolders[i], callback);
            if (matchFolder) {
                return;
            }
        }
    });
}

function matchAppManifest(steamappsPath, callback) {
    const appManifestString = "appmanifest_310380.acf";
    try {
        let appManifests = fs.readdirSync(steamappsPath);

        appManifests.forEach(function (file) {
            if (file === appManifestString) {
                callback(steamappsPath + "/common/Space");
                return true;
            }
        });
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log('Dir not found: ' + err);
        } else {
            throw err;
        }
    }

    return false;
}