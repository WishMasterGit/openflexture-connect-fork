"use strict";
/* global __static */

import { app, protocol, BrowserWindow } from "electron";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import installExtension, { VUEJS_DEVTOOLS } from "electron-devtools-installer";
const contextMenu = require("electron-context-menu");
const { dialog } = require("electron");
const path = require("path");
const updater = require("electron-updater");
const autoUpdater = updater.autoUpdater;
const ProgressBar = require("electron-progressbar");
const isDevelopment = process.env.NODE_ENV !== "production";

// Make a context menu
contextMenu({
  showCopyImageAddress: true,
  showSaveImageAs: true,
  showInspectElement: false
});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

// Set the application menu
require("./appMenu.js");

// Auto upadater
autoUpdater.autoDownload = false;

autoUpdater.on("checking-for-update", function() {});

autoUpdater.on("update-available", function(info) {
  console.log("Update available." + info);
  dialog
    .showMessageBox(win, {
      type: "info",
      title: "Update available",
      message: "A new version of OpenFlexure Connect is available.",
      buttons: ["Download", "Later"]
    })
    .then(input => {
      if (input.response === 0) {
        console.log("Downloading update selected");
        handleDownloadUpdate();
      }
    })
    .catch(error => {
      console.log(error);
    });
});

// Download, with a progress bar
function handleDownloadUpdate() {
  console.log("Downloading update");
  var progressBar = new ProgressBar({
    indeterminate: false,
    text: "Downloading update...",
    detail: "Please wait...",
    browserWindow: {
      webPreferences: {
        // Use pluginOptions.nodeIntegration, leave this alone
        // See https://github.com/nklayman/vue-cli-plugin-electron-builder/blob/v2/docs/guide/configuration.md#node-integration for more info
        nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION
      }
    }
  });

  progressBar.on("ready", function() {
    autoUpdater.on("download-progress", function(info) {
      progressBar.value = info.percent;
      progressBar.detail = `${Math.floor(info.percent)}% ${info.bytesPerSecond /
        1000}kb/s`;
    });
    autoUpdater.on("update-downloaded", function() {
      progressBar.close();
    });
    autoUpdater.on("error", function() {
      progressBar.close();
    });
    autoUpdater.downloadUpdate();
  });
}

// Trigger update installation
autoUpdater.on("update-downloaded", function(info) {
  console.log("Update downloaded." + info);
  dialog
    .showMessageBox(win, {
      type: "info",
      title: "Update downloaded",
      message: "Please restart the application to apply the update.",
      buttons: ["Update", "Later"]
    })
    .then(input => {
      if (input.response === 0) {
        autoUpdater.quitAndInstall();
      }
    })
    .catch(error => {
      console.log(error);
    });
});

autoUpdater.on("update-not-available", function() {
  dialog.showMessageBox(win, {
    type: "info",
    title: "No updates available",
    message: "You are on the latest version of OpenFlexure Connect."
  });
});

autoUpdater.on("error", function() {
  dialog.showMessageBox(win, {
    type: "info",
    title: "Error checking for updates",
    message:
      "Error checking for updates. Make sure your device is connected to the internet."
  });
});

autoUpdater.on("download-progress", function(progressObj) {
  let log_message = "Download speed: " + progressObj.bytesPerSecond;
  log_message =
    log_message + " - Downloaded " + parseInt(progressObj.percent) + "%";
  log_message =
    log_message +
    " (" +
    progressObj.transferred +
    "/" +
    progressObj.total +
    ")";
  console.log(log_message);
});

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { secure: true, standard: true } }
]);

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 1200,
    height: 900,
    icon: path.join(__static, "icon.png"),
    webPreferences: {
      // Use pluginOptions.nodeIntegration, leave this alone
      // See https://github.com/nklayman/vue-cli-plugin-electron-builder/blob/v2/docs/guide/configuration.md#node-integration for more info
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
      enableRemoteModule: true
    }
  });

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    win.loadURL(process.env.WEBPACK_DEV_SERVER_URL);
  } else {
    createProtocol("app");
    // Load the index.html when not in development
    win.loadURL("app://./index.html");
  }

  win.on("closed", () => {
    win = null;
  });
}

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS_DEVTOOLS);
    } catch (e) {
      console.error("Vue Devtools failed to install:", e.toString());
    }
  }
  createWindow();
});

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === "win32") {
    process.on("message", data => {
      if (data === "graceful-exit") {
        app.quit();
      }
    });
  } else {
    process.on("SIGTERM", () => {
      app.quit();
    });
  }
}
