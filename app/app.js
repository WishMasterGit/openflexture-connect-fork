// Required packages
const electron = require("electron");
const { dialog } = require("electron");
const updater = require("electron-updater");
const autoUpdater = updater.autoUpdater;
const contextMenu = require("electron-context-menu");
const ProgressBar = require("electron-progressbar");
const path = require("path");

// Attach settings store
const { store } = require("./store");

function sendStatusToWindow(message) {
  console.log(message);
}

// Set up the app
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

// Set the window content
let url = `file://${path.join(__dirname, "/dist/index.html")}`;
let mainWindow;

// Set the application menu
require("./menu.js");

// Handle redrawing the mainWindow
let recreatingWindowInProgress = false;

function toggleCustomTitleBar() {
  // Mark window as being recreated, to prevent stopping the application
  recreatingWindowInProgress = true;

  // Invert the drawCustomTitleBar setting
  store.set("drawCustomTitleBar", !store.get("drawCustomTitleBar"));

  // Destroy old window
  mainWindow.destroy();
  // Create new window
  createWindow();

  // Mark window as no longer being recreated
  recreatingWindowInProgress = false;
}

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    frame: !store.get("drawCustomTitleBar"),
    width: 1200,
    height: 900,
    icon: path.join(__dirname, "/icons/png/64x64.png"),
    webPreferences: {
      nodeIntegration: true
    }
  });

  // Make a context menu
  contextMenu({
    showCopyImageAddress: true,
    showSaveImageAs: true,
    showInspectElement: false
  });

  // Load window contents
  mainWindow.loadURL(url);

  // Check for updates
  autoUpdater.checkForUpdates();

  // Emitted when the window is closed.
  mainWindow.on("closed", function() {
    mainWindow = null; // Dereference the window object
  });

  mainWindow.webContents.on("new-window", function(event, url) {
    event.preventDefault();
    electron.shell.openExternal(url);
  });
}

// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  createWindow();
});

// Quit when all windows are closed.
app.on("window-all-closed", function() {
  if (process.platform !== "darwin" && recreatingWindowInProgress != true) {
    app.quit();
  }
});

app.on("activate", function() {
  if (mainWindow === null) {
    createWindow();
  }
});

// Export toggleCustomTitleBar for use in ./menu.js
module.exports.toggleCustomTitleBar = toggleCustomTitleBar;
