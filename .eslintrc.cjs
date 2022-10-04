module.exports = {
    root: true,
    env: {
        browser: true,
        jest: true,
        node: true,
    },
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint"],
    extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
    rules: {
        "quotes": ["error", "single"],
        "no-trailing-spaces": ["error"],
        "object-curly-spacing": ["error", "always"],
        "comma-dangle": ["error", "always-multiline"],
        "@typescript-eslint/no-explicit-any": "off",
        "semi": ["error", "never"],
    },
};
