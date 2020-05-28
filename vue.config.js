// vue.config.js

module.exports = {
  pluginOptions: {
    electronBuilder: {
      builderOptions: {
        directories: {
          buildResources: "build"
        },
        appId: "org.openflexure.ev",
        artifactName: "${name}-${version}-${os}-${arch}.${ext}",
        asar: false,
        publish: [
          {
            provider: "generic",
            url: "https://build.openflexure.org/openflexure-ev/"
          }
        ],
        files: [
          {
            filter: [
              "**/*",
              "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}",
              "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}",
              "!**/node_modules/*.d.ts",
              "!**/node_modules/.bin",
              "!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}",
              "!.editorconfig",
              "!**/._*",
              "!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}",
              "!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}",
              "!**/{appveyor.yml,.travis.yml,circle.yml}",
              "!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}",
              "!**/.env.*",
              "!**/{.idea,.vscode}${/*}",
              "!**/app/installers${/*}",
              "!**/hooks${/*}",
              "!**/platforms${/*}",
              "!**/release-builds${/*}",
              "!src${/*}"
            ]
          }
        ],
        win: {
          target: ["appx", "NSIS"],
          icon: "build/icon/win/icon.ico"
        },
        appx: {
          applicationId: "OpenFlexureEV",
          identityName: "60425J.T.Collins.OpenFlexureeV",
          publisher: "CN=CC867BEF-0715-4D48-8035-8881993DBB68",
          publisherDisplayName: "J. T. Collins",
          backgroundColor: "#C5247F"
        },
        linux: {
          target: [
            {
              target: "appImage",
              arch: ["x64", "armv7l"]
            }
          ],
          icon: "build/icon/png/",
          category: "Science"
        },
        mac: {
          icon: "build/icon/mac/icon.icns",
          category: "public.app-category.utilities"
        },
        dmg: {
          contents: [
            {
              x: 110,
              y: 150
            },
            {
              x: 240,
              y: 150,
              type: "link",
              path: "/Applications"
            }
          ]
        }
      }
    }
  }
};
