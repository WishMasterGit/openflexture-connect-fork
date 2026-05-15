<template>
  <div id="about-modal" uk-modal>
    <div class="uk-modal-dialog uk-modal-body uk-margin-auto-vertical about-modal">
      <button class="uk-modal-close-default" type="button" uk-close></button>

      <!-- Logo -->
      <div class="logo-wrap">
        <img :src="logo" alt="OpenFlexure Connect logo" class="logo" />
      </div>

      <h2 class="uk-modal-title">OpenFlexure Connect</h2>

      <div class="info">
        <div><b>Version:</b> {{ appInfo.version }}</div>
        <div><b>Electron:</b> {{ appInfo.electron }}</div>
        <div><b>Chrome:</b> {{ appInfo.chrome }}</div>
        <div><b>Node:</b> {{ appInfo.node }}</div>
        <div><b>Platform:</b> {{ appInfo.platform }}</div>
      </div>

      <div class="footer">
        <a href="#" @click.prevent="openWebsite"> Learn more about OpenFlexure </a>
      </div>
    </div>
  </div>
</template>

<script>
import UIkit from 'uikit'
import logo from '../../../../public/icon.png'

export default {
  name: 'AboutModal',

  data() {
    return {
      appInfo: {},
      logo
    }
  },

  mounted() {
    window.api.onOpenAboutModal(async () => {
      this.appInfo = await window.api.getAppInfo()
      UIkit.modal('#about-modal').show()
    })
  },

  methods: {
    openWebsite() {
      window.api.openExternal('https://openflexure.org')
    }
  }
}
</script>

<style scoped>
.about-modal {
  padding: 18px;
}

.logo-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}

.logo {
  width: 64px;
  height: 64px;
}

h2 {
  margin: 6px 0 10px 0;
  text-align: center;
}

.info div {
  margin: 2px 0;
  font-size: 13px;
}

.footer {
  margin-top: 12px;
  text-align: center;
  font-size: 13px;
}

.footer a {
  color: #1e87f0;
  text-decoration: none;
}

.footer a:hover {
  text-decoration: underline;
}
</style>
