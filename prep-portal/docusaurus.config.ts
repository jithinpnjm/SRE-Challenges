import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'SRE Interview Prep Portal',
  tagline: 'Senior to staff-level SRE, platform, Kubernetes, Linux, networking, and cloud architecture practice',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'http://localhost',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'jithinpjoseph',
  projectName: 'SRE-Challenges',

  onBrokenLinks: 'warn',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
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
  themes: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        indexDocs: true,
        indexBlog: false,
        docsRouteBasePath: ['/docs'],
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
      },
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'SRE Prep Portal',
      logo: {
        alt: 'SRE Prep Portal Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Prep Pack',
        },
        {to: '/today', label: 'Today', position: 'left'},
        {type: 'search', position: 'right'},
        {to: '/workspace', label: 'Answer Workspace', position: 'left'},
        {to: '/docs/learning-path', label: 'Learning Path', position: 'left'},
        {
          href: 'https://github.com/jithinpjoseph/SRE-Challenges',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Learning Path',
              to: '/docs/learning-path',
            },
            {
              label: 'Hands-On Labs',
              to: '/docs/hands-on-labs',
            },
          ],
        },
        {
          title: 'Practice',
          items: [
            {
              label: 'Answer Workspace',
              to: '/workspace',
            },
            {
              label: 'Cloud Design Labs',
              to: '/docs/hands-on-labs/cloud-design',
            },
            {
              label: 'Kubernetes Labs',
              to: '/docs/hands-on-labs/kubernetes',
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
              href: 'https://github.com/jithinpjoseph/SRE-Challenges',
            },
          ],
        },
      ],
      copyright: `Built locally for interview practice with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
