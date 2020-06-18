import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
import json from '@rollup/plugin-json';

import pkg from './package.json';

const serve = () => {
  let started = false;

  return {
    writeBundle() {
      if (!started) {
        started = true;

        // eslint-disable-next-line global-require,import/no-nodejs-modules
        require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
          stdio: ['ignore', 'inherit', 'inherit'],
          shell: true
        });
      }
    }
  };
};

const config = {
  input: 'demo/main.js',
  output: {
    sourcemap: true,
    file: 'demo/build/bundle.js',
    format: 'iife',
    name: pkg.name
      .replace(/^\w/, (m) => m.toUpperCase())
      .replace(/-\w/g, (m) => m[1].toUpperCase())
  },
  plugins: [
    json(),
    svelte({
      dev: true,
      css: (css) => css.write('demo/build/bundle.css')
    }),
    resolve({
      browser: true,
      dedupe: ['svelte']
    }),
    commonjs(),
    serve(),
    livereload('demo')
  ],
  watch: {
    clearScreen: false
  }
};

export default config;
