import { createApp } from 'vue'
import App from './App.vue'
import UIkit from 'uikit'

const mixin = {
  methods: {
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
      )
    },
    modalError: function (error) {
      var errormsg = ''
      // If a response was obtained
      if (error.response) {
        // If the response is a nicely formatted JSON response from the server
        if (error.response.data.message) {
          errormsg = `${error.response.status}: ${error.response.data.message}`
          console.error(errormsg)
        }
        // If the response is just some generic error response
        else {
          errormsg = `${error.response.status}: ${error.response.data}`
          console.error(errormsg)
        }
        // If the error occured during the request
      } else if (error.request) {
        errormsg = `${error.message}`
        console.error(errormsg)
        // Everything else
      } else {
        errormsg = `${error.message}`
        console.error(errormsg)
      }
      UIkit.notification({
        message: `${errormsg}`,
        status: 'danger'
      })
    }
  }
}

const app = createApp(App)
app.mixin(mixin)
app.mount('#app')
