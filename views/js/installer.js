const fs = require('fs');

// Launch imports
const electron = require("electron");
const steam = require('./find-steam.js');
const pJson = require('../../package.json');

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
    },
    {
        src: "results-script.js",
        dest: "spacegame/Content/UIResources/frontend/views/results/results-script.js"
    },
    {
        src: "hangar-script.js",
        dest: "spacegame/Content/UIResources/frontend/views/hangar/hangar-script.js"
    }
];

function replaceFiles(directory) {
    dataMapping.forEach((v) => {
        fs.copyFileSync("resources/data/" + v.src, directory + "/" + v.dest);
    });
}

function writeManifest(directory) {
    let manifestData = {
        version: pJson.version
    };
    fs.writeFileSync(directory + '/bootlegger.json', JSON.stringify(manifestData));
}

function readManifest(directory) {
    try {
        let manifestData = JSON.parse(fs.readFileSync(directory + '/bootlegger.json'));
        return manifestData.version;
    } catch (ex) {
        return "0";
    }
}

module.exports.install = function () {
    steam((folder) => {
        writeManifest(folder);
        replaceFiles(folder);
    });
};

module.exports.isInstalled = function (callback) {
    steam((folder) => {
        callback(pJson.version === readManifest(folder));
    });
};