const electron = require("electron");
const dialog = electron.remote.dialog;
const path = require('path');
const fs = require('fs');
const registry = require('winreg');
const vdf = require("vdf");
const find_process = require('find-process');
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

let launchButton = document.getElementById("launch-game");
launchButton.addEventListener("click", (el) => {
    findSteamFolder((folder) => {
        child_process.exec('"' + folder.replace(/\\\\/g, "/") + '/startclient-original.bat"', (error, stdout, stderr) => {
            console.log(error);
            console.log(stdout);
            console.log(stderr);
        });

        launchButton.textContent = "Game launched";
        launchButton.classList.add("disabled");

        let gameUpChecker = setInterval(() => {
            find_process('name', "Fractured Space.exe")
                .then(function (list) {
                    if (list.length === 0) {
                        launchButton.textContent = "2. Launch Game";
                        launchButton.classList.remove("disabled");
                        clearInterval(gameUpChecker);
                    }
                }, function (err) {
                    console.log(err.stack || err);
                })
        }, 5000);
    });
});

let installButton = document.getElementById("install-files");
installButton.addEventListener("click", (el) => {
    findSteamFolder((folder) => {
        replaceFiles(folder.replace(/\\\\/g, "/"));
        installButton.textContent = "Installed files";
        installButton.classList.add("disabled");
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
