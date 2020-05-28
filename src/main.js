import Vue from "vue";
import App from "./App.vue";
import UIkit from "uikit";

// Import MD icons
import "material-design-icons/iconfont/material-icons.css";

console.log("Loaded main.app.js for electron-renderer functionality");

Vue.config.productionTip = false;

Vue.mixin({
  methods: {
    getLocalStorageObj: function(keyName) {
      if (localStorage.getItem(keyName)) {
        try {
          return JSON.parse(localStorage.getItem(keyName));
        } catch (e) {
          console.log("Malformed entry. Removing from localStorage");
          localStorage.removeItem(keyName);
          return null;
        }
      }
    },

    setLocalStorageObj: function(keyName, object) {
      const parsed = JSON.stringify(object);
      localStorage.setItem(keyName, parsed);
    }
  }
});

new Vue({
  render: h => h(App)
}).$mount("#app");
