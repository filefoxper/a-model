module.exports = require('babel-jest').createTransformer({
  plugins: [
    // ['babel-plugin-rewire-ts'],
    ['@babel/plugin-transform-runtime'],
  ],
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
        },
        useBuiltIns: 'usage',
        corejs: { version: 3, proposals: true },
      },
    ],
    '@babel/preset-react',
    '@babel/preset-typescript',
  ],
});
