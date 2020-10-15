import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';

import pkg from './package.json';

const config = {
  input: 'src/index.js',
  output: [
    {
      sourcemap: true,
      file: pkg.module,
      format: 'es'
    },
    {
      sourcemap: true,
      file: pkg.main,
      format: 'umd',
      name: pkg.name
        .replace(/^\w/, (m) => m.toUpperCase())
        .replace(/-\w/g, (m) => m[1].toUpperCase())
    }
  ],
  plugins: [
    svelte(),
    resolve({
      browser: true,
      dedupe: ['svelte']
    }),
    commonjs(),
    terser()
  ]
};

export default config;
