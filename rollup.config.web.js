import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import json from '@rollup/plugin-json';
import pkg from './package.json';

const config = {
  input: 'src/index.js',
  output: {
    sourcemap: true,
    file: pkg.browser,
    format: 'iife',
    name: pkg.name
      .replace(/^\w/, (m) => m.toUpperCase())
      .replace(/-\w/g, (m) => m[1].toUpperCase())
  },
  plugins: [
    json(),
    svelte({
      dev: false,
      customElement: true,
      tag: 'timezone-picker'
    }),
    resolve({
      browser: true,
      dedupe: ['svelte']
    }),
    commonjs(),
    terser()
  ]
};

export default config;
