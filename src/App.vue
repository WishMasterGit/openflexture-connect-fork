<template>
  <div id="app" class="uk-height-1-1 uk-margin-remove uk-padding-remove">
    <connectDisplay />
  </div>
</template>

<script>
// Import components
import connectDisplay from "./components/connectDisplay.vue";

// Export main app
export default {
  name: "App",

  components: {
    connectDisplay
  },

  data: function() {
    return {};
  },

  computed: {},

  mounted() {},

  created: function() {},

  beforeDestroy: function() {},

  methods: {}
};
</script>

<style lang="less">
// Basic UIkit CSS
@import "../node_modules/uikit/src/less/uikit.less";
// Custom UIkit CSS modifications
@import "./assets/less/theme.less";

#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: left;
  height: 100%;
}

body,
html {
  height: 100%;
}

.uk-disabled {
  pointer-events: none;
  opacity: 0.4;
}
</style>
