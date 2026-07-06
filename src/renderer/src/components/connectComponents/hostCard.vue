<template>
  <div v-if="showCard" class="hostCard uk-card uk-card-default uk-padding-remove uk-width-medium">
    <div class="uk-card-media-top">
      <div class="snapshot-container">
        <img :src="snapshotSrc" class="snapshot-img" @error="useFallbackImage" />
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
    },
    alwaysShow: {
      type: Boolean,
      required: false,
      default: false
    }
  },
  emits: ['connect', 'delete', 'save', 'available', 'unavailable'],
  data: function () {
    return {
      snapshotSrc: undefined,
      apiType: undefined,
      polling: null,
      errorInfo: undefined,
      count: 0
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
    },
    showCard() {
      if (this.alwaysShow) return true
      return this.apiType !== undefined
    }
  },

  mounted() {
    this.checkAPI()
    this.polling = setInterval(() => {
      this.checkAPI()
    }, 5000)
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
      this.count += 1
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
        this.errorInfo = 'Microscope offline'
        this.useFallbackImage()
      }
    },
    checkV3API: async function () {
      try {
        await axios.get(`${this.hostURL}/api/v3/things`, { timeout: 500 })
        return true
      } catch {
        // Ignore errors, this route might not exist on the current device.
      }
      return false
    },
    checkFallbackAPI: async function () {
      try {
        const response = await axios.get(`${this.hostURL}/labthings_fallback`, { timeout: 500 })
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
        const response = await axios.get(`${this.hostURL}/routes`, { timeout: 500 })
        return Object.keys(response.data).includes('/api/v2/')
      } catch {
        return false
      }
    },
    /**
     * Change image source to a fallback image.
     *
     * This is called directly if no API is recognised or if the v3 fallback
     * server is detected. It is also called if the the image fails to load
     * a snapshot from the image source that is set.
     *
     * If the source currently is the v3 snapshot it will first try the v2
     * snapshot url, as most v3 alphas do not have the v3 snapshot endpoint.
     */
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

.snapshot-container {
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  position: relative;
}

.snapshot-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
  display: block;
}
</style>
