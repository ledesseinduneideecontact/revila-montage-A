module.exports = {
  extends: ["react-app", "react-app/jest"],
  rules: {
    "import/no-webpack-loader-syntax": "off",
    "no-restricted-globals": "off",
  },
  overrides: [
    {
      files: ["**/*.ts", "**/*.tsx"],
      rules: {
        "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      },
    },
  ],
};