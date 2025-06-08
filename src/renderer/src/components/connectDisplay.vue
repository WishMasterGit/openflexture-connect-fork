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
          <div class="uk-width-medium">
              <button
                class="uk-button uk-button-default uk-form-small uk-margin-small uk-width-1-1"
                @click="reloadNearby()"
              >
                Refresh
              </button>
            </div>
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
            <div v-for="host in savedHostArray" :key="host.name">
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
import hostCard from "./connectComponents/hostCard.vue";
import axios from "axios";
import UIkit from "uikit";

// Export main app
export default {
  name: "ConnectDisplay",

  components: {
    hostCard
  },

  data: function() {
    return {
      localMode: true,
      hostname: "microscope.local",
      port: 5000,
      savedHosts: {},
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
    savedHostArray: function() {
      var hostnames = [];
      return Object.values(this.savedHosts);
    },
    manualIPValid: function() {
      const addr = ipaddr.isValid(this.hostname);
      return addr;
    }
  },

  // When savedHosts changes, serialise to JSON and save to localStorage
  watch: {
  },

  mounted() {
    this.foundHosts = window.api.getMicroscopes();
    window.api.getSavedHosts().then(response => {
      this.savedHosts = response;
    }).catch(e => {
      console.error(e);
    });
  },

  methods: {
    reloadNearby: async function() {
        window.api.findMicroscopes();
        await setTimeout(2000);
        this.foundHosts = window.api.getMicroscopes();
    },
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
        return window.api.buildHostURL(hostname, port);
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
      axios
        .get(`${selectedHostURL}/routes`)
        .finally(() => {
          UIkit.modal("#connecting-modal").hide();
        })
        .then(response => {
          // If the /api/v2 route is available
          if (Object.keys(response.data).includes("/api/v2/")) {
            window.open(selectedHostURL, 'modal');
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
          //this.modalError(error); // Let mixin handle error
          console.log(error);
        });
    },
    saveHost: function(host) {
      window.api.saveHost({hostname: host.hostname, port: host.port});
      window.api.getSavedHosts().then(response => {
        this.savedHosts = response;
      }).catch(e => {
        console.error(e);
      });
    },
    removeHost: function(host) {
      window.api.removeSavedHost(host.hostname);
      window.api.getSavedHosts().then(response => {
        this.savedHosts = response;
      }).catch(e => {
        console.error(e);
      });
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less"></style>
