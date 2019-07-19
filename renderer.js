const electron = require("electron");
const dialog = electron.remote.dialog;
const path = require('path');
const fs = require('fs');
const registry = require('winreg');
const vdf = require("vdf");

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
        src: "startclient-original.bat",
        dest: "startclient-original.bat"
    },
    {
        src: "startgame-script.js",
        dest: "spacegame/Content/UIResources/frontend/views/startgame/startgame-script.js"
    },
    {
        src: "startgame-style.css",
        dest: "spacegame/Content/UIResources/frontend/views/startgame/startgame-style.css"
    }
];

let button = document.getElementById("pick-directory");
button.addEventListener("click", (el) => {
    findSteamFolder((folder) => {
        replaceFiles(folder.replace(/\\\\/g, "/"));
        button.textContent = "Installed files";
        button.classList.add("disabled");
    });
});

function replaceFiles(directory) {
    dataMapping.forEach((v) => {
        fs.copyFileSync("resources/data/" + v.src, directory + "/" + v.dest);
    });
}

function findSteamFolder(callback) {
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
