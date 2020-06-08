/* global __static */

const { app, shell, Menu, BrowserWindow } = require("electron");
const updater = require("electron-updater");
const autoUpdater = updater.autoUpdater;
const path = require("path");

const openAboutWindow = require("about-window").default;

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
        label: "About",
        click: () =>
          openAboutWindow({
            icon_path: path.join(__static, "icon.png"),
            about_page_dir: path.join(__static, "about"),
            package_json_dir: __dirname,
            use_version_info: true,
            homepage: "https://gitlab.com/openflexure/openflexure-connect",
            bug_report_url:
              "https://gitlab.com/openflexure/openflexure-connect/issues",
            license: "GNU General Public License v3.0"
          })
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
