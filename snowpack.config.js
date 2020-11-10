/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    src: '/_dist_',
    demo: '/demo',
    public: '/'
  },
  plugins: ['@snowpack/plugin-svelte', '@snowpack/plugin-dotenv'],
  install: [],
  installOptions: {},
  devOptions: {
    port: 4000,
    open: 'none'
  },
  buildOptions: {},
  proxy: {},
  alias: {}
};
