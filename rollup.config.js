const path = require('path');
const ts = require('@rollup/plugin-typescript');
const resolve = require('@rollup/plugin-node-resolve');
const builtins = require('builtin-modules');
const commonjs = require('@rollup/plugin-commonjs');
const json = require('@rollup/plugin-json');
const replace = require('@rollup/plugin-replace');

module.exports = [
  {
    input: path.resolve(__dirname, 'src', 'index.ts'),
    external: builtins,
    plugins: [
      ts(),
      commonjs({
        include: ['node_modules/**', 'build/*']
      }),
      json(),
      resolve({ prefereBuiltins: true }),
      replace({
        'node-gyp/bin/node-gyp.js': '/usr/lib/node_modules/node-gyp/bin/node-gyp.js',
        preventAssignment: true
      })
    ],
    output: [
      {
        file: path.resolve(__dirname, 'dist', 'index.js'),
        format: 'cjs',
        sourcemap: true
      },
    ]
  }
];
