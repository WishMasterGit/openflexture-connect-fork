import { contextBridge, ipcRenderer, shell } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import ipaddr from 'ipaddr.js'
import { createBrowser, tcp } from './mdns/main.js'

let connectApi = {
  openExternal: (url) => shell.openExternal(url),
  foundHosts: {},
  availableHosts: {},
  bonjour: null,
  browser: null,
  getMicroscopes: function () {
    //this.browser.update()
    //this.browser.expire()
    this.availableHosts = { ...this.foundHosts }
    return this.availableHosts
  },
  findMicroscopes: function () {
    // set the browser to search for microscopes,
    var browser = createBrowser(tcp('openflexure'))
        browser.on('ready', function () {
      browser.discover()
    })

    browser.on(
      'update',
      function (data) {
        // We will be checking if it's a valid openflexure device
        var validDevice = false

        // Go through each type of the host, make valid if 'openflexure' appears
        data.type.forEach((element) => {
          if (element.name === 'openflexure') {
            validDevice = true
          }
        })
        if (typeof data.port !== 'undefined' && validDevice === true) {
          this.foundHosts[data.addresses[0]] = {
            hostname: data.addresses[0],
            name: `${data.host} on ${data.networkInterface}`,
            port: data.port
          }
        }
      }.bind(this)
    )
    /*this.bonjour = new Bonjour()
    this.browser = this.bonjour.find({
      type: 'openflexure',
      protocol: 'tcp'
    })
    this.browser.on('up', (service) => {
      if (typeof service.port !== 'undefined' && service.addresses.length > 0) {
        let address = service.referer?.address || service.addresses[0]
        this.foundHosts[address] = {
          hostname: service.host,
          name: `${service.host} on ${address}`,
          port: service.port
        }
      }
    })*/
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
