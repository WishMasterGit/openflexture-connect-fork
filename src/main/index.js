import {  app, BrowserWindow, Menu, ipcMain, Tray, screen } from 'electron'
import { electronApp, is } from '@electron-toolkit/utils'
import { initUpdater } from './updater'
import icon from '../../public/icon.png?asset'
import path from 'path'
import fs from 'fs'

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
  process.exit(0)
}

class connectStore {
  constructor() {
    const userDataPath = app.getPath('userData')
    this.filePath = path.join(userDataPath, 'store.json')
    try {
      // Try to read the file and parse it as JSON
      this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'))
    } catch (error) {
      console.error(error)
      // If file read or parse fails, start with an empty object
      this.data = { hosts: {} }
    }
  }
  // Get a host from the store
  getHosts() {
    return this.data.hosts
  }
  // Save a host to the store
  saveHost(hostname, value) {
    this.data.hosts[hostname] = value
    this.save()
  }
  // Remove a host from the store
  removeHost(hostname) {
    delete this.data.hosts[hostname]
    this.save()
  }
  // Save the current state to disk
  save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data))
  }
}

let store = new connectStore()

// Map to track child windows by URL
const childWindows = new Map()



function createMainWindow() {
  // Create the main browser window to find microscopes.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    show: false,
    icon: icon,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  const mainMenuTemplate = [
    {
      label: 'File',
      submenu: [{ role: 'quit' }]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', accelerator: 'CmdOrCtrl+R' },
        { role: 'forceReload', accelerator: 'CmdOrCtrl+Shift+R' },
        { type: 'separator' },
        { role: 'toggleDevTools', accelerator: 'CmdOrCtrl+Shift+I' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About OpenFlexure Connect',
          click: () => {
            mainWindow.webContents.send('open-about-modal')
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(mainMenuTemplate)
  mainWindow.setMenu(menu)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })
  // Intercept the close event to minimize if child windows exist
  mainWindow.on('close', (event) => {
    // Check if there are any open child windows
    const openChildWindows = Array.from(childWindows.values()).some(
      (win) => !win.isDestroyed()
    );

    if (openChildWindows) {
      event.preventDefault(); // prevent the default close behavior
      mainWindow.hide(); // hide from screen
      mainWindow.setSkipTaskbar(true); // hide from taskbar/dock
      mainWindow.minimize();   // minimize instead of closing
    }
    else {
      app.quit();
    }
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  // Open a new window, if that URL doesn't already have a window open
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Check if a child window with this URL already exists
    if (childWindows.has(url)) {
      const existingWindow = childWindows.get(url);
      if (!existingWindow.isDestroyed()) {
        existingWindow.focus();
        return { action: 'deny' }; // prevent new window creation
      } else {
        childWindows.delete(url);
      }
    }

    // Create new child window for the URL
    const childWindow = new BrowserWindow({
      width: 1200,
      height: 900,
      icon: icon,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        sandbox: false,
      },
      parent: null,
      modal: false,
      show: false,
    });

    childWindow.loadURL(url);

    childWindow.once('ready-to-show', () => childWindow.show());

    // Remove from map when closed
    childWindow.on('closed', () => {
      childWindows.delete(url);

      // If main is hidden and no children remain, quit app
      const remainingChildren = Array.from(childWindows.values()).some(
        (win) => !win.isDestroyed()
      );

      if (!remainingChildren) {
        const mainWindow = BrowserWindow.getAllWindows().find(w => !w.isDestroyed());
        if (mainWindow && mainWindow.isVisible() === false) {
          app.quit();
        }
      }
    });

    // Set menu for child windows
    const childMenuTemplate = [
      {
        label: 'File',
        submenu: [{ role: 'close' }],
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload', accelerator: 'CmdOrCtrl+R' },
          { role: 'forceReload', accelerator: 'CmdOrCtrl+Shift+R' },
          { role: 'togglefullscreen', accelerator: 'F11', visible: false, acceleratorWorksWhenHidden : true },
          { type: 'separator' },
          { role: 'toggleDevTools', accelerator: 'CmdOrCtrl+Shift+I' },
        ]
      }
    ]

    const menu = Menu.buildFromTemplate(childMenuTemplate)
    childWindow.setMenu(menu)

    // Save reference
    childWindows.set(url, childWindow);

    // Prevent default window creation by Electron since this creates its own
    return { action: 'deny' };
  });

  return mainWindow;
}

let tray = null

app.on('second-instance', () => {
  const child = Array.from(childWindows.values()).find(w => !w.isDestroyed())

  if (child) {
    if (child.isMinimized()) child.restore()
    child.focus()
    return
  }

  const windows = BrowserWindow.getAllWindows()
  if (windows.length > 0) {
    const mainWindow = windows[0]
    mainWindow.setSkipTaskbar(false)
    mainWindow.show()
    mainWindow.focus()
  }
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron');


  ipcMain.on('saveHost', (event, hostData) => {
    store.saveHost(hostData.hostname, hostData);
  });

  ipcMain.on('removeHost', (event, hostname) => {
    store.removeHost(hostname);
  });

  ipcMain.handle('getHosts', () => store.getHosts());

  ipcMain.handle('get-app-info', () => {
    return {
      name: app.getName(),
      version: app.getVersion(),
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
      platform: process.platform
    }
  })

  ipcMain.on('close-about-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)

    if (win) {
      win.close()
    }
  })

  const mainWindow = createMainWindow();

  // Check for updates 2s after window opens
  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      initUpdater(mainWindow);
    }, 2000);
  });

  // Create tray icon
  tray = new Tray(icon); // Use your icon here

  const trayMenu = Menu.buildFromTemplate([
    {
      label: 'Show Main Window',
      click: () => {
        mainWindow.setSkipTaskbar(false); // show in taskbar/dock again
        mainWindow.show();
        mainWindow.focus();
      }
    },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(trayMenu);
  tray.setToolTip('OpenFlexureConnect');

  // Double-click tray icon to reopen main window
  tray.on('double-click', () => {
    mainWindow.setSkipTaskbar(false);
    mainWindow.show();
    mainWindow.focus();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});
