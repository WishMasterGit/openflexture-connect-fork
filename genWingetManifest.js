const yaml = require("yaml");
const sha256File = require("sha256-file");
const fs = require("fs");

const vueConfig = require("./vue.config");
const appPackage = require("./package.json");

const installerFileName = `${appPackage.name}-${appPackage.version}-win.exe`;
const deployUrl =
  vueConfig.pluginOptions.electronBuilder.builderOptions.publish[0].url;

console.log(vueConfig.pluginOptions.electronBuilder.builderOptions);

const installerChecksum = sha256File(`./dist_electron/${installerFileName}`);

const installerUrl = `${deployUrl}${installerFileName}`;

var manifest = {
  Id: `${appPackage.publisher}.${appPackage.name}`.toLowerCase(),
  Publisher: appPackage.publisher,
  Name: appPackage.productName,
  Version: appPackage.version,
  Description: appPackage.description,
  Homepage: appPackage.homepage,
  License: appPackage.license,
  InstallerType: "exe",
  Installers: [
    {
      Arch: "x64",
      Url: installerUrl,
      Sha256: installerChecksum,
      Switches: {
        Silent: "/S",
        SilentWithProgress: "/S"
      }
    }
  ]
};

fs.writeFileSync(
  `./dist_electron/${appPackage.version}.yaml`,
  yaml.stringify(manifest),
  "utf8"
);
