import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, MessageCircle, NotebookPen, ReceiptText, UtensilsCrossed } from 'lucide-react';
import DemoRequestDialog from '@/components/DemoRequestDialog';
import LandingSalesChat from '@/components/LandingSalesChat';

export const metadata: Metadata = {
  title: 'CROV Restaurante | Punto de venta para mesas, barra y cocina',
  description:
    'Optimiza tu sala, barra y cocina con CROV Restaurante: comandas digitales, control de mesas y reportes por platillo. Agenda una demostración y acelera el servicio en todas tus sucursales.',
  alternates: {
    canonical: 'https://puntoventacrov.com/crov/restaurante',
  },
  keywords: [
    'punto de venta para restaurantes crov',
    'control de mesas y comandas crov',
    'software restaurante con reportes por platillo',
    'demo crov restaurante',
    'acelerar servicio en barra y cocina crov',
  ],
};

const navigationLinks = [
  { label: 'Inicio', href: '/crov', current: false },
  { label: 'Directorio', href: '/crov/directorio', current: false },
  { label: 'Punto de venta Web', href: '/crov/punto-venta-web', current: false },
  { label: 'Punto de venta CROV', href: '/crov/punto-venta-crov', current: false },
  { label: 'CROV Restaurante', href: '/crov/restaurante', current: true },
];

const restaurantHighlights = [
  {
    title: 'Control total de mesas y comandas',
    description:
      'Coordina tu sala, barra y cocina desde un panel intuitivo con actualizaciones en tiempo real.',
    icon: UtensilsCrossed,
  },
  {
    title: 'Menús dinámicos y promociones',
    description:
      'Actualiza platillos, combos y precios desde cualquier dispositivo y aplícalos de inmediato en todas tus sucursales.',
    icon: NotebookPen,
  },
  {
    title: 'Reportes especializados para restaurantes',
    description:
      'Analiza rotación de mesas, ticket promedio y rendimiento por platillo para tomar decisiones con datos.',
    icon: ReceiptText,
  },
];

export default function CrovRestaurantePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="relative overflow-hidden bg-gradient-to-b from-white via-orange-50/50 to-white">
        <div
          className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.18),_transparent_65%)]"
          aria-hidden
        />
        <div className="absolute -top-48 left-1/2 h-96 w-[110rem] -translate-x-1/2 rounded-full bg-orange-100/60 blur-3xl" aria-hidden />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pb-20 pt-16 sm:px-10 lg:pt-24">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-lg font-semibold">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-2 shadow-lg shadow-orange-100">
                <Image
                  src="/images/logo2.png"
                  alt="Icono CROV"
                  width={48}
                  height={48}
                  className="h-8 w-8"
                  priority
                />
              </span>
            </div>
            <div className="hidden items-center gap-8 lg:flex">
              {navigationLinks.map((item) => {
                const baseClasses = 'text-sm font-medium transition hover:text-orange-600';
                const classes = `${item.current ? 'text-orange-600' : 'text-slate-600'} ${baseClasses}`;

                if (item.href.startsWith('#')) {
                  return (
                    <a key={item.label} href={item.href} className={classes}>
                      {item.label}
                    </a>
                  );
                }

                return (
                  <Link key={item.label} href={item.href} className={classes}>
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Link
                href="https://drive.google.com/uc?export=download&id=13lEPQStd1cGZ_8lPDYgO-7LomPKiIoZr"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 via-orange-500 to-orange-600 px-7 py-3 text-base font-bold text-white shadow-lg shadow-orange-200 transition hover:shadow-orange-300"
              >
                Descargar Demo
                <ArrowRight className="h-5 w-5" />
            </Link>

            </div>
          </nav>

          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-6">
              <p className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-600">
                CROV Restaurante
              </p>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                La experiencia gastronómica conectada
              </h1>
              <p className="max-w-xl text-lg text-slate-600">
                Diseñamos CROV Restaurante para coordinar tu operación gastronómica de inicio a fin. Gestiona mesas, comandas, menús y reportes desde un único panel y ofrece un servicio consistente en cada turno.
              </p>
              <div className="grid gap-6 pt-8 sm:grid-cols-3">
                {restaurantHighlights.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
                    <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50">
                      <item.icon className="h-6 w-6 text-orange-500" />
                    </span>
                    <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-4">
                <DemoRequestDialog
                  triggerLabel="Solicitar demo para restaurante"
                  triggerClassName="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-orange-500 via-orange-500 to-orange-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-orange-200 transition hover:shadow-orange-300"
                />
              </div>
            </div>
            <div className="relative">
              <div className="absolute -left-8 -top-8 h-40 w-40 rounded-full bg-orange-200/70 blur-3xl" aria-hidden />
              <div className="absolute -right-10 -bottom-16 h-52 w-52 rounded-full bg-orange-100 blur-3xl" aria-hidden />
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-xl sm:p-4">
                <div className="relative overflow-hidden rounded-2xl pb-[56.25%]">
                  <iframe
                    src="https://www.youtube.com/embed/c52AwjwvWVI?rel=0"
                    title="Video demostrativo de CROV Restaurante"
                    className="absolute inset-0 h-full w-full rounded-2xl"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-16 sm:px-10">
        <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Operación gastronómica sin fricciones</h2>
          <p className="text-base text-slate-600">
            Controla la disponibilidad de tus mesas, da seguimiento a cada comanda y mantén sincronizadas a la sala, la barra y la cocina en tiempo real. Ajusta tu menú en segundos y ejecuta promociones especiales en todos tus canales sin depender de terceros.
          </p>
          <p className="text-base text-slate-600">
            Con reportes especializados para restaurantes podrás analizar la rotación de mesas, medir el ticket promedio y conocer el rendimiento de cada platillo para tomar decisiones con datos confiables.
          </p>
        </section>
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="relative pb-[56.25%]">
            <iframe
              src="https://www.youtube.com/embed/6FMWk_Uf4Hg?rel=0"
              title="Testimonio CROV Restaurante"
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </section>
        <section className="flex flex-col gap-6 rounded-3xl border border-orange-200 bg-gradient-to-br from-white via-orange-50/60 to-white p-8 text-center shadow-lg">
          <h2 className="text-3xl font-bold text-slate-900">¿Listo para conectar tu restaurante con CROV?</h2>
          <p className="mx-auto max-w-2xl text-base text-slate-600">
            Nuestro equipo está listo para ayudarte a transformar tu servicio. Solicita una demostración personalizada para descubrir cómo CROV Restaurante coordina tu operación, elimina errores y asegura experiencias consistentes en cada turno.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <DemoRequestDialog
              triggerLabel="Solicitar demo para restaurante"
              triggerClassName="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-orange-500 via-orange-500 to-orange-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-orange-200 transition hover:shadow-orange-300"
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-orange-50">
              <Image
                src="/images/logo2.png"
                alt="Logo CROV"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
                priority
              />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">CROV</p>
              <p className="text-xs text-slate-500">© {new Date().getFullYear()} CROV. Todos los derechos reservados.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
            <Link
              href="/aviso-de-privacidad"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900"
            >
              Aviso de privacidad
            </Link>
            <Link
              href="/terminos"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900"
            >
              Términos de servicio
            </Link>
            <a href="mailto:ventas@crovmx.com" className="hover:text-slate-900">
              ventas@crovmx.com
            </a>
          </div>
        </div>
      </footer>
      <a
        href="https://wa.me/3112887082?text=Hola,%20quiero%20más%20información%20sobre%20el%20punto%20de%20venta%20Web"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full border border-transparent bg-[#25D366] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#1ebe5d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]"
        aria-label="Enviar mensaje por WhatsApp"
      >
        <MessageCircle className="h-5 w-5 text-green-600" />
        Enviar mensaje
      </a>
    </div>
  );
}
