import Vue from "vue";
import App from "./App.vue";
import UIkit from "uikit";

Vue.config.productionTip = false;

Vue.mixin({
  methods: {
    getLocalStorageObj: function (keyName) {
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

    setLocalStorageObj: function (keyName, object) {
      const parsed = JSON.stringify(object);
      localStorage.setItem(keyName, parsed);
    },

    modalDialog: function (title, message) {
      UIkit.modal.dialog(
        `
        <button class="uk-modal-close-default" type="button" uk-close></button>
        <div class="uk-modal-header">
          <h2 class="uk-modal-title">${title}</h2>
        </div>
        <div class="uk-modal-body">
          <p>${message}</p>
        </div>
      `,
        { stack: true }
      );
    },

    modalError: function (error) {
      console.log(error);
      var errormsg = "";

      // If a response was obtained
      if (error.response) {
        // If the response is a nicely formatted JSON response from the server
        if (error.response.data.message) {
          errormsg = `${error.response.status}: ${error.response.data.message}`;
          console.log(errormsg);
        }
        // If the response is just some generic error response
        else {
          errormsg = `${error.response.status}: ${error.response.data}`;
          console.log(errormsg);
        }
        // If the error occured during the request
      } else if (error.request) {
        errormsg = `${error.message}`;
        console.log(errormsg);
        // Everything else
      } else {
        errormsg = `${error.message}`;
        console.log(errormsg);
      }
      UIkit.notification({
        message: `${errormsg}`,
        status: "danger",
      });
    },
  },
});

new Vue({
  render: (h) => h(App),
}).$mount("#app");
