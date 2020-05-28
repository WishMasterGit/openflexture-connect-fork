const Store = require("electron-store");
const store = new Store();

if (store.has("drawCustomTitleBar") !== true) {
  store.set("drawCustomTitleBar", false);
}

module.exports.store = store;
