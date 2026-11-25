import eslint from '@eslint/js';
import angular from 'angular-eslint';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import jsdoc from 'eslint-plugin-jsdoc';
import rxjs from 'eslint-plugin-rxjs-updated';
import unicorn from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';

const angularRules = {
  '@angular-eslint/component-class-suffix': ['error', { suffixes: ['Component', 'Page'] }],
  '@angular-eslint/component-max-inline-declarations': 'off',
  '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'app', style: 'kebab-case' }],
  '@angular-eslint/contextual-lifecycle': 'error',
  '@angular-eslint/directive-class-suffix': 'error',
  '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'app', style: 'camelCase' }],
  '@angular-eslint/no-attribute-decorator': 'error',
  '@angular-eslint/no-conflicting-lifecycle': 'error',
  '@angular-eslint/no-input-rename': 'off',
  '@angular-eslint/no-inputs-metadata-property': 'error',
  '@angular-eslint/no-output-native': 'error',
  '@angular-eslint/no-output-on-prefix': 'error',
  '@angular-eslint/no-output-rename': 'error',
  '@angular-eslint/no-outputs-metadata-property': 'error',
  '@angular-eslint/no-pipe-impure': 'error',
  '@angular-eslint/no-queries-metadata-property': 'error',
  '@angular-eslint/prefer-on-push-component-change-detection': 'error',
  '@angular-eslint/prefer-output-readonly': 'error',
  '@angular-eslint/use-component-selector': 'error',
  '@angular-eslint/use-component-view-encapsulation': 'error',
  '@angular-eslint/use-lifecycle-interface': 'error',
  '@angular-eslint/use-pipe-transform-interface': 'error'
};

const typescriptRules = {
  '@typescript-eslint/adjacent-overload-signatures': 'off',
  '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
  '@typescript-eslint/await-thenable': 'error',
  '@typescript-eslint/ban-ts-comment': [
    'error',
    {
      'ts-expect-error': false,
      'ts-ignore': 'allow-with-description',
      'ts-nocheck': 'allow-with-description',
      'ts-check': true,
      minimumDescriptionLength: 5
    }
  ],
  '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'as' }],
  '@typescript-eslint/consistent-type-definitions': ['warn', 'type'],
  '@typescript-eslint/dot-notation': ['error', { allowIndexSignaturePropertyAccess: true }],
  '@typescript-eslint/explicit-function-return-type': [
    'error',
    { allowExpressions: true, allowTypedFunctionExpressions: true }
  ],
  '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'no-public' }],
  '@typescript-eslint/member-ordering': [
    'error',
    {
      default: [
        'private-instance-field',
        'public-instance-field',
        'constructor',
        'public-instance-method',
        'private-instance-method'
      ]
    }
  ],
  '@typescript-eslint/naming-convention': [
    'error',
    { selector: 'default', format: ['camelCase'], leadingUnderscore: 'forbid', trailingUnderscore: 'forbid' },
    { selector: 'variable', modifiers: ['const', 'global'], format: ['camelCase'], leadingUnderscore: 'allow' },
    { selector: 'variable', modifiers: ['exported'], format: ['UPPER_CASE'], leadingUnderscore: 'forbid' },
    {
      selector: 'variable',
      modifiers: ['exported', 'destructured'],
      format: ['camelCase', 'UPPER_CASE'],
      leadingUnderscore: 'forbid'
    },
    {
      selector: 'variable',
      modifiers: ['exported'],
      types: ['function'],
      format: ['camelCase'],
      leadingUnderscore: 'forbid'
    },
    { selector: 'typeLike', format: ['PascalCase'] },
    { selector: 'memberLike', modifiers: ['private'], format: ['camelCase'], leadingUnderscore: 'allow' },
    { selector: 'parameter', modifiers: ['unused'], format: ['camelCase'], leadingUnderscore: 'allow' },
    { selector: 'interface', format: ['PascalCase'], custom: { regex: '^I[A-Z]', match: false } },
    { selector: 'enumMember', format: ['camelCase', 'PascalCase', 'UPPER_CASE'] },
    { selector: 'memberLike', modifiers: ['requiresQuotes'], format: null },
    { selector: ['variable', 'parameter'], modifiers: ['destructured'], format: null }
  ],
  '@typescript-eslint/no-dynamic-delete': 'error',
  '@typescript-eslint/no-floating-promises': 'off',
  '@typescript-eslint/no-empty-function': ['error', { allow: ['decoratedFunctions'] }],
  '@typescript-eslint/no-empty-interface': ['error', { allowSingleExtends: true }],
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-for-in-array': 'error',
  '@typescript-eslint/no-inferrable-types': 'error',
  '@typescript-eslint/no-misused-new': 'error',
  '@typescript-eslint/no-non-null-assertion': 'error',
  '@typescript-eslint/no-require-imports': 'error',
  '@typescript-eslint/no-shadow': ['error', { hoist: 'all', ignoreFunctionTypeParameterNameValueShadow: false }],
  '@typescript-eslint/no-this-alias': 'error',
  '@typescript-eslint/no-unnecessary-boolean-literal-compare': [
    'error',
    { allowComparingNullableBooleansToTrue: false, allowComparingNullableBooleansToFalse: true }
  ],
  '@typescript-eslint/no-unnecessary-type-arguments': 'off',
  '@typescript-eslint/no-unnecessary-type-assertion': 'error',
  '@typescript-eslint/no-unused-expressions': 'off',
  '@typescript-eslint/no-unused-vars': 'off',
  '@typescript-eslint/no-useless-constructor': 'error',
  '@typescript-eslint/prefer-function-type': 'error',
  '@typescript-eslint/prefer-readonly': 'error',
  '@typescript-eslint/promise-function-async': 'error',
  '@typescript-eslint/require-await': 'error',
  '@typescript-eslint/restrict-plus-operands': 'error',
  '@typescript-eslint/return-await': 'error',
  '@typescript-eslint/typedef': 'off',
  '@typescript-eslint/unified-signatures': 'error'
};

const generalRules = {
  'array-callback-return': ['error', { checkForEach: true }],
  complexity: ['error', { max: 15 }],
  curly: ['error', 'all'],
  'default-case': 'error',
  'default-case-last': 'error',
  eqeqeq: ['error', 'always'],
  'guard-for-in': 'error',
  'no-bitwise': 'error',
  'no-console': ['error', { allow: ['warn', 'error'] }],
  'no-constant-condition': 'error',
  'no-debugger': 'error',
  'no-duplicate-case': 'error',
  'no-duplicate-imports': 'error',
  'no-empty': ['error', { allowEmptyCatch: true }],
  'no-eval': 'error',
  'no-extra-semi': 'error',
  'no-fallthrough': 'off',
  'no-irregular-whitespace': 'off',
  'no-magic-numbers': ['warn', { ignore: [-1, 0, 1], ignoreDefaultValues: true, detectObjects: false }],
  'no-multiple-empty-lines': 'off',
  'no-new-wrappers': 'error',
  'no-param-reassign': 'error',
  'no-restricted-imports': [
    'error',
    {
      paths: [
        { name: 'rxjs/operators', message: "Import operators directly from 'rxjs'." },
        { name: 'lodash', message: "Import from 'lodash-es' instead." }
      ],
      patterns: [{ group: ['.*/index'], message: "Import from the module path, not its '/index' entry." }]
    }
  ],
  'no-return-await': 'off',
  'no-trailing-spaces': 'off',
  'no-sequences': 'error',
  'no-sparse-arrays': 'error',
  'no-template-curly-in-string': 'error',
  'no-throw-literal': 'error',
  'no-undef-init': 'error',
  'no-useless-concat': 'error',
  'no-var': 'error',
  'no-void': 'error',
  'object-shorthand': 'error',
  'padding-line-between-statements': [
    'error',
    { blankLine: 'always', prev: '*', next: ['return', 'break', 'default', 'throw'] },
    { blankLine: 'always', prev: ['let', 'const', 'block-like', 'case', 'function'], next: '*' },
    { blankLine: 'any', prev: ['let', 'const'], next: ['let', 'const'] }
  ],
  'prefer-const': 'error',
  'prefer-object-spread': 'error',
  'prefer-template': 'error',
  'quote-props': ['error', 'as-needed'],
  radix: 'error',
  'sort-imports': ['error', { ignoreCase: true, ignoreDeclarationSort: true, ignoreMemberSort: false }],
  'import/newline-after-import': ['error', { count: 1 }],
  'import/no-deprecated': 'warn',
  'import/no-unassigned-import': [
    'error',
    { allow: ['zone.js', 'zone.js/plugins/zone-error', './*', 'jest-preset-angular/setup-jest'] }
  ],
  'import/order': [
    'error',
    {
      groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
      'newlines-between': 'always',
      alphabetize: { order: 'asc', caseInsensitive: true }
    }
  ],
  'jsdoc/no-types': 'error',
  'unicorn/filename-case': ['error', { case: 'kebabCase' }],
  'unicorn/prefer-ternary': 'error',
  'unicorn/switch-case-braces': 'error',
  'id-denylist': [
    'error',
    'any',
    'Number',
    'number',
    'String',
    'string',
    'Boolean',
    'boolean',
    'Undefined',
    'undefined'
  ],
  'rxjs/finnish': [
    'error',
    {
      functions: false,
      methods: false,
      parameters: true,
      properties: true,
      variables: true,
      names: { '^useValue$': false, '^useFactory$': false, '^entities$': false, '^UIEntities$': false },
      types: { '^EventEmitter$': false, '^(Subject|BehaviorSubject|ReplaySubject|AsyncSubject)$': false }
    }
  ],
  'rxjs/no-async-subscribe': 'error',
  'rxjs/no-compat': 'error',
  'rxjs/no-create': 'error',
  'rxjs/no-exposed-subjects': 'error',
  'rxjs/no-ignored-observable': 'error',
  'rxjs/no-ignored-replay-buffer': 'error',
  'rxjs/no-ignored-takewhile-value': 'error',
  'rxjs/no-internal': 'error',
  'rxjs/no-nested-subscribe': 'error',
  'rxjs/no-sharereplay': ['error', { allowConfig: true }],
  'rxjs/no-subject-unsubscribe': 'error',
  'rxjs/no-subject-value': 'error',
  'rxjs/no-topromise': 'error',
  'rxjs/no-unbound-methods': 'error',
  'rxjs/no-unsafe-takeuntil': ['error', { alias: ['takeUntilDestroyed'] }],
  'rxjs/prefer-observer': ['error', { allowNext: true }],
  'rxjs/throw-error': 'error',
  'rxjs/suffix-subjects': ['error', { parameters: true, properties: true, variables: true, suffix: 'Subject' }]
};

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/.angular/**',
      '**/wasm/**',
      'jest.config.*',
      'setup-jest.ts'
    ]
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
      // Last in `extends`: turns off rules that conflict with Prettier; `rules` below still win.
      prettierConfig
    ],
    processor: angular.processInlineTemplates,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    plugins: {
      import: importPlugin,
      jsdoc,
      rxjs,
      unicorn
    },
    rules: {
      ...angularRules,
      ...typescriptRules,
      ...generalRules,
      '@typescript-eslint/adjacent-overload-signatures': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unnecessary-type-arguments': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/typedef': 'off',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-constant-condition': 'error'
    }
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, prettierConfig]
  }
);
