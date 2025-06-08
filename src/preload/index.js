
import { contextBridge} from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import ipaddr  from 'ipaddr.js'
import mdns from 'mdns-js'

let connect_api = {
    foundHosts: {},
    getMicroscopes: function() {
        return this.foundHosts
    },
    findMicroscopes: function() {
        
        // Create a browser to search for 'openflexure' type services
        var browser = mdns.createBrowser(mdns.tcp("openflexure"));

        // Start discovering services when ready
        browser.on("ready", function() {
        browser.discover();
        });

        browser.on("update", function(data) {
            // We will be checking if it's a valid openflexure device
            var validDevice = false;
      
            // Go through each type of the host, make valid if 'openflexure' appears
            data.type.forEach(element => {
              if (element.name === "openflexure") {
                validDevice = true;
              }
            });
            if (typeof data.port !== "undefined" && validDevice === true) {
              
              this.foundHosts[data.addresses[0]] = {
                hostname: data.addresses[0],
                name: `${data.host} on ${data.networkInterface}`,
                port: data.port
              };
            }
          }.bind(this));
    },
    buildHostURL: function(hostname, port) {
        // IPv6-based URLs have to be wrapped in [] when specifying a port
        if (ipaddr.isValid(hostname)) {
          if (ipaddr.parse(hostname).kind() == "ipv6") {
            return `http://[${hostname}]:${port}`;
          }
        }
        return `http://${hostname}:${port}`;
    }
}
connect_api.findMicroscopes()



if (process.contextIsolated) {
    try {
      contextBridge.exposeInMainWorld('electron', electronAPI)
      contextBridge.exposeInMainWorld('api', connect_api)
    } catch (error) {
      console.error(error)
    }
  } else {
    window.electron = electronAPI
    window.api = connect_api
  }
