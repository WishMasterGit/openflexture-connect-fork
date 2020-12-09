# OpenFlexure Connect 

## Quickstart

A general user-guide on setting up your microscope can be found [**here on our website**](https://www.openflexure.org/projects/microscope/).
This includes basic installation instructions suitable for most users.

## Key info

* An [Electron](https://www.electronjs.org/) app that handles auto-discovery (via mDNS), saving connections, etc.
* When you connect to a microscope, it just opens a new Electron window pointing to the server root, where the JS client is hosted.

# Developer guidelines

## Creating releases

* Update the applications internal version number
	* `npm version X.y.z` (replace X.y.z with a semantic version number)
	* or `npm version {patch/minor/major}` (see https://docs.npmjs.com/cli/v6/commands/npm-version)
	* Git commit and git push
* Create a new version tag on GitLab (e.g. V1.2.0)
	* Make sure you prefix a lower case 'v', otherwise it won't be recognised as a release!
	* This will trigger a CI pipeline that builds the electron app, and deploys it
        * Note: This also updates the build servers nginx redirect map file

### Testing builds

* Binaries will be built for testing on merge requests, and manual CI triggers
    * These builds expire after a week, and are intended for testing only.
* Binaries will be built **and deployed** on release tags.
    * These binaries will expire on GitLab after a week, but will be permanantly
    deployed to http://build.openflexure.org/openflexure-ev

## Local installation

* Clone the repo, and run `npm install`

Scripts to build, and package Electron apps, are included in `package.json`

### Build for your local operating system

* `npm run electron:build`

## Developer notes

### VS Code and ESLint

To prevent the editor from interfering with ESLint, add to your project `settings.json `:

```
{
    "editor.tabSize": 2,
    "cSpell.enabled": false,
    "eslint.validate": [{
            "language": "vue",
            "autoFix": true
        },
        {
            "language": "javascript",
            "autoFix": true
        },
        {
            "language": "javascriptreact",
            "autoFix": true
        }
    ],
    "eslint.autoFixOnSave": true,
    "editor.formatOnSave": false,
    "vetur.validation.template": false
}
```

### Generate changelogs

* `npm install -g conventional-changelog-cli`
* `conventional-changelog -r 0 --config ./changelog.config.js -i CHANGELOG.md -s`