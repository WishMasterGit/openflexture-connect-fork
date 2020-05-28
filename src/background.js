"use strict";

import { app, protocol, BrowserWindow } from "electron";
import {
  createProtocol,
  installVueDevtools
} from "vue-cli-plugin-electron-builder/lib";
const { dialog } = require("electron");
const path = require("path");
const updater = require("electron-updater");
const autoUpdater = updater.autoUpdater;
const ProgressBar = require("electron-progressbar");
const isDevelopment = process.env.NODE_ENV !== "production";

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

// Set the application menu
require("./menu.js");

// Auto upadater
autoUpdater.autoDownload = false;

autoUpdater.on("checking-for-update", function() {});

autoUpdater.on("update-available", function(info) {
  console.log("Update available." + info);
  dialog.showMessageBox(
    win,
    {
      type: "info",
      title: "Update available",
      message: "A new version of OpenFlexure eV is available.",
      buttons: ["Download", "Later"]
    },
    buttonIndex => {
      if (buttonIndex === 0) {
        console.log("Downloading update selected");
        handleDownloadUpdate();
      }
    }
  );
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
        nodeIntegration: true
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
  dialog.showMessageBox(
    win,
    {
      type: "info",
      title: "Update downloaded",
      message: "Please restart the application to apply the update.",
      buttons: ["Update", "Later"]
    },
    buttonIndex => {
      if (buttonIndex === 0) {
        autoUpdater.quitAndInstall();
      }
    }
  );
});

autoUpdater.on("update-not-available", function() {
  console.log("Update not available.");
});

autoUpdater.on("error", function() {
  console.log("Error in auto-updater.");
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
    icon: path.join(__dirname, "/icons/png/64x64.png"),
    webPreferences: {
      nodeIntegration: true
    }
  });

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    win.loadURL(process.env.WEBPACK_DEV_SERVER_URL);
    if (!process.env.IS_TEST) win.webContents.openDevTools();
  } else {
    createProtocol("app");
    // Load the index.html when not in development
    win.loadURL("app://./index.html");
    // Check for updates when not in development
    autoUpdater.checkForUpdates();
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
    // Devtools extensions are broken in Electron 6.0.0 and greater
    // See https://github.com/nklayman/vue-cli-plugin-electron-builder/issues/378 for more info
    // Electron will not launch with Devtools extensions installed on Windows 10 with dark mode
    // If you are not using Windows 10 dark mode, you may uncomment these lines
    // In addition, if the linked issue is closed, you can upgrade electron and uncomment these lines
    try {
      await installVueDevtools();
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
