import { app, BrowserWindow, Menu, ipcMain } from 'electron'
import { electronApp, is } from '@electron-toolkit/utils'
import icon from '../../public/icon.png?asset'
import path from 'path'
import fs from 'fs'

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

function createWindow() {
  // Create the browser window.
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
        { role: 'toggleDevTools', accelerator: 'CmdOrCtrl+Shift+I'}
      ]
    },
    { role: 'about' }
  ]

  const menu = Menu.buildFromTemplate(mainMenuTemplate)
  mainWindow.setMenu(menu)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.webContents.setWindowOpenHandler(() => {
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        width: 1200,
        height: 900,
        icon: icon
      }
    }
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  ipcMain.on('saveHost', (event, hostData) => {
    store.saveHost(hostData.hostname, hostData)
  })
  ipcMain.on('removeHost', (event, hostname) => {
    store.removeHost(hostname)
  })
  ipcMain.handle('getHosts', () => {
    return store.getHosts()
  })
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('browser-window-created', (e, win) => {
  const microscopeMenuTemplate = [
    {
      label: 'File',
      submenu: [{ role: 'close' }]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', accelerator: 'CmdOrCtrl+R' },
        { role: 'forceReload', accelerator: 'CmdOrCtrl+Shift+R' },
        { role: 'toggledevtools', accelerator: 'CmdOrCtrl+Shift+I'},
        { role: 'togglefullscreen', accelerator: 'F11', visible: false, acceleratorWorksWhenHidden : true },
      ]
    },
    { role: 'about' }
  ]

  const menu = Menu.buildFromTemplate(microscopeMenuTemplate)
  win.setMenu(menu)
})

app.setAboutPanelOptions({
  applicationName: 'OpenFlexureConnect',
  iconPath: icon,
  applicationVersion: app.getVersion(),
  //credits is for Windows and MacOS, authors for Linux
  credits: 'The OpenFlexure Project (openflexure.org)',
  authors: ['The OpenFlexure Project (openflexure.org)'],
  copyright: 'Distributed under the GNU GPL v3 license.'
})
