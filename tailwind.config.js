/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)'],
        mono: ['var(--font-mono)'],
      },
      colors: {
        // Rapsodo brand
        'rap-red': '#CD1B32',
        'rap-red-hover': '#B81729',
        'rap-red-dark': '#A41E22',
        'rap-black': '#000000',
        // Sport — Golf
        'sport-golf': '#1BE377',
        'sport-golf-400': '#1AFF84',
        'sport-golf-600': '#1CB864',
        'sport-golf-700': '#1D804A',
        // Neutral ramp
        'neutral-0': '#FFFFFF',
        'neutral-25': '#FCFCFC',
        'neutral-50': '#F7F7F7',
        'neutral-75': '#F5F5F5',
        'neutral-100': '#EDEDED',
        'neutral-150': '#E4E5E9',
        'neutral-200': '#DFDFDF',
        'neutral-300': '#F2F4F7',
        'neutral-400': '#9CA3AF',
        'neutral-500': '#8D94A2',
        'neutral-600': '#737373',
        'neutral-700': '#5C616B',
        'neutral-800': '#404040',
        'neutral-850': '#262626',
        'neutral-900': '#171717',
        'neutral-950': '#0A0A0A',
        // Semantic
        success: '#16A34A',
        'success-bg': '#DCFCE7',
        warning: '#F59E0B',
        'warning-bg': '#FEF3C7',
        danger: '#DD393A',
        'danger-bg': '#FEE2E2',
        info: '#2B73DF',
        'info-bg': '#DBEAFE',
        // Surfaces / text aliases
        'text-primary': '#0A0A0A',
        'text-secondary': '#5C616B',
        'text-tertiary': '#8D94A2',
        'border-default': '#DFDFDF',
        'border-subtle': '#E4E5E9',
      },
      borderRadius: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
        '3xl': '40px',
        pill: '9999px',
      },
      letterSpacing: {
        cta: '0.07em',
        caps: '0.1em',
        tight: '-0.02em',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(16,24,40,0.05)',
        sm: '0 1px 3px 0 rgba(16,24,40,0.10), 0 1px 2px -1px rgba(16,24,40,0.06)',
        md: '0 4px 8px -2px rgba(16,24,40,0.10), 0 2px 4px -2px rgba(16,24,40,0.06)',
        lg: '0 12px 16px -4px rgba(16,24,40,0.08), 0 4px 6px -2px rgba(16,24,40,0.03)',
      },
    },
  },
  plugins: [],
};
