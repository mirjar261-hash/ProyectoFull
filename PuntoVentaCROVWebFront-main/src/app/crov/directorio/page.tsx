import type { Metadata } from 'next';
import DirectoryPageContent from './DirectoryPageContent';

export const metadata: Metadata = {
  title: 'Directorio CROV | Clientes y partners del punto de venta CROV',
  description:
    'Explora el directorio CROV y conecta con negocios que ya operan con el punto de venta CROV. Encuentra referencias reales y solicita una demo para tu empresa.',
  alternates: {
    canonical: 'https://puntoventacrov.com/crov/directorio',
  },
  keywords: [
    'directorio clientes punto de venta crov',
    'referencias de software de punto de venta crov',
    'casos de éxito crov punto de venta',
    'solicitar contacto clientes crov',
  ],
};

export default function CrovDirectoryPage() {
  return <DirectoryPageContent />;
}
