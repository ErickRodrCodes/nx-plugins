import { defineConfig } from 'vitepress'
import { groupIconMdPlugin, groupIconVitePlugin, localIconLoader } from 'vitepress-plugin-group-icons'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Nx Electron Vite",
  description: "A Plugin for Nx to create Electron applications with the power of Vite",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/introduction' }
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is Nx Electron Vite?', link: '/what-is-nx-electron-vite' },
          { text: 'Getting Started', link: '/getting-started' },
        ]
      },
      {
        text: 'Working with Nx Electron Vite',
        items: [
          { text: 'Scaffolding a Project', link: '/scaffolding-a-project' },
          { text: 'Development Workflow', link: '/development-workflow' },
          { text: 'Production Builds', link: '/production-builds' },
        ]
      },
      {
        text: 'Executors and Generators',
        items: [
          {
            text: 'Generators',
            items:[
              { text: 'init', link: '/generators/init' },
              { text: 'setup-project', link: '/generators/setup-project' },
              { text: 'build-native', link: '/generators/build-native' },
            ]
          },
          {
            text: 'Executors',
            items:[
              { text: 'build-electron', link: '/executors/build-electron' },
              { text: 'build-icon', link: '/executors/build-icon' },
            ]
          },
        ]
      },
      {
        text: 'API Reference',
        link: '/api-reference'
      },
      { text: 'Architecture Pattern', link: '/architecture-pattern' },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025-present Erick Rodriguez'
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/ErickRodrCodes/nx-plugins' }
    ],
    search: {
      provider: 'local'
    },
  },
  markdown: {
    config: (md) => {
      md.use(groupIconMdPlugin)
    }
  },
  vite: {
    plugins: [
      groupIconVitePlugin({
        customIcon: {
          'nx': localIconLoader(import.meta.url, 'assets/nx.svg'),
          'nx global': localIconLoader(import.meta.url, 'assets/nx.svg')
        }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any
    ]
  }
})
