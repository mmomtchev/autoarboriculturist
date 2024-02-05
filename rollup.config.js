const path = require('path');
const ts = require('@rollup/plugin-typescript');
const resolve = require('@rollup/plugin-node-resolve');
const builtins = require('builtin-modules');
const commonjs = require('@rollup/plugin-commonjs');
const json = require('@rollup/plugin-json');


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
