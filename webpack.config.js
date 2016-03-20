var webpack = require('webpack');
module.exports = {
  devtool: 'source-map',
  entry: './index.js',
  output: {
    path: __dirname + '/build',
    publicPath: '/build',
    filename: 'bundle.js'
  },
  module: {
    loaders: [
      { test: /\.js$/, loader: 'babel-loader', exclude: /node_modules/},
      { test: /\.css$/, loader: "style!css" },
			{ test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "url-loader?limit=10000&minetype=application/font-woff" },
      { test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "file-loader" },
			{ test: /[\/\\]node_modules[\/\\]some-module[\/\\]index\.js$/, loader: "imports?this=>window" }
    ]
  },
  plugins: [
    new webpack.NoErrorsPlugin(),
		new webpack.ProvidePlugin({
		    $: "../node_modules/jquery/dist/jquery.js"
		})
  ]
};

