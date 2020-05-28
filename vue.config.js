var webpack = require("webpack");

module.exports = {
  configureWebpack: {
    plugins: [
      new webpack.DefinePlugin({
        "process.env": {
          PACKAGE: JSON.stringify(require("./package.json"))
        }
      })
    ]
  },
  pluginOptions: {
    electronBuilder: {
      builderOptions: {
        directories: {
          buildResources: "build"
        },
        appId: "org.openflexure.ev",
        artifactName: "${name}-${version}-${os}-${arch}.${ext}",
        asar: true,
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
          target: ["NSIS", "portable"]
        },
        portable: {
          artifactName: "${name}-${version}-${os}-${arch}-portable.${ext}"
        },
        linux: {
          target: [
            {
              target: "appImage",
              arch: ["x64", "armv7l"]
            }
          ],
          category: "Science"
        },
        mac: {
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
