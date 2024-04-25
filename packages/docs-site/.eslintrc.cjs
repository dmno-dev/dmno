module.exports = {
  ignorePatterns: [".eslintrc.js", ".eslintrc.cjs"],
  overrides: [
    {
      files: ["*.ts"],
      extends: ["@dmno/eslint-config/base"],
    },
    {
      // Define the configuration for `.astro` file.
      files: ["**/*.astro"],
      extends: ["plugin:astro/recommended"],
      // Allows Astro components to be parsed.
      parser: "astro-eslint-parser",
      // Parse the script in `.astro` as TypeScript by adding the following configuration.
      // It's the setting you need when using TypeScript.
      parserOptions: {
        parser: "@typescript-eslint/parser",
        extraFileExtensions: [".astro"],
      },
      rules: {
        // override/add rules settings here, such as:
        // "astro/no-set-html-directive": "error"
      },
    },
    {
      files: ["**/*.mdx", "**/*.md"],
      extends: [
        'plugin:mdx/recommended',
      ],
      settings: {
        "mdx/code-blocks": true,
      },
      rules: {
        'no-unused-expressions': 0,
      }
    },

    // RULES SPECIFIC TO CODE BLOCKS WITHIN MDX!
    {
      files: [
        "**/*.mdx/*.ts",
        "**/*.md/*.ts",
        "**/*.mdx/*.js",
        "**/*.md/*.js"
      ],
      extends: [
        '@dmno/eslint-config/base',
        'plugin:@typescript-eslint/disable-type-checked'
      ],
      rules: {
        "import/no-unresolved": 0,
        "@typescript-eslint/no-unused-vars": 0,
        "import/no-extraneous-dependencies": 0,
      },
    },
  ],
  
};
