exports.js = ({
  include,
  exclude,
} = {}) => ({
  module: {
    rules: [
      {
        test: /\.js$/,
        include,
        exclude,
        use: 'babel-loader',
      },
    ],
  },
});

exports.lintJs = ({
  include,
  exclude,
} = {}) => ({
  module: {
    rules: [
      {
        test: /\.js$/,
        include,
        exclude,
        use: 'eslint-loader',
      },
    ],
  },
});
