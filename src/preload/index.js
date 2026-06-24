import { contextBridge, ipcRenderer, shell } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import ipaddr from 'ipaddr.js'
import bonjour from 'bonjour'

let connectApi = {
  openExternal: (url) => shell.openExternal(url),
  foundHosts: {},
  availableHosts: {},
  getMicroscopes: function () {
    this.availableHosts = { ...this.foundHosts }
    return this.availableHosts
  },
  findMicroscopes: function () {
    this.foundHosts = {}
    // Create a browser to search for 'openflexure' type services
    bonjour().find(
      {
        type: 'openflexure',
        protocol: 'tcp'
      },
      function (service) {
        if (typeof service.port !== 'undefined' && service.addresses.length > 0) {
          let address = service.referer?.address || service.addresses[0]
          this.foundHosts[address] = {
            hostname: service.host,
            name: `${service.host} on ${address}`,
            port: service.port
          }
        }
      }.bind(this)
    )
  },
  buildHostURL: function (hostname, port) {
    // IPv6-based URLs have to be wrapped in [] when specifying a port
    if (ipaddr.isValid(hostname)) {
      if (ipaddr.parse(hostname).kind() == 'ipv6') {
        return `http://[${hostname}]:${port}`
      }
    }
    return `http://${hostname}:${port}`
  },
  saveHost: (hostData) => ipcRenderer.send('saveHost', hostData),
  getSavedHosts: () => ipcRenderer.invoke('getHosts'),
  removeSavedHost: (hostname) => ipcRenderer.send('removeHost', hostname)
}
connectApi.findMicroscopes()

connectApi.getAppInfo = () => ipcRenderer.invoke('get-app-info')

connectApi.onOpenAboutModal = (callback) => ipcRenderer.on('open-about-modal', callback)

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', connectApi)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = connectApi
}
