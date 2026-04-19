export const metadata = {
  title: 'A23 Satta - Download App',
  description: 'Download A23 Satta - The most trusted platform for Satta Matka results, live updates, and charts.',
  openGraph: {
    title: 'A23 Satta',
    description: 'Download A23 Satta app. The most trusted platform for Satta Matka results, live updates, and charts.',
    images: [
      {
        url: 'https://a23satta.com/icons/a23_icon_512.png',
        width: 512,
        height: 512,
        alt: 'A23 Satta App',
        type: 'image/png',
      },
    ],
    type: 'website',
    siteName: 'A23 Satta',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'A23 Satta - Download App',
    description: 'Download A23 Satta app. The most trusted platform for Satta Matka results.',
    images: ['https://a23satta.com/icons/a23_icon_512.png'],
  },
  icons: {
    icon: '/icons/a23_icon_192.png',
    apple: '/icons/a23_icon_192.png',
  },
};

export default function DownloadLayout({ children }) {
  return children;
}
