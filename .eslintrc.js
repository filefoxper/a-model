const path = require('path');

const tsConfig = path.resolve(__dirname, 'tsconfig.json');

const airbnbStyleRules = require('eslint-config-airbnb-base/rules/style');

/** @type {import('eslint').Linter.Config} */
module.exports = {
    root: true,
    env: {
        browser: true,
        es6: true,
    },
    extends: ['plugin:@typescript-eslint/recommended', 'airbnb', 'airbnb/hooks', 'airbnb-typescript', 'plugin:prettier/recommended'],
    globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
        self: 'readonly',
    },
    parserOptions: {
        project: tsConfig,
        tsconfigRootDir: __dirname,
        ecmaVersion: 2021,
        sourceType: 'module',
    },
    settings: {
        'import/resolver': {
            typescript: {
                project: tsConfig,
            },
        },
    },
    plugins: ['import', 'react', 'unused-imports'],
    rules: {
        '@typescript-eslint/no-unused-vars': 'off',
        'unused-imports/no-unused-imports': 'error',
        '@typescript-eslint/consistent-type-imports':'error',
        'unused-imports/no-unused-vars': [
            'warn',
            { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_', ignoreRestSiblings: true },
        ],
        '@typescript-eslint/default-param-last': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        'class-methods-use-this': 'off',
        'consistent-return': 'off',
        'consistent-this': ['warn', 'self'],
        curly: ['error', 'all'],
        'func-names': 'error',
        'import/no-unresolved': ['error', { caseSensitive: true }],
        'import/order': [
            'error',
            {
                groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
                'newlines-between': 'never',
                pathGroups: [{ pattern: '@/**', group: 'internal' }],
                pathGroupsExcludedImportTypes: ['type'],
            },
        ],
        'import/no-extraneous-dependencies':[2, {
            optionalDependencies: true,
        }],
        "import/extensions":"off",
        'import/prefer-default-export': 'off',
        'jsx-a11y/alt-text': 'off',
        'jsx-a11y/mouse-events-have-key-events': 'off',
        'jsx-a11y/anchor-is-valid': 'off',
        'jsx-a11y/click-events-have-key-events': 'off',
        'jsx-a11y/label-has-associated-control': 'off',
        'jsx-a11y/media-has-caption': 'off',
        'jsx-a11y/no-noninteractive-element-interactions': 'off',
        'jsx-a11y/no-static-element-interactions': 'off',
        'max-classes-per-file': 'off',
        'max-len': ['error', { code: 120, ignoreStrings: true }],
        'max-nested-callbacks': 'off',
        'max-params': 'off',
        'no-alert': 'error',
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        'no-constant-condition': 'error',
        'no-eq-null': 'off',
        'no-nested-ternary': 'off',
        'no-param-reassign': ['error', { props: true, ignorePropertyModificationsForRegex: ['^draft'] }],
        'no-warning-comments': ['off'],
        'react-hooks/exhaustive-deps': 'warn',
        'react/function-component-definition': 'off',
        'react/jsx-filename-extension': ['error', { extensions: ['.js', '.jsx', 'ts', 'tsx'] }],
        'react/jsx-no-useless-fragment': ['error', { allowExpressions: true }],
        'react/jsx-props-no-spreading': 'off',
        'react/no-array-index-key': 'off',
        'react/no-unstable-nested-components': 'off',
        'react/no-unused-class-component-methods': 'off',
        'react/prop-types': 'off',
        'react/no-danger':'off',
        'react/require-default-props': 'off',
        'react/jsx-sort-props': ['warn', { callbacksLast: true, noSortAlphabetically: true, reservedFirst: true }],
        'react/no-unknown-property': ['error', { ignore: ['attr-component'] }],
        'no-plusplus':'off',
        quotes: ['error', 'single', { ...airbnbStyleRules.rules.quotes[2], allowTemplateLiterals: false }],
    },
};

