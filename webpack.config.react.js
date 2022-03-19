const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
	entry: "./src/index_react.tsx",
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: "ts-loader",
				exclude: /node_modules/,
			},
		],
	},
	resolve: {
		symlinks: false,
		extensions: [".tsx", ".ts", ".js"],
	},
	output: {
		filename: "bundle.js",
		path: path.resolve(__dirname, "dist"),
	},
	plugins: [
		new CopyPlugin({
			patterns: [{ context: "static/", from: "**/*" }],
		}),
	],
	devtool: 'inline-source-map',
	devServer: {
		server: {
			type: 'https',
			options: {
			  key: './keys/key.pem',
			  cert: './keys/cert.pem',
			  requestCert: false,
			},
		},
		static: {
			directory: path.join(__dirname, 'public'),
		},
		client: {
			overlay: {
				errors: true,
				warnings: false,
			},
		},
		compress: true,
		port: 1011,
	},
};
