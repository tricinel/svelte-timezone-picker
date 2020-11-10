import Demo from './Demo.svelte';

const app = new Demo({ target: document.getElementById('root') });

export default app;

if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => {
    app.$destroy();
  });
}
