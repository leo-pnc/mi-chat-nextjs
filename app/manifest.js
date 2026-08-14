export default function manifest() {
  return {
    name: 'Chat Pareja',
    short_name: 'Chat Pareja',
    description: 'Chat privado para dos personas',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0712',
    theme_color: '#1c1330',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
