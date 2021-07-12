/**
 * Copyright (c) 2020 Bytedance Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import webpack, { Compiler } from 'webpack';

class PuzzleDevWebpackPlugin {
  apply(compiler: Compiler): void {
    // for dev
    compiler.hooks.environment.tap(this.constructor.name, () => {
      if (!compiler.options.devServer) {
        compiler.options.devServer = {};
      }
      const devServer = compiler.options.devServer;

      const port = process.env.PORT || devServer.port;
      const protocol = process.env.HTTPS || devServer.https ? 'https:' : 'http:';
      const host = devServer.host;
      const publicPath = compiler.options.output.publicPath;
      // 修正 publicPath 相关路径
      if (
        compiler.options.mode === 'development' &&
        port &&
        (publicPath === undefined || publicPath === 'auto')
      ) {
        compiler.options.output.publicPath = `${protocol}//${host}:${port}/`;

        // 禁用 devtool，启用 SourceMapDevToolPlugin
        compiler.options.devtool = false;
        new webpack.SourceMapDevToolPlugin({
          append: `\n//# sourceMappingURL=${protocol}//${host}:${port}/[url]`,
          filename: '[file].map',
        }).apply(compiler);
      }

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
