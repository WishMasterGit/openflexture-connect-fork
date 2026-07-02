import { contextBridge, ipcRenderer, shell } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import ipaddr from 'ipaddr.js'
import { Bonjour } from 'bonjour-service';

let connectApi = {
  openExternal: (url) => shell.openExternal(url),
  foundHosts: {},
  availableHosts: {},
  bonjour: null,
  browser: null,
  getMicroscopes: function () {
    console.log("get")
    this.browser.update()
    this.availableHosts = { ...this.foundHosts }
    return this.availableHosts
  },
  findMicroscopes: function () {
    // set the browser to search for microscopes,
    this.bonjour = new Bonjour();
    this.browser = this.bonjour.find({
      type: 'openflexure',
      protocol: 'tcp'
    })
    this.browser.on('up', (service) => {
      if (typeof service.port !== 'undefined' && service.addresses.length > 0) {
        let address = service.referer?.address || service.addresses[0]
        console.log('up')
        console.log(service)
        this.foundHosts[address] = {
          hostname: service.host,
          name: `${service.host} on ${address}`,
          port: service.port
        }
      }
    })
    this.browser.on('down', (service) => {
      console.log('down')
      console.log(service)
    })
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
