<template>
  <div
    v-show="shouldShow"
    class="hostCard uk-card uk-card-default uk-padding-remove uk-width-medium"
  >
    <div class="uk-card-media-top">
      <div class="snapshot-container uk-width-1-1 uk-height-auto">
        <img
          v-show="snapshotAvailable"
          class="uk-width-1-1"
          :data-src="snapshotSrc"
          :src="snapshotSrc"
          width="300"
          height="225"
        />
        <div
          v-show="!snapshotAvailable"
          class="uk-position-cover uk-flex uk-flex-center uk-flex-middle"
        >
          Snapshot unavailable
        </div>
      </div>
    </div>

    <div class="uk-card-body uk-padding-small">
      <div
        class="uk-margin-small uk-margin-remove-left uk-margin-remove-right uk-flex uk-flex-middle"
      >
        <div class="uk-width-expand host-description">
          <div class="host-description">
            <b>{{ name }}</b>
          </div>
          <div class="host-description">{{ hostname }}:{{ port }}</div>
        </div>
      </div>
    </div>

    <div class="uk-card-footer uk-padding-small">
      <button
        class="uk-button uk-button-primary uk-form-small uk-margin-small-bottom uk-width-1-1"
        @click="$emit('connect')"
      >
        Connect
      </button>
      <button
        v-if="deletable"
        class="uk-button uk-button-danger uk-form-small uk-margin-small-bottom uk-width-1-1"
        @click="$emit('delete')"
      >
        Remove
      </button>
      <button
        v-if="savable"
        class="uk-button uk-button-default uk-form-small uk-margin-small-bottom uk-width-1-1"
        @click="$emit('save')"
      >
        Save
      </button>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

// Export main app
export default {
  name: 'HostCard',
  props: {
    name: {
      type: String,
      required: true
    },
    hostname: {
      type: String,
      required: true
    },
    port: {
      type: Number,
      required: true
    },
    deletable: {
      type: Boolean,
      required: false,
      default: true
    },
    savable: {
      type: Boolean,
      required: false,
      default: true
    },
    hideIfUnavailable: {
      type: Boolean,
      required: false,
      default: true
    }
  },
  emits: ['connect', 'delete', 'save', 'available', 'unavailable'],
  data: function () {
    return {
      snapshotRule: '/api/v2/streams/snapshot',
      snapshotSrc: '',
      snapshotAvailable: false,
      polling: null
    }
  },

  computed: {
    routesURL: function () {
      return `http://${this.hostname}:${this.port}/routes`
    },
    snapshotURL: function () {
      return `http://${this.hostname}:${this.port}${this.snapshotRule}`
    },
    shouldShow: function () {
      if (this.hideIfUnavailable && !this.snapshotAvailable) {
        return false
      } else {
        return true
      }
    }
  },

  mounted() {
    // Try to load the microscope snapshot when mounted
    this.checkSnapshotAvailable()
  },

  beforeUnmount() {
    // Clear the polling timer
    if (this.polling !== null) {
      clearInterval(this.polling)
    }
  },

  methods: {
    checkSnapshotAvailable: function () {
      // Fetches the list of routes from the host, and starts
      // a snapshot timer if the snapshot route is available

      // Send tag request
      axios
        .get(this.routesURL)
        .then((response) => {
          // If the host has a snapshot route available
          if (this.snapshotRule in response.data) {
            // Tell the view that a snapshot is available
            this.setAvailability(true)
            // Update the snapshot URL
            this.updateSnapshotURL()
            // If not already polling, start polling
            if (this.polling === null) {
              this.updateSnapshotPoll()
            }
          }
        })
        .catch(() => {
          // Tell the view that a snapshot is not available, and ignore
          this.setAvailability(false)
        })
    },

    updateSnapshotURL: function () {
      // Set the snapshot image src to the snapshot URL,
      // adding a timestamp argument to act as a cache-breaker
      var candidatesnapshotSrc = `${this.snapshotURL}?${Date.now()}`

      axios
        .head(candidatesnapshotSrc)
        .then(() => {
          this.setAvailability(true)
          this.snapshotSrc = candidatesnapshotSrc
        })
        .catch(() => {
          console.log('Snapshot unavailable')
          this.setAvailability(false)
        })
    },

    updateSnapshotPoll: function () {
      // Start a timer to call updateSnapshotURL periodically
      this.polling = setInterval(() => {
        this.updateSnapshotURL()
      }, 15000)
    },

    setAvailability: function (availability) {
      this.snapshotAvailable = availability
      if (availability === true) {
        this.$emit('available')
      } else {
        this.$emit('unavailable')
      }
    }
  }
}
</script>

<style>
.host-description {
  text-overflow: ellipsis;
  overflow: hidden;
}

.snapshot-container {
  position: relative;
  width: 300px;
  height: 225px;
}

img[data-src][src*='data:image'] {
  background: rgba(127, 127, 127, 0.1);
}
</style>
