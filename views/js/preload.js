const {remote} = require('electron');
const installer = require('./installer.js');
const launcher = require('./launcher.js');

window.interop = {};
window.interop.isInstalled = installer.isInstalled;
window.interop.installFiles = installer.install;
window.interop.launchGame = launcher;