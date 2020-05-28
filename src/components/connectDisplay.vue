<template>
  <div class="connectDisplay uk-padding uk-padding-remove-left">
    <div
      uk-grid
      class="uk-height-1-1 uk-margin-remove uk-padding-remove uk-flex-column"
      margin="0"
    >
      <div class="uk-width-auto">
        <div
          id="new-connection-card"
          class="uk-card uk-card-default uk-padding-remove uk-width-medium connect-card-align-top"
        >
          <div class="uk-card-body uk-padding-small">
            <form id="formConnectToHost" @submit.prevent="handleSubmit">
              <div class="uk-form-controls uk-margin">
                <label
                  ><input
                    v-model="computedLocalMode"
                    class="uk-radio"
                    type="radio"
                    name="radio_local"
                    :value="true"
                  />
                  Connect locally</label
                ><br />
                <label
                  ><input
                    v-model="computedLocalMode"
                    class="uk-radio"
                    type="radio"
                    name="radio_local"
                    :value="false"
                    checked
                  />
                  Connect remotely</label
                >
              </div>
              <div v-if="!localMode">
                <div class="uk-inline uk-width-1-1">
                  <span class="uk-form-icon"
                    ><i class="material-icons">dns</i></span
                  >
                  <input
                    v-model="hostname"
                    class="uk-input uk-form-small"
                    type="text"
                    placeholder="Hostname or IP address"
                  />
                </div>
                <label class="uk-form-label" for="form-stacked-text"
                  >Port</label
                >
                <div class="uk-form-controls">
                  <input
                    id="form-stacked-text"
                    v-model="computedPort"
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
              class="uk-button uk-button-primary uk-form-small uk-float-right uk-margin uk-margin-remove-top uk-width-1-1"
              @click="handleSubmit"
            >
              Connect
            </button>

            <button
              class="uk-button uk-button-default uk-form-small uk-margin-small uk-width-1-1"
              @click="saveHost()"
            >
              Save Current
            </button>
          </div>
        </div>
      </div>

      <div class="uk-width-expand">
        <ul uk-accordion="multiple: true; animation: false">
          <li id="nearby-connections-grid" class="uk-open">
            <a class="uk-accordion-title" href="#">Nearby devices</a>
            <div class="uk-accordion-content">
              <div class="uk-grid-medium uk-grid-match uk-margin-top" uk-grid>
                <div v-for="host in foundHostArray" :key="host.name">
                  <hostCard
                    :name="host.name"
                    :hostname="host.hostname"
                    :port="host.port"
                    :deletable="false"
                    @connect="handleConnectButton(host)"
                  ></hostCard>
                </div>
              </div>
            </div>
          </li>

          <li id="saved-connections-grid" class="uk-open">
            <a class="uk-accordion-title" href="#">Saved devices</a>
            <div class="uk-accordion-content">
              <div class="uk-grid-medium uk-grid-match uk-margin-top" uk-grid>
                <div v-for="host in savedHosts" :key="host.name">
                  <hostCard
                    :name="host.name"
                    :hostname="host.hostname"
                    :port="host.port"
                    @connect="handleConnectButton(host)"
                    @delete="delSavedHost(host)"
                  ></hostCard>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
// Import mDNS package if running in Electron
var mdns = require("mdns-js");

import axios from "axios";

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
      hostname: "",
      port: 5000,
      selectedHost: "",
      savedHosts: [],
      foundHosts: {}
    };
  },

  computed: {
    foundHostArray: function() {
      return Object.values(this.foundHosts);
    },

    computedLocalMode: {
      get: function() {
        return this.localMode;
      },
      set: function(state) {
        this.localMode = state;
      }
    },

    computedPort: {
      get: function() {
        if (this.hostname.includes(":")) {
          var port = parseInt(this.hostname.split(":")[1]);
          return !isNaN(port) ? port : this.port;
        } else {
          return this.port;
        }
      },
      set: function(newPort) {
        this.port = newPort;
        if (this.hostname.includes(":")) {
          this.hostname = this.hostname.split(":")[0] + ":" + this.port;
        }
      }
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
    if (mdns) {
      // TODO: Have this run periodically on a timer

      // Create a browser to search for 'openflexure' type services
      var browser = mdns.createBrowser(mdns.tcp("openflexure"));

      // Start discovering services when ready
      browser.on("ready", function() {
        browser.discover();
      });

      browser.on("update", data => {
        console.log(data);

        // We will be checking if it's a valid openflexure device
        var validDevice = false;

        // Go through each type of the host, make valid if 'openflexure' appears
        data.type.forEach(element => {
          console.log(element);
          if (element.name === "openflexure") {
            validDevice = true;
          }
        });

        var hostData = {
          hostname: data.addresses[0],
          name: `${data.host} on ${data.networkInterface}`,
          port: data.port
        };

        if (typeof data.port !== "undefined" && validDevice === true) {
          this.$set(this.foundHosts, hostData.hostname, hostData);
        }

        console.log(this.foundHosts);
      });
    }
  },

  methods: {
    connectToHost: function(host) {
      console.log(host);
      // Set the global form values
      this.hostname = host.hostname;
      this.port = host.port;

      // Try to get list of available routes
      axios
        .get(`${this.selectedHost}/routes`)
        .then(response => {
          console.log(response.data);
          // If the /api/v2 route is available
          if (Object.keys(response.data).includes("/api/v2/")) {
            console.log("API v2 available");
            // Check client and server match
            this.checkServerVersion();
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

    handleSubmit: function() {
      // Split host and port if needed
      if (this.hostname.includes(":")) {
        this.port = this.computedPort;
        this.hostname = this.hostname.split(":")[0];
      }

      // Handle auto-local-connect
      var hostname;
      if (this.localMode) {
        hostname = "localhost";
      } else {
        hostname = this.hostname;
      }

      var selectedHost = {
        hostname: hostname,
        port: this.port
      };

      this.connectToHost(selectedHost);
    },

    handleConnectButton: function(host) {
      this.computedLocalMode = false;
      this.connectToHost(host);
    },

    checkServerVersion: function() {
      var versionUri = `${this.selectedHost}/api/v2/instrument/configuration/application/version`;
      axios
        .get(versionUri)
        .then(response => {
          var serverVersion = response.data;
          var clientVersion = process.env.PACKAGE.version;
          var clientVersionMajor = clientVersion.substring(0, 3);
          console.log(clientVersionMajor);

          if (serverVersion != undefined) {
            var serverVersionMajor = serverVersion.substring(0, 3);
          }
          console.log(serverVersionMajor);

          if (
            serverVersion == undefined ||
            serverVersionMajor != clientVersionMajor
          ) {
            var versionWarning = `Client and microscope versions do not match.\
            Please update your microscope software.\
            <b>Client version:</b> ${clientVersion}<br> \
            <b>Server version:</b> ${serverVersion}<br><br>`;
            if (serverVersion < 1.1) {
              versionWarning =
                versionWarning +
                "You will need to install a newer server version on a clean SD card.";
            } else {
              versionWarning =
                versionWarning +
                "Run <b><tt>ofm update</tt></b> and then <b><tt>ofm upgrade</tt></b> on your microscope.";
            }
            this.modalDialog("Version mismatch", versionWarning);
          }
        })
        .catch(error => {
          this.modalError(error); // Let mixin handle error
        });
    },

    delSavedHost: function(host) {
      console.log(host);
      var index = this.savedHosts.indexOf(host);
      if (index > -1) {
        this.savedHosts.splice(index, 1);
      }
    },

    saveHost: function() {
      // URI to get hostname directly from settings
      var hostnameUri = `${this.selectedHost}/api/v2/instrument/settings/name`;
      axios
        .get(hostnameUri)
        .then(response => {
          // Get device name from response
          var deviceName = response.data;
          // We use unshift instead of push to add the entry to the beginning of the array
          this.savedHosts.unshift({
            name: deviceName,
            hostname: this.$store.state.host,
            port: this.$store.state.port
          });
        })
        .catch(error => {
          this.modalError(error); // Let mixin handle error
        });
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less"></style>
