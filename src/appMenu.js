/* global __static */

const { app, shell, Menu, BrowserWindow } = require("electron");
const updater = require("electron-updater");
const autoUpdater = updater.autoUpdater;
const path = require("path");

const template = [
  {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { role: "delete" },
      { role: "selectall" }
    ]
  },
  {
    label: "View",
    submenu: [
      { role: "reload" },
      { role: "forcereload" },
      { role: "toggledevtools" },
      { type: "separator" },
      { role: "togglefullscreen" }
    ]
  },
  {
    role: "window",
    submenu: [
      { role: "minimize" },
      { role: "close" },
      { type: "separator" },
      {
        label: "Launch legacy mode",
        click() {
          let win = new BrowserWindow({
            width: 1200,
            height: 900,
            icon: path.join(__static, "icon.png"),
            webPreferences: {
              nodeIntegration: true
            }
          });
          win.setMenuBarVisibility(false);
          if (process.env.WEBPACK_DEV_SERVER_URL) {
            // Load the url of the dev server if in development mode
            win.loadURL(
              process.env.WEBPACK_DEV_SERVER_URL + "/legacy/ev-121/index.html"
            );
            if (!process.env.IS_TEST) win.webContents.openDevTools();
          } else {
            // Load the index.html when not in development
            win.loadURL("app://./legacy/ev-121/index.html");
          }
        }
      }
    ]
  },
  {
    role: "help",
    submenu: [
      {
        label: "Homepage",
        click() {
          shell.openExternal("https://openflexure.org");
        }
      },
      {
        label: "Report an issue",
        click() {
          shell.openExternal(
            "https://gitlab.com/openflexure/openflexure-connect/issues"
          );
        }
      },
      { type: "separator" },
      {
        label: "Check for Updates",
        click() {
          autoUpdater.checkForUpdates();
        }
      }
    ]
  }
];

if (process.platform === "darwin") {
  template.unshift({
    label: app.getName(),
    submenu: [
      { role: "about" },
      { type: "separator" },
      { role: "services" },
      { type: "separator" },
      { role: "hide" },
      { role: "hideothers" },
      { role: "unhide" },
      { type: "separator" },
      { role: "quit" }
    ]
  });

  // Edit menu
  template[1].submenu.push(
    { type: "separator" },
    {
      label: "Speech",
      submenu: [{ role: "startspeaking" }, { role: "stopspeaking" }]
    }
  );

  // Window menu
  template[3].submenu = [
    { role: "close" },
    { role: "minimize" },
    { role: "zoom" },
    { type: "separator" },
    { role: "front" }
  ];
} else {
  template.unshift({
    label: "File",
    submenu: [{ role: "quit" }]
  });
}

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
