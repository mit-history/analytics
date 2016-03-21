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
      { test: /\.(jpe?g|png|gif)$/i, loader:"file" },
    ]
  },
	resolve: {
		alias: {
			"jquery": 							"jquery/src/jquery",
      "jquery.ui": 						"jquery-ui/ui/core",
      "jquery.ui.selectmenu": "jquery-ui/ui/widgets/selectmenu",
		}
	},
  plugins: [
    new webpack.NoErrorsPlugin(),
		new webpack.ProvidePlugin({
		  "$": 							"jquery",
      "jQuery": 				"jquery",
      "window.jQuery": 	"jquery"
		})
  ]
};

