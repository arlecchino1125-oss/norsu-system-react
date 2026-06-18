import baseConfig from '../../../tailwind.config.js';

export default {
  ...baseConfig,
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../../src/**/*.{js,ts,jsx,tsx}',
  ],
};
