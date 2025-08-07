// https://vitepress.dev/guide/custom-theme
import 'virtual:group-icons.css'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import './style.css'

import 'viewerjs/dist/viewer.min.css'
import { useRoute } from 'vitepress'
import imageViewer from 'vitepress-plugin-image-viewer'
import vImageViewer from 'vitepress-plugin-image-viewer/lib/vImageViewer.vue'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // https://vitepress.dev/guide/extending-default-theme#layout-slots
    })
  },
  enhanceApp(ctx) {
    DefaultTheme.enhanceApp(ctx);
    // Register global components, if you don't want to use it, you don't need to add it
    ctx.app.component('vImageViewer', vImageViewer);
    // ...
  },
  setup() {
    // Get route
    const route = useRoute();
    // Using
    imageViewer(route);
}
} satisfies Theme
