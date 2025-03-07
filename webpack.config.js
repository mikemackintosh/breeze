const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

/**
 * Configuration for webpack bundling
 */
module.exports = {
  mode: process.env.NODE_ENV === "development" ? "development" : "production",
  entry: "./src/renderer.ts",
  target: "electron-renderer",
  output: {
    path: path.resolve(__dirname, "dist/renderer"),
    filename: "renderer.js",
  },
  resolve: {
    extensions: [".ts", ".js", ".json"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        include: path.resolve(__dirname, "src"),
        use: [{ loader: "ts-loader" }],
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        type: "asset/resource",
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html",
    }),
  ],
};
