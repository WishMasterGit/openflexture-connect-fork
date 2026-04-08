import { dialog } from 'electron'
import { autoUpdater } from 'electron-updater'

export function initUpdater(mainWindow) {
  autoUpdater.autoDownload = false

  autoUpdater.on('update-available', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update available',
      message: 'A new version of OpenFlexure Connect is available. Do you want to download it?',
      buttons: ['Yes', 'No']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate()
      }
    }).catch((err) => {
      console.error('Dialog error:', err)
    })
  })

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Install update',
      message: 'Update downloaded. Restart now to install?',
      buttons: ['Restart', 'Later']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall()
      }
    }).catch((err) => {
      console.error('Dialog error:', err)
    })
  })

  autoUpdater.checkForUpdates()
}
