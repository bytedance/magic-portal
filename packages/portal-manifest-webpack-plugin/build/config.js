/**
 * Copyright (c) 2020 Bytedance Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const { version, name, moduleName, dependencies } = require('../package.json');
const { babel } = require('@rollup/plugin-babel');
const nodeResolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const replace = require('@rollup/plugin-replace');
const alias = require('@rollup/plugin-alias');
const extensions = ['.js', '.ts'];
const env = process.env.NODE_ENV || 'development';

const banner = `/*!
* ${name} v${version}
*
* Copyright (c) 2020 Bytedance Inc.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/`;

const resolveFile = function (filePath) {
  return path.join(__dirname, '..', filePath);
};

const builds = {
  cjs: {
    output: {
      file: resolveFile('dist/index.cjs.js'),
      format: 'cjs',
    },
    external: Object.keys(dependencies),
    env,
  },
  esm: {
    output: {
      file: resolveFile('dist/index.esm.js'),
      format: 'esm',
    },
    external: Object.keys(dependencies),
    env,
  },
};

function genConfig(name) {
  const opts = builds[name];
  const config = {
    ...opts,
    cache: true,
    input: opts.input || resolveFile('src/index.ts'),
    output: {
      name: moduleName,
      ...opts.output,
      sourcemap: opts.env === 'development',
      banner,
    },
    plugins: [
      nodeResolve({ extensions }),
      commonjs({
        exclude: /\.esm\.js$/,
      }),
      babel({
        configFile: path.resolve(__dirname, '../../../babel.config.js'),
        extensions,
        exclude: 'node_modules/**',
        babelHelpers: 'runtime',
      }),
      alias({
        resolve: extensions,
        entries: [
          {
            find: '@',
            replacement: path.resolve(__dirname, '../src'),
          },
        ],
      }),
      replace({
        'process.env.NODE_ENV': JSON.stringify(opts.env),
        preventAssignment: true,
      }),
    ].concat(opts.plugins || []),
  };
  return config;
}

if (process.env.TARGET) {
  module.exports = genConfig(process.env.TARGET);
} else {
  exports.getBuild = genConfig;
  exports.getAllBuilds = () => Object.keys(builds).map(genConfig);
}
