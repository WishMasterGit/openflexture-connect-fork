module.exports = {
  root: true,

  env: {
    node: true
  },

  parserOptions: {
    parser: "babel-eslint",
    ecmaVersion: 2020
  },

  rules: {
    "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off"
  },

  extends: [
    "plugin:vue/recommended",
    "eslint:recommended",
    "@vue/prettier",
    "plugin:vue/essential"
  ]
};
