/**
 * Copyright (c) 2020 Bytedance Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import path from 'path';
import fs from 'fs-extra';
import webpack, { Compilation, Compiler } from 'webpack';
import * as HtmlWebpackPlugin from 'html-webpack-plugin';
import { portalHtmlParser, ICustomDOMMatcher } from '@magic-microservices/portal-utils';

const { RawSource } = webpack.sources;
export interface IPortalWebpackPluginOptions {
  matchers?: ICustomDOMMatcher[];
  rootId?: string;
  writeToFileEmit?: boolean;
}

// fix for html-webpack-plugin
type valueOf<T, K extends keyof T> = T[K];

interface HtmlWebpackPluginType {
  getHooks(compilation: Compilation): HtmlWebpackPlugin.Hooks;
}

interface IBeforeEmitData {
  html: string;
  outputName: string;
  plugin: HtmlWebpackPlugin;
}

class PuzzleManifestWebpackPlugin {
  public matchers: ICustomDOMMatcher[];
  public rootId: string;
  public writeToFileEmit: boolean;

  constructor(options: IPortalWebpackPluginOptions = {}) {
    const { matchers = [], rootId = 'root', writeToFileEmit = false } = options;
    this.matchers = matchers;
    this.rootId = rootId;
    this.writeToFileEmit = writeToFileEmit;
  }

  // 获取html webpack plugin的hook
  getHook(
    compiler: Compiler,
    compilation: Compilation,
  ): valueOf<HtmlWebpackPlugin.Hooks, 'beforeEmit'> | null {
    const [HtmlWebpackPlugin] = compiler.options.plugins.filter(
      (plugin) => plugin.constructor.name === 'HtmlWebpackPlugin',
    );
    if (!HtmlWebpackPlugin) {
      console.log(
        'ERROR: Unable to find an instance of HtmlWebpackPlugin in the current compilation.',
      );
      return null;
    }
    const hook = (
      HtmlWebpackPlugin.constructor as unknown as HtmlWebpackPluginType
    ).getHooks(compilation).beforeEmit;
    if (!hook) {
      if (!HtmlWebpackPlugin) {
        console.log(
          // eslint-disable-next-line quotes
          "ERROR: Unable to find a beforeEmit event of HtmlWebpackPlugin, please update HtmlWebpackPlugin's version",
        );
        return null;
      }
    }
    return hook;
  }

  // 获取文件保存路径
  getTargetDir(compiler: Compiler, data: string): string {
    const htmlName = path.basename(data);
    const htmlPath = path.dirname(data);

    return path.resolve(
      compiler.options.output.path || '',
      htmlPath,
      `portal-manifest-${htmlName}.json`,
    );
  }

  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(this.constructor.name, (compilation) => {
      const hook = this.getHook(compiler, compilation);
      if (!hook) return;

      hook.tapAsync(
        this.constructor.name,
        async (data: IBeforeEmitData, cb: () => void) => {
          const manifestFileName = this.getTargetDir(
            compiler,
            (data.plugin.options as HtmlWebpackPlugin.Options).filename as string,
          );

          const result = portalHtmlParser(data.html);

          const manifestId = path.relative(
            compiler.options.output.path || '',
            manifestFileName,
          );

          compilation.emitAsset(manifestId, new RawSource(JSON.stringify(result)));

          if (this.writeToFileEmit) {
            await fs.writeJson(manifestFileName, result);
          }

          cb();
        },
      );
    });
  }
}

export { PuzzleManifestWebpackPlugin };
