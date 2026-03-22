export default function manifest() {
  return {
    name: 'A23 Satta',
    short_name: 'A23 Satta',
    description: 'A23 Satta user app',
    start_url: '/',
    display: 'standalone',
    background_color: '#eef1f5',
    theme_color: '#111111',
    orientation: 'portrait',
    icons: [
      {
        src: '/images/logo.png',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  };
}