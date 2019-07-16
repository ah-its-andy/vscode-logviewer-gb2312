// @ts-check

const path = require("path");

/**@type {import("webpack").Configuration}*/
const config = {
    target: "node",
    entry: {
        extension: "./src/extension.ts",
    },
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "[name].js",
        libraryTarget: "commonjs2",
        devtoolModuleFilenameTemplate: "../[resource-path]" // so that relative paths in dist/extension.js.map work
    },
    devtool: "source-map",
    node: {
        __dirname: false, // preserve __dirname
    },
    externals: {
        vscode: "commonjs vscode", // special syntax that will leave it as require("vscode")      
    },
    resolve: {
        extensions: [".ts", ".js"]
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    { loader: "ts-loader", options: { transpileOnly: true } }
                ]
            }
        ]
    }
};
module.exports = config;
