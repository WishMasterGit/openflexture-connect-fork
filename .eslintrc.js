module.exports = {
  root: true,
  env: {
    node: true
  },
  parserOptions: {
    parser: "babel-eslint"
  },
  extends: ["plugin:vue/recommended", "eslint:recommended", "@vue/prettier"],
  rules: {
    "no-console": "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off"
  },
  globals: {
    $nuxt: true
  }
};
