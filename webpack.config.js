const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
	mode: "development",
	entry: "./src/index.js",
	output: {
		filename: "bundle.js",
		path: path.resolve(__dirname, "dist"),
	},
	plugins: [
		new CopyPlugin({
			patterns: [{ context: "static/", from: "**/*" }],
		}),
	],
};
