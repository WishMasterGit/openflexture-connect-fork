<template>
  <div class="connectDisplay uk-padding">
    <div id="connecting-modal" class="uk-flex-top" uk-modal="bg-close: false">
      <div
        class="uk-modal-dialog uk-width-auto uk-padding-small uk-modal-body uk-margin-auto-vertical"
      >
        <div class="uk-grid-match" uk-grid>
          <div uk-spinner></div>
          <h3>Connecting...</h3>
        </div>
      </div>
    </div>
    <!-- New connection card (connect locally/remotely) -->
    <div
      id="new-connection-card"
      class="uk-card uk-card-default uk-padding-remove uk-width-medium connect-card-align-top"
    >
      <div class="uk-card-body uk-padding-small">
        <form id="formConnectToHost" @submit.prevent>
          <div class="uk-form-controls uk-margin">
            <label
              ><input
                v-model="localMode"
                class="uk-radio"
                type="radio"
                name="radio_local"
                :value="true"
                checked
              />
              Connect locally</label
            ><br />
            <label
              ><input
                v-model="localMode"
                class="uk-radio"
                type="radio"
                name="radio_local"
                :value="false"
              />
              Connect remotely</label
            >
          </div>
          <div v-if="!localMode">
            <div class="uk-inline uk-width-1-1">
              <label class="uk-form-label" for="form-stacked-text">Host</label>
              <input
                v-model="hostname"
                class="uk-input uk-form-small"
                type="text"
              />
            </div>
            <label class="uk-form-label" for="form-stacked-text">Port</label>
            <div class="uk-form-controls">
              <input
                id="form-stacked-text"
                v-model="port"
                class="uk-input uk-form-small"
                type="number"
                value="5000"
              />
            </div>
          </div>
        </form>
      </div>

      <div class="uk-card-footer uk-padding-small">
        <button
          type="submit"
          form="formConnectToHost"
          class="uk-button uk-button-primary uk-form-small uk-float-right uk-width-1-1"
          @click="connectHost(getManualHost())"
        >
          Connect
        </button>

        <button
          class="uk-button uk-button-default uk-form-small uk-margin-small uk-width-1-1"
          @click="saveHost(getManualHost())"
        >
          Save
        </button>
      </div>
    </div>

    <!-- Nearby devices -->
    <ul uk-accordion="multiple: true; animation: false">
      <li id="nearby-connections-grid" class="uk-open">
        <a class="uk-accordion-title" href="#">Nearby devices</a>
        <div class="uk-accordion-content">
          <div class="uk-grid-medium uk-grid-match" uk-grid>
            <div v-for="host in foundHostArray" :key="host.name">
              <hostCard
                :name="host.name"
                :hostname="host.hostname"
                :port="host.port"
                :deletable="false"
                @connect="connectHost(host)"
                @save="saveHost(host)"
              ></hostCard>
            </div>
          </div>
        </div>
      </li>

      <!-- Saved devices -->
      <li id="saved-connections-grid" class="uk-open">
        <a class="uk-accordion-title" href="#">Saved devices</a>
        <div class="uk-accordion-content">
          <div class="uk-grid-medium uk-grid-match" uk-grid>
            <div v-for="host in savedHosts" :key="host.name">
              <hostCard
                :name="host.name"
                :hostname="host.hostname"
                :port="host.port"
                :hide-if-unavailable="false"
                :savable="false"
                @connect="connectHost(host)"
                @delete="removeHost(host)"
              ></hostCard>
            </div>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script>
/* global __static */

// Import mDNS package if running in Electron
var mdns = require("mdns-js");
const { BrowserWindow } = require("electron").remote;
const path = require("path");
const ipaddr = require("ipaddr.js");

import axios from "axios";
import UIkit from "uikit";
import remoteMenu from "../remoteMenu.js";
import hostCard from "./connectComponents/hostCard.vue";

// Export main app
export default {
  name: "ConnectDisplay",

  components: {
    hostCard
  },

  data: function() {
    return {
      localMode: true,
      hostname: "localhost",
      port: 5000,
      savedHosts: [],
      foundHosts: {}
    };
  },

  computed: {
    selectedHostURL: function() {
      return `http://${this.hostname}:${this.port}`;
    },
    foundHostArray: function() {
      return Object.values(this.foundHosts);
    },
    savedHostNames: function() {
      var hostnames = [];
      for (var host of this.savedHosts) {
        hostnames.push(host.hostname);
      }
      return hostnames;
    },
    manualIPValid: function() {
      const addr = ipaddr.isValid(this.hostname);
      return addr;
    }
  },

  // When savedHosts changes, serialise to JSON and save to localStorage
  watch: {
    savedHosts() {
      this.setLocalStorageObj("savedHosts", this.savedHosts);
    }
  },

  mounted() {
    // Try loading savedHosts from localStorage. If null, don't change.
    this.savedHosts = this.getLocalStorageObj("savedHosts") || this.savedHosts;

    // Handle mDNS browsing

    // TODO: Have this run periodically on a timer

    // Create a browser to search for 'openflexure' type services
    var browser = mdns.createBrowser(mdns.tcp("openflexure"));

    // Start discovering services when ready
    browser.on("ready", function() {
      browser.discover();
    });

    browser.on("update", data => {
      // We will be checking if it's a valid openflexure device
      var validDevice = false;

      // Go through each type of the host, make valid if 'openflexure' appears
      data.type.forEach(element => {
        //console.log(element);
        if (element.name === "openflexure") {
          validDevice = true;
        }
      });

      if (validDevice === true) {
        console.log(data);
      }

      if (typeof data.port !== "undefined" && validDevice === true) {
        var hostData = {
          hostname: data.addresses[0],
          name: `${data.host} on ${data.networkInterface}`,
          port: data.port
        };
        this.$set(this.foundHosts, hostData.hostname, hostData);
      }
    });
  },

  methods: {
    getManualHost: function() {
      // Get the currently selected host object from the manual connect box
      let hostname = this.hostname;
      let port = this.port;
      // Handle auto-local-connect
      if (this.localMode) {
        hostname = "localhost";
      }
      return { hostname: hostname, port: port };
    },

    buildHostURL: function(hostname, port) {
      // IPv6-based URLs have to be wrapped in [] when specifying a port
      if (ipaddr.isValid(hostname)) {
        if (ipaddr.parse(hostname).kind() == "ipv6") {
          return `http://[${hostname}]:${port}`;
        }
      }
      return `http://${hostname}:${port}`;
    },

    connectHost: function(host) {
      // Set the remote connect box values
      this.localMode = false;
      this.hostname = host.hostname;
      this.port = host.port;
      // Generate the host URL
      let selectedHostURL = this.buildHostURL(host.hostname, host.port);
      // Start the connecting spinner
      UIkit.modal("#connecting-modal").show();
      // TODO: Connecting spinner
      axios
        .get(`${selectedHostURL}/routes`)
        .finally(() => {
          UIkit.modal("#connecting-modal").hide();
        })
        .then(response => {
          // If the /api/v2 route is available
          if (Object.keys(response.data).includes("/api/v2/")) {
            console.log("API v2 available");
            let win = new BrowserWindow({
              width: 1200,
              height: 893,
              icon: path.join(__static, "icon.png")
            });
            win.setMenu(remoteMenu);
            win.loadURL(selectedHostURL);
          } else {
            // Error and no-connect if API v2 is missing
            var ApiVersionError = `Your microscope is running an old API version.\
            You must update your microscope software to continue.\
            <br><br>
            For API upgrades, burning the latest Raspbian-OpenFlexure to your SD card is recommended.\
            <br><br>
            <b>Downloads and instructions can be found <a target="_blank" href="https://openflexure.org/projects/microscope/install">here</a></b>`;
            this.modalDialog("API upgrade required", ApiVersionError);
          }
        })
        .catch(error => {
          this.modalError(error); // Let mixin handle error
        });
    },

    removeHost: function(host) {
      console.log(host);
      var index = this.savedHosts.indexOf(host);
      if (index > -1) {
        this.savedHosts.splice(index, 1);
      }
    },

    saveHost: function(host) {
      // Check if we already saved this host
      if (!this.savedHostNames.includes(host.hostname)) {
        // Generate the host URL
        let selectedHostURL = `http://${host.hostname}:${host.port}`;
        // URI to get hostname directly from settings
        var hostnameUri = `${selectedHostURL}/api/v2/instrument/settings/name`;
        axios
          .get(hostnameUri)
          .then(response => {
            // Get device name from response
            var deviceName = response.data;
            // We use unshift instead of push to add the entry to the beginning of the array
            this.savedHosts.unshift({
              name: deviceName,
              hostname: host.hostname,
              port: host.port
            });
          })
          .catch(error => {
            this.modalError(error); // Let mixin handle error
          });
      }
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less"></style>
