import { defineAsyncComponent, type Component } from 'vue';
export const lazy = (loader: () => Promise<{ default: Component }>) =>
  defineAsyncComponent({ loader, delay: 150, timeout: 30_000 });
