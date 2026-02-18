'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, MessageCircle, Building2, Code, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import DemoRequestDialog from '@/components/DemoRequestDialog';
import LandingManagerChat from '@/components/LandingManagerChat';
import LandingSalesChat from '@/components/LandingSalesChat';

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Punto de Venta CROV',
  url: 'https://puntoventacrov.com/crov',
  description:
    'Punto de Venta CROV: software de punto de venta, inventarios y facturación electrónica para negocios en México.',
  inLanguage: 'es-MX',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://puntoventacrov.com/crov?search={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
  sameAs: [
    'https://www.facebook.com/crovit',
    'https://www.instagram.com/puntoventacrov',
    'https://www.linkedin.com/company/crov',
  ],
  publisher: {
    '@type': 'Organization',
    name: 'CROV Information Technology Services',
    logo: {
      '@type': 'ImageObject',
      url: 'https://puntoventacrov.com/images/logo2.png',
    },
  },
  offers: {
    '@type': 'AggregateOffer',
    availability: 'https://schema.org/InStock',
    priceCurrency: 'MXN',
  },
};

const navigationLinks = [
  { label: 'Inicio', href: '/crov', current: true },
  { label: 'Directorio', href: '/crov/directorio', current: false },
  { label: 'Punto de venta Web', href: '/crov/punto-venta-web', current: false },
  { label: 'Punto de venta CROV', href: '/crov/punto-venta-crov', current: false },
  { label: 'CROV Restaurante', href: '/crov/restaurante', current: false },
];

const services = [
  {
    title: 'Casa de desarrollo de punto de venta',
    description:
      'Construimos soluciones tecnológicas de principio a fin: analizamos tu operación, diseñamos la arquitectura ideal y entregamos software confiable listo para escalar.',
    icon: Building2,
  },
  {
    title: 'Software POS personalizado',
    description:
      'Creamos plataformas web y móviles a la medida para automatizar procesos, integrar sistemas existentes y mejorar la experiencia de tus clientes.',
    icon: Code,
  },
  {
    title: 'Innovación continua en inventarios',
    description:
      'Combinamos analítica, inteligencia artificial y un acompañamiento cercano para que cada proyecto evolucione con las necesidades de tu negocio.',
    icon: Sparkles,
  },
];

const productCards = [
  {
    name: 'Punto de venta Web',
    description:
      'Vende y administra tu negocio desde cualquier dispositivo con reportes claros y asistentes inteligentes.',
    href: '/crov/punto-venta-web',
  },
  {
    name: 'Punto de venta CROV',
    description:
      'Una estación robusta para sucursales con alto volumen que necesitan precisión y control total.',
    href: '/crov/punto-venta-crov',
  },
  {
    name: 'CROV Restaurante',
    description:
      'Gestiona mesas, comandas y cocina en tiempo real para ofrecer experiencias gastronómicas memorables.',
    href: '/crov/restaurante',
  },
];

const successVideos = [
  { id: 'w7pUtcHsVTQ', title: 'Caso de éxito 1' },
  { id: 'A68D3QbUIyo', title: 'Caso de éxito 2' },
  { id: 'amv62RYxe20', title: 'Caso de éxito 3' },
  { id: 'VITi8KgSLaM', title: 'Caso de éxito 4' },
  { id: 'wp8pdCI_KyI', title: 'Caso de éxito 5' },
  { id: 'jOBFQewWXEM', title: 'Caso de éxito 6' },
  { id: 'IN7PmuNYvXw', title: 'Caso de éxito 7' },
  { id: 'pktsXovooKU', title: 'Caso de éxito 8' },
];

export default function CrovHomeContent() {
  const itemsPerSlide = 3;
  const slides = useMemo(() => {
    const grouped: typeof successVideos[][] = [];

    for (let index = 0; index < successVideos.length; index += itemsPerSlide) {
      grouped.push(successVideos.slice(index, index + itemsPerSlide));
    }

    return grouped;
  }, []);

  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = slides.length;

  const goToSlide = (target: number) => {
    if (totalSlides === 0) {
      return;
    }

    const normalized = (target + totalSlides) % totalSlides;
    setCurrentSlide(normalized);
  };

  const handlePrev = () => {
    goToSlide(currentSlide - 1);
  };

  const handleNext = () => {
    goToSlide(currentSlide + 1);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
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
                  alt="Logotipo de CROV, software de punto de venta"
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

          </nav>

          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-6">
              <p className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-600">
                Somos la casa de desarrollo CROV
              </p>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Punto de venta CROV con innovación y software POS personalizado para tu empresa
              </h1>
              <p className="max-w-xl text-lg text-slate-600">
                En CROV diseñamos productos digitales y plataformas de punto de venta que conectan tus procesos, equipos y clientes. Nuestro software POS mantiene tus inventarios y facturación electrónica bajo control con inteligencia artificial lista para operar en el día a día.
              </p>
              <div className="flex flex-wrap gap-4">
                <DemoRequestDialog
                  triggerLabel="Agenda una consultoría de software POS"
                  triggerClassName="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-orange-500 via-orange-500 to-orange-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-orange-200 transition hover:shadow-orange-300"
                />

              </div>
            </div>
            <div className="relative">
              <div className="absolute -left-8 -top-8 h-40 w-40 rounded-full bg-orange-200/70 blur-3xl" aria-hidden />
              <div className="absolute -right-10 -bottom-16 h-52 w-52 rounded-full bg-orange-100 blur-3xl" aria-hidden />
              <div className="relative flex flex-col items-center gap-6 rounded-3xl border border-orange-100 bg-white p-10 text-center shadow-xl">
                <Image
                  src="/images/logo2.png"
                  alt="Logotipo de CROV, plataforma de inventarios y punto de venta"
                  width={160}
                  height={160}
                  className="h-24 w-24"
                />
                <p className="text-base text-slate-600">
                  Acompañamos a negocios de toda la república mexicana con tecnología confiable y un equipo que entiende los retos operativos del día a día.
                </p>
                <div className="flex flex-col gap-2 text-sm text-slate-500">
                  <span className="font-semibold text-orange-500">+10 años construyendo soluciones digitales</span>
                  <span>Equipo multidisciplinario de desarrolladores, consultores y especialistas en retail.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-6 py-20 sm:px-10">
        <div className="grid gap-8 lg:grid-cols-3">
          {services.map((service) => (
            <div key={service.title} className="rounded-2xl border border-orange-100 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50">
                <service.icon className="h-6 w-6 text-orange-500" />
              </span>
            <h3 className="text-lg font-semibold text-slate-900">{service.title}</h3>
            <p className="mt-3 text-sm text-slate-600">{service.description}</p>
          </div>
        ))}
        </div>
      </section>

      <section className="bg-slate-50/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-20 sm:px-10">
          <div className="max-w-3xl space-y-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-orange-500">Nuestros productos</p>
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">Soluciones de punto de venta y software POS listas para tu operación</h2>
            <p className="text-base text-slate-600">
              Desarrollamos un ecosistema de productos para cada etapa de tu negocio. Conecta tus sucursales, digitaliza tus procesos y toma decisiones con información confiable.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {productCards.map((product) => (
              <div key={product.name} className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{product.name}</h3>
                  <p className="mt-3 text-sm text-slate-600">{product.description}</p>
                </div>
                <Link
                  href={product.href}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-orange-600 transition hover:text-orange-700"
                >
                  Conocer más
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-20 sm:px-10">
        <div className="flex flex-col gap-12">
          <div className="max-w-3xl space-y-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-orange-500">Casos de éxito</p>
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">Historias de clientes que crecen con CROV y fortalecen sus inventarios</h2>
            <p className="text-base text-slate-600">
              Conoce algunas de las experiencias de negocio que se transformaron con nuestra tecnología y acompañamiento.
            </p>
          </div>
          <div className="relative">
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {slides.map((group, slideIndex) => (
                  <div key={slideIndex} className="grid w-full shrink-0 grid-cols-1 gap-6 md:grid-cols-3">
                    {group.map((video) => (
                      <div
                        key={video.id}
                        className="group overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                      >
                        <div className="relative aspect-[9/16] w-full overflow-hidden bg-slate-900">
                          <iframe
                            title={video.title}
                            src={`https://www.youtube.com/embed/${video.id}`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            loading="lazy"
                            className="h-full w-full"
                          />
                        </div>
                        <div className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-900">{video.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Casos reales que muestran cómo nuestras soluciones impulsan la operación diaria.
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {totalSlides > 1 ? (
              <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex justify-center gap-2 md:order-2">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-orange-200 bg-white text-orange-600 transition hover:bg-orange-50"
                    aria-label="Ver videos anteriores"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-orange-200 bg-white text-orange-600 transition hover:bg-orange-50"
                    aria-label="Ver videos siguientes"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex justify-center gap-2 md:order-1 md:justify-start">
                  {slides.map((_, index) => (
                    <button
                      key={`indicator-${index}`}
                      type="button"
                      onClick={() => goToSlide(index)}
                      className={`h-2 w-8 rounded-full transition ${
                        index === currentSlide ? 'bg-orange-500' : 'bg-orange-200'
                      }`}
                      aria-label={`Ir al grupo ${index + 1}`}
                      aria-pressed={index === currentSlide}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="bg-slate-900 py-20 text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 sm:px-10 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-orange-400">Nuestros Clientes</p>
            <h2 className="text-3xl font-bold sm:text-4xl">CROV presente junto a negocios que usan nuestro punto de venta en todo México</h2>
            <p className="text-base text-slate-300">
              Trabajamos con cadenas comerciales, comercios independientes y restaurantes que confían en nuestras plataformas para operar día con día. Conoce algunas de las regiones donde colaboramos.
            </p>
          </div>
          <div className="flex-1 overflow-hidden rounded-3xl border border-orange-400/40 shadow-2xl">
            <iframe
              title="Mapa de clientes CROV"
              src="https://www.google.com/maps/d/u/0/embed?mid=16aYf13x9g5Y58e_vI0v-FxUw4FMyIuA&hl=es&z=7"
              allowFullScreen
              loading="lazy"
              className="h-[320px] w-full border-0"
            />
          </div>

        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-12 text-sm text-slate-500 sm:px-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/images/logo2.png"
              alt="Logotipo de CROV, software POS mexicano"
              width={40}
              height={40}
              className="h-8 w-8"
            />
            <span>© {new Date().getFullYear()} CROV. Tecnología creada en México.</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/aviso-de-privacidad" className="transition hover:text-orange-600">
              Aviso de privacidad
            </Link>
            <Link href="/terminos" className="transition hover:text-orange-600">
              Términos y condiciones
            </Link>
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
