const merge = require('webpack-merge');
const nodeExternals = require('webpack-node-externals');
const path = require('path');

const parts = require('./webpack.parts');

const PATHS = {
  app: path.resolve(__dirname, 'src'),
  dist: path.resolve(__dirname, 'dist'),
};
const COMMON_CONFIG = merge([
  parts.js({
    include: PATHS.app,
  }),
  parts.lintJs({
    include: PATHS.app,
  }),
  {
    entry: {
      app: [
        'babel-polyfill',
        PATHS.app,
      ],
    },
    output: {
      path: PATHS.dist,
      filename: '[name].js',
    },
    target: 'node',
    externals: nodeExternals(),
  },
]);
const DEVELOPMENT_CONFIG = merge([
  COMMON_CONFIG,
]);
const PRODUCTION_CONFIG = merge([
  COMMON_CONFIG,
]);

module.exports = env => env === 'development' ? DEVELOPMENT_CONFIG : PRODUCTION_CONFIG;
