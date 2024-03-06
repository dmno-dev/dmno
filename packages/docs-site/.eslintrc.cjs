module.exports = {
  extends: [
    "@dmno/eslint-config/base",
    "plugin:astro/recommended",
    "plugin:markdown/recommended-legacy",
    // "plugin:mdx/recommended",
  ],
  overrides: [
    {
      // Define the configuration for `.astro` file.
      files: ["*.astro"],
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
      // 2. Enable the Markdown processor for all .md files.
      files: ["**/*.md"],
      processor: "markdown/markdown"
    },
    {
      files: ["*.mdx"],
      extends: 'plugin:mdx/recommended',
      parserOptions: {
        parser: "@typescript-eslint/parser",
        extraFileExtensions: [".mdx"],
        project: './tsconfig.json',
      },
    }
  ],
  settings: {
    "mdx/code-blocks": true,
  }
};
