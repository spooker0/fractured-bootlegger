const child_process = require('child_process');
const steam = require('./find-steam.js');

module.exports = function (callback) {
    steam((folder) => {
        let launchPath = '"' + folder.replace(/\\\\/g, "/") + '/spacegame/Binaries/Win64/Fractured Space.exe"';
        let guid = $('#hidden-guid').val();
        let username = $('#hidden-username').val();
        let host = ' -flhost=https://lifeline.returnvector.net';
        let langHotfix = ' -culture=en-GB';
        let launchCmd = 'set SteamAppId=310380 & ' + launchPath + host + ' -netid=' + guid + ' -nick=' + username + langHotfix;

        child_process.exec(launchCmd,
            (error, stdout, stderr) => {
                console.log(error);
                console.log(stdout);
                console.log(stderr);
            });


        let gameUpChecker = setInterval(() => {
            child_process.exec('tasklist', (error, stdout) => {
                let gameUp = stdout.indexOf('Fractured Space.exe') > -1;
                if (!gameUp || error) {
                    callback();
                    clearInterval(gameUpChecker);
                }
            });
        }, 5000);
    });
};