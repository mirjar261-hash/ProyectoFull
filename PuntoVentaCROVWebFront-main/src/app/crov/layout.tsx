import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  metadataBase: new URL('https://puntoventacrov.com'),
  title: {
    default: 'Punto de Venta CROV | Plataforma de punto de venta en la nube',
    template: '%s | Punto de Venta CROV',
  },
  description:
    'Lleva tu punto de venta CROV a la nube con inventarios, facturación electrónica y reportes listos para escalar tu negocio en México.',
  keywords: [
    'punto de venta',
    'puntoventa crov',
    'sistema punto de venta mexico',
    'facturacion electronica',
    'punto de venta en la nube',
    'crov restaurante',
    'crov web',
  ],
  alternates: {
    canonical: '/crov',
    languages: {
      'es-MX': '/crov',
    },
  },
  openGraph: {
    title: 'Punto de Venta CROV | Plataforma de punto de venta en la nube',
    description:
      'Software de punto de venta CROV con IA, control de inventarios y facturación electrónica para comercio, retail y restaurantes en México.',
    url: 'https://puntoventacrov.com/crov',
    siteName: 'Punto de Venta CROV',
    locale: 'es_MX',
    type: 'website',
    images: [
      {
        url: '/asistenteCROV_upscaled.jpg',
        width: 1200,
        height: 630,
        alt: 'Punto de venta CROV funcionando en escritorio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Punto de Venta CROV | Plataforma de punto de venta en la nube',
    description:
      'Software de punto de venta CROV con IA, control de inventarios y facturación electrónica para comercio y gastronomía.',
    images: ['/asistenteCROV_upscaled.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'technology',
};

export default function CrovLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
