/**
 * Copyright (c) 2020 Bytedance Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import webpack, { Compiler } from 'webpack';
// for development
class PuzzleDevWebpackPlugin {
  apply(compiler: Compiler): void {
    // for webpackv4 and v5
    // https://github.com/jantimon/html-webpack-plugin/issues/1451
    const webpackSource = compiler.webpack || webpack;
    const publicPath = compiler.options.output.publicPath || '';

    compiler.hooks.environment.tap(this.constructor.name, () => {
      if (!compiler.options.devServer) {
        compiler.options.devServer = {};
      }

      const devServer = compiler.options.devServer;
      const port = process.env.PORT || devServer.port;
      const protocol = process.env.HTTPS || devServer.https ? 'https:' : 'http:';
      const host = devServer.host;

      // fix publicpath with absolute publicpath
      if (
        compiler.options.mode === 'development' &&
        port &&
        publicPath !== 'auto' &&
        typeof publicPath !== 'function'
      ) {
        compiler.options.output.publicPath = new URL(
          publicPath,
          `${protocol}//${host}:${port}/`,
        ).toString();

        // disable devtool, add SourceMapDevToolPlugin
        compiler.options.devtool = false;
        new webpackSource.SourceMapDevToolPlugin({
          append: `\n//# sourceMappingURL=${protocol}//${host}:${port}/[url]`,
          filename: '[file].map',
        }).apply(compiler);
      }

      // fix SOP with CORS
      if (!devServer.headers) {
        devServer.headers = {};
      }
      Object.assign(devServer.headers, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      });
    });
  }
}

export { PuzzleDevWebpackPlugin };
