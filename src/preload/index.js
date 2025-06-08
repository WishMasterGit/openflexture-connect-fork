import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import ipaddr from 'ipaddr.js'
import mdns from 'mdns-js'

let connectApi = {
  foundHosts: {},
  availableHosts: {},
  getMicroscopes: function () {
    this.availableHosts = { ...this.foundHosts }
    return this.availableHosts
  },
  findMicroscopes: function () {
    this.foundHosts = {}
    // Create a browser to search for 'openflexure' type services
    var browser = mdns.createBrowser(mdns.tcp('openflexure'))

    // Start discovering services when ready
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
