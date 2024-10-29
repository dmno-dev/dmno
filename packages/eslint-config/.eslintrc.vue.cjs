const { execSync } = require('child_process');
const actualProjectDir = execSync('npm prefix').toString().replace(/\n/g, '');
// console.log(actualProjectDir);

module.exports = { 
  env: {
    browser: true,
    es2021: true,
    "vue/setup-compiler-macros": true,
  },
  extends: [
    __dirname + '/.eslintrc.base.cjs',
    // "@vue/eslint-config-typescript/recommended",
    'plugin:vue/vue3-recommended',
    'plugin:vue-pug/vue3-recommended',
  ],
  parser: "vue-eslint-parser",
  parserOptions: {
    parser: "@typescript-eslint/parser",
    project: [`${actualProjectDir}/tsconfig.json`, `${actualProjectDir}/tsconfig.node.json`, `${actualProjectDir}/tsconfig.app.json`],
    extraFileExtensions: ['.vue'],
    // parserOptions: {
    //   ecmaVersion: "latest",
    //   sourceType: "module",
    //   // project: ["./tsconfig.json", "./tsconfig.node.json"],
    //   // TODO: figure our correct settings here
    //   // project: [`${__dirname}/tsconfig.json`],
    // },
  },
  plugins: ["vue"],
  settings: {
    'import/resolver': {
      "eslint-import-resolver-custom-alias": {
        "alias": {
          "@": `${actualProjectDir}/src`,
        },
        "extensions": [".js", ".ts", ".vue"],
      },
    },
  },
  rules: {
    // some customizations of vue rules ------------------
    // standard order of sections in vue SFCs
    "vue/block-order": ["error", {
      'order': [
        'template',
        'script:not([setup])', 'script[setup]',
        "style:not([scoped])", "style[scoped]",
      ]
    }],

    // "vue/component-tags-order": [
    //   "error",
    //   {
    //     order: [
    //       "template",
    //       "script[setup]",
    //       "script:not([setup])", // necessary for default exports to not get hoisted below imports in setup block
    //       "style:not([scoped])",
    //       "style[scoped]",
    //     ],
    //   },
    // ],
    "vue/no-undef-components": [
      "error",
      {
        ignorePatterns: [
          "v-.*", // vue-konva requires global registration :( will hopefully fix soon!
          "router-(view|link)", // vue router is fairly standard to use via global registration
        ],
      },
    ],
    "vue/script-setup-uses-vars": "error",
    "vue/multi-word-component-names": "off",
    "vue/require-default-prop": "off",
    "vue/padding-line-between-blocks": "error",
    "vue/prefer-true-attribute-shorthand": "error",
    "vue/eqeqeq": "error",
    "vue/no-multiple-template-root": "error",
    "vue/max-attributes-per-line": 0,
    
  },
}
