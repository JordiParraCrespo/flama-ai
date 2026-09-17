const designSystem = require('@flama/design-system-mobile/tailwind-config');
const frontendMobile = require('@flama/frontend-mobile/tailwind-config');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './{app,features,lib}/**/*.{ts,tsx}',
    ...designSystem.content,
    ...frontendMobile.content,
  ],
  presets: [designSystem],
};
