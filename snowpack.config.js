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
  devOptions: {},
  buildOptions: {},
  proxy: {},
  alias: {}
};
