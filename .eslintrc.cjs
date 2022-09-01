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
        "no-trailing-spaces": "error",
        "@typescript-eslint/no-explicit-any": "off",
    },
};
