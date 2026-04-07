import { dialog } from 'electron'
import { autoUpdater } from 'electron-updater'

export function initUpdater() {
  autoUpdater.autoDownload = false

  autoUpdater.on('update-available', async () => {
    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'Update available',
      message: 'A new version of OpenFlexure Connect is available. Do you want to download it?',
      buttons: ['Yes', 'No']
    })

    if (result.response === 0) {
      autoUpdater.downloadUpdate()
    }
  })

  autoUpdater.on('update-downloaded', async () => {
    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'Install update',
      message: 'Update downloaded. Restart now to install?',
      buttons: ['Restart', 'Later']
    })

    if (result.response === 0) {
      autoUpdater.quitAndInstall()
    }
  })

  autoUpdater.checkForUpdates()
}
