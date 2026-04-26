import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'SRE Study Guide',
  tagline: 'A canonical SRE and platform engineering learning system from basics to advanced practice',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'http://localhost',
  baseUrl: '/',

  organizationName: 'jithinpnjm',
  projectName: 'SRE-Challenges',

  onBrokenLinks: 'warn',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: '../interview-prep',
          sidebarPath: './sidebars.ts',
          routeBasePath: 'docs',
          editUrl: undefined,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],
  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'mlops',
        path: './generated-docs/mlops',
        routeBasePath: 'mlops-docs',
        sidebarPath: './sidebarsMlops.ts',
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'aiops',
        path: './generated-docs/aiops',
        routeBasePath: 'aiops-docs',
        sidebarPath: './sidebarsAiops.ts',
      },
    ],
  ],
  themes: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        indexDocs: true,
        indexBlog: false,
        docsRouteBasePath: ['/docs', '/mlops-docs', '/aiops-docs'],
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
      },
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'SRE Study Guide',
      logo: {
        alt: 'SRE Study Guide Logo',
        src: 'img/logo.svg',
      },
      items: [
        {to: '/docs/learning-path', label: 'Roadmap', position: 'left'},
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Foundations',
        },
        {to: '/today', label: 'Study Sessions', position: 'left'},
        {to: '/workspace', label: 'Practice Workspace', position: 'left'},
        {
          label: 'Supplemental',
          position: 'left',
          items: [
            {to: '/library', label: 'Supplemental Archive'},
            {to: '/docs/nebius/README', label: 'Nebius Sprint'},
            {to: '/mlops', label: 'MLOps Hub'},
            {to: '/mlops-docs/overview', label: 'MLOps Docs'},
            {to: '/aiops', label: 'AIOps Hub'},
            {to: '/aiops-docs/overview', label: 'AIOps Docs'},
          ],
        },
        {type: 'search', position: 'right'},
        {
          href: 'https://github.com/jithinpnjm/SRE-Challenges',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Core Path',
          items: [
            {
              label: 'Canonical Roadmap',
              to: '/docs/learning-path',
            },
            {
              label: 'Foundations',
              to: '/docs/foundations/linux-and-network-administration',
            },
            {
              label: 'Study Sessions',
              to: '/today',
            },
          ],
        },
        {
          title: 'Practice',
          items: [
            {
              label: 'Practice Workspace',
              to: '/workspace',
            },
            {
              label: 'Hands-On Labs',
              to: '/docs/hands-on-labs',
            },
            {
              label: 'Mock Interviews',
              to: '/docs/mock-interviews/01-nebius-linux-kubernetes-troubleshooting',
            },
          ],
        },
        {
          title: 'Supplemental',
          items: [
            {
              label: 'Supplemental Archive',
              to: '/library',
            },
            {
              label: 'Nebius Sprint',
              to: '/docs/nebius/README',
            },
            {
              label: 'MLOps Hub',
              to: '/mlops',
            },
            {
              label: 'AIOps Hub',
              to: '/aiops',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Sources',
              to: '/docs/sources-and-references',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/jithinpnjm/SRE-Challenges',
            },
          ],
        },
      ],
      copyright: `Built locally for SRE learning and platform engineering practice with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
