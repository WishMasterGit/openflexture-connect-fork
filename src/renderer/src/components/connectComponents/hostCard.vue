<template>
  <div class="hostCard uk-card uk-card-default uk-padding-remove uk-width-medium">
    <div class="uk-card-media-top">
      <div class="snapshot-container uk-width-1-1 uk-height-auto">
        <img
          class="uk-width-1-1"
          :data-src="snapshotSrc"
          :src="snapshotSrc"
          width="300"
          height="225"
          @error="useFallbackImage"
        />
      </div>
    </div>

    <div class="uk-card-body uk-padding-small">
      <div
        class="uk-margin-small uk-margin-remove-left uk-margin-remove-right uk-flex uk-flex-middle"
      >
        <div class="uk-width-expand host-description">
          <div v-if="errorMessage" class="host-error">{{ errorMessage }}</div>
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
        {{ connectMessage }}
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
import logo from '../../assets/error.png'

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
    }
  },
  emits: ['connect', 'delete', 'save', 'available', 'unavailable'],
  data: function () {
    return {
      snapshotSrc: undefined,
      apiType: undefined,
      polling: null,
      errorInfo: undefined
    }
  },

  computed: {
    hostURL() {
      return `http://${this.hostname}:${this.port}`
    },
    errorMessage() {
      if (this.errorInfo) return this.errorInfo
      if (this.snapshotSrc !== logo) return null
      return 'Snapshot unavailable'
    },
    connectMessage() {
      if (this.apiType === 'v3-fallback') return 'View Details'
      return 'Connect'
    }
  },

  mounted() {
    this.checkAPI()
    this.polling = setInterval(() => {
      this.checkAPI()
    }, 15000)
  },

  beforeUnmount() {
    // Clear the polling timer
    if (this.polling !== null) {
      clearInterval(this.polling)
    }
  },

  methods: {
    checkAPI: async function () {
      this.errorInfo = undefined
      if (await this.checkV3API()) {
        this.apiType = 'v3'
        this.snapshotSrc = `${this.hostURL}/api/v3/camera/snapshot?${Date.now()}`
      } else if (await this.checkFallbackAPI()) {
        this.apiType = 'v3-fallback'
        this.errorInfo = 'Server could not start.'
        this.useFallbackImage()
      } else if (await this.checkV2API()) {
        this.apiType = 'v2'
        this.snapshotSrc = `${this.hostURL}/api/v2/streams/snapshot?${Date.now()}`
      } else {
        this.apiType = undefined
        this.errorInfo = 'Unknown API.'
        this.useFallbackImage()
      }
    },
    checkV3API: async function () {
      try {
        await axios.get(`${this.hostURL}/api/v3/thing_descriptions`)
        return true
      } catch {
        // Ignore errors, this route might not exist on the current device.
      }
      return false
    },
    checkFallbackAPI: async function () {
      try {
        const response = await axios.get(`${this.hostURL}/labthings_fallback`)
        if (response.data === true) {
          return true
        }
      } catch {
        // Ignore errors, this route might not exist on the current device.
      }
      return false
    },
    checkV2API: async function () {
      try {
        const response = await axios.get(`${this.hostURL}/routes`)
        return Object.keys(response.data).includes('/api/v2/')
      } catch {
        return false
      }
    },
    useFallbackImage() {
      if (this.snapshotSrc?.includes('/api/v3/camera')) {
        this.snapshotSrc = `${this.hostURL}/api/v2/streams/snapshot?${Date.now()}`
      } else {
        this.snapshotSrc = logo
      }
    }
  }
}
</script>

<style>
.host-error {
  color: #d97706;
  font-weight: 700;
  text-align: center;
  padding-bottom: 1em;
}
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
