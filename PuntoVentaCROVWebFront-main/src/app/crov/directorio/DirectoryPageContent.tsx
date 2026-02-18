'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  ExternalLink,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Search,
} from 'lucide-react';

const navigationLinks = [
  { label: 'Inicio', href: '/crov', current: false },
  { label: 'Directorio', href: '/crov/directorio', current: true },
  { label: 'Punto de venta Web', href: '/crov/punto-venta-web', current: false },
  { label: 'Punto de venta CROV', href: '/crov/punto-venta-crov', current: false },
  { label: 'CROV Restaurante', href: '/crov/restaurante', current: false },
];

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const DIRECTORY_LOGO_AUTH_TOKEN =
  process.env.NEXT_PUBLIC_INTERNAL_TOKEN?.trim() || null;

const getDirectoryLogoAuthToken = (): string | null => {
  if (DIRECTORY_LOGO_AUTH_TOKEN) {
    return DIRECTORY_LOGO_AUTH_TOKEN;
  }

  if (typeof window !== 'undefined') {
    const storedToken = window.localStorage.getItem('internalToken');
    return storedToken?.trim() ? storedToken : null;
  }

  return null;
};

const CLIENT_LOGO_REGION =
  process.env.NEXT_PUBLIC_CLIENTES_CROV_LOGOS_REGION?.trim() || 'us-east-2';
const CLIENT_LOGO_BUCKET =
  process.env.NEXT_PUBLIC_CLIENTES_CROV_LOGOS_BUCKET?.trim() || null;

const joinUrl = (base: string, path: string): string => {
  const normalizedBase = base.replace(/\/+$/, '');
  const normalizedPath = path.replace(/^\/+/, '');
  return normalizedPath ? `${normalizedBase}/${normalizedPath}` : normalizedBase;
};

const buildBucketBaseUrl = (bucket: string | null | undefined): string | null => {
  if (!bucket) {
    return null;
  }

  const trimmed = bucket.trim();
  if (!trimmed || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/+$/, '');
  }

  if (trimmed.startsWith('s3://')) {
    return buildBucketBaseUrl(trimmed.slice(5));
  }

  const sanitized = trimmed.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!sanitized) {
    return null;
  }

  if (sanitized.includes('amazonaws.com')) {
    return `https://${sanitized}`.replace(/\/+$/, '');
  }

  const [bucketName, ...prefixParts] = sanitized.split('/');
  if (!bucketName) {
    return null;
  }

  const base = `https://${bucketName}.s3.${CLIENT_LOGO_REGION}.amazonaws.com`;
  const prefix = prefixParts.join('/');

  return prefix ? joinUrl(base, prefix) : base;
};

const DEFAULT_LOGO_BASE_URL =
  process.env.NEXT_PUBLIC_CLIENTES_CROV_LOGOS_BASE_URL?.trim() ||
  (CLIENT_LOGO_BUCKET ? buildBucketBaseUrl(CLIENT_LOGO_BUCKET) : null);

const resolveLogoUrl = (
  value: string | null,
  bucketValue?: string | null,
): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
    return null;
  }

  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  if (/^(?:https?:)?\/\//i.test(trimmed)) {
    return trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
  }

  if (trimmed.startsWith('s3://')) {
    const withoutScheme = trimmed.slice(5);
    if (!withoutScheme) {
      return null;
    }
    const [bucketPart, ...keyParts] = withoutScheme.split('/');
    const key = keyParts.join('/');
    const bucketBase =
      buildBucketBaseUrl(bucketValue) ??
      buildBucketBaseUrl(bucketPart) ??
      DEFAULT_LOGO_BASE_URL;
    if (!bucketBase || !key) {
      return null;
    }
    const encodedKey = key
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    return joinUrl(bucketBase, encodedKey);
  }

  if (trimmed.includes('amazonaws.com')) {
    const normalized = trimmed.startsWith('http')
      ? trimmed
      : `https://${trimmed.replace(/^\/+/, '')}`;
    return normalized.replace(/\/+$/, '');
  }

  const sanitizedPath = trimmed.replace(/^\/+/, '');

  const buildUrlWithBase = (base: string | null, path: string): string | null => {
    if (!base) {
      return null;
    }

    if (!path) {
      return base;
    }

    const encodedPath = path
      .split('/')
      .filter((segment) => segment.length > 0)
      .map((segment) => encodeURIComponent(segment))
      .join('/');

    return joinUrl(base, encodedPath);
  };

  const primaryBase = buildBucketBaseUrl(bucketValue) ?? DEFAULT_LOGO_BASE_URL;
  const primaryUrl = buildUrlWithBase(primaryBase, sanitizedPath);
  if (primaryUrl) {
    return primaryUrl;
  }

  if (!sanitizedPath) {
    return null;
  }

  const [bucketCandidate, ...keyParts] = sanitizedPath.split('/');
  if (!bucketCandidate) {
    return null;
  }

  const fallbackBase = buildBucketBaseUrl(bucketCandidate);
  if (!fallbackBase) {
    return null;
  }

  const fallbackKey = keyParts.join('/');
  return buildUrlWithBase(fallbackBase, fallbackKey);
};

interface ClienteDirectorio {
  id: string;
  nombreNegocio: string;
  nombreCliente: string;
  giroComercial: string | null;
  direccion: string | null;
  telefonoNegocio: string | null;
  logoUrl: string | null;
  latitud: number | null;
  longitud: number | null;
}

const parseCoordinate = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const raw = typeof value === 'string' ? value.trim() : value;

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }

  if (typeof raw === 'string' && raw.length > 0) {
    const numeric = Number.parseFloat(raw.replace(/,/g, '.'));
    return Number.isFinite(numeric) ? numeric : null;
  }

  return null;
};

const sanitizePhone = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  const digits = value.replace(/\D+/g, '');
  if (digits.length < 10) {
    return null;
  }

  if (digits.startsWith('52') && digits.length > 10) {
    return digits;
  }

  if (digits.length >= 10) {
    return `52${digits.slice(-10)}`;
  }

  return digits;
};

const extractClientesList = (payload: any): any[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.clientes)) {
    return payload.data.clientes;
  }

  if (Array.isArray(payload?.clientes)) {
    return payload.clientes;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  if (Array.isArray(payload?.response)) {
    return payload.response;
  }

  return [];
};

const normalizeCliente = (raw: any, index: number): ClienteDirectorio => {
  const idRaw = raw?.id ?? raw?.ID ?? raw?.id_cliente ?? raw?.id_cliente_crov ?? raw?.cliente_id;
  const id = idRaw ? String(idRaw) : `cliente-${index}`;

  const nombreNegocioRaw =
    raw?.nombre_negocio ??
    raw?.negocio ??
    raw?.nombreComercial ??
    raw?.nombre_comercial ??
    raw?.nombre_empresa ??
    raw?.nombre ??
    '';

  const nombreClienteRaw =
    raw?.nombre_cliente ?? raw?.cliente ?? raw?.propietario ?? raw?.contacto ?? raw?.nombre ?? '';

  const giroComercialRaw =
    raw?.giro_comercial ??
    raw?.giro ??
    raw?.giro_negocio ??
    raw?.actividad ??
    raw?.categoria ??
    raw?.categoria_negocio ??
    null;

  const direccionRaw =
    raw?.direccion ??
    raw?.direccion_negocio ??
    raw?.domicilio ??
    raw?.direccion_completa ??
    raw?.calle ??
    null;

  const telefonoNegocioRaw =
    raw?.telefono_negocio ??
    raw?.telefono_neg ??
    raw?.telefono ??
    raw?.telefono_contacto ??
    raw?.celular ??
    raw?.whatsapp ??
    null;

  const latitud =
    parseCoordinate(
      raw?.latitud ??
        raw?.latitude ??
        raw?.lat ??
        raw?.coordenada_latitud ??
        raw?.ubicacion_latitud ??
        raw?.map_latitud,
    ) ?? null;

  const longitud =
    parseCoordinate(
      raw?.longitud ??
        raw?.longitude ??
        raw?.lng ??
        raw?.coordenada_longitud ??
        raw?.ubicacion_longitud ??
        raw?.map_longitud,
    ) ?? null;

  const logoRaw =
    raw?.logo_url ??
    raw?.logo ??
    raw?.logoUrl ??
    raw?.url_logo ??
    raw?.imagen_logo ??
    raw?.logoPath ??
    raw?.logo_path ??
    raw?.logoKey ??
    raw?.logo_key ??
    raw?.logoS3Key ??
    raw?.logo_s3_key ??
    raw?.logoS3Url ??
    raw?.logo_s3_url ??
    raw?.logoPublicUrl ??
    raw?.logo_public_url ??
    null;
  const logoBucketRaw =
    raw?.logo_bucket ??
    raw?.logoBucket ??
    raw?.bucket_logo ??
    raw?.bucketLogo ??
    raw?.bucket ??
    raw?.logo_bucket_name ??
    raw?.logoBucketName ??
    raw?.bucket_name ??
    raw?.bucketName ??
    null;

  const nombreNegocio = nombreNegocioRaw ? String(nombreNegocioRaw).trim() : '';
  const nombreCliente = nombreClienteRaw ? String(nombreClienteRaw).trim() : '';

  const giroComercialValue = giroComercialRaw ? String(giroComercialRaw).trim() : '';
  const giroComercial = giroComercialValue.length > 0 ? giroComercialValue : null;

  const direccionValue = direccionRaw ? String(direccionRaw).trim() : '';
  const direccion = direccionValue.length > 0 ? direccionValue : null;

  const telefonoNegocioValue = telefonoNegocioRaw ? String(telefonoNegocioRaw).trim() : '';
  const telefonoNegocio = telefonoNegocioValue.length > 0 ? telefonoNegocioValue : null;

  const logoPrefixRaw = raw?.logo_prefix ?? raw?.logoPrefix ?? null;
  const logoBaseUrlRaw =
    raw?.logo_base_url ??
    raw?.logoBaseUrl ??
    raw?.logo_url_base ??
    raw?.logoUrlBase ??
    raw?.logo_base ??
    raw?.logoBase ??
    null;

  const logoValue = logoRaw ? String(logoRaw).trim() : '';
  const logoPrefix = logoPrefixRaw ? String(logoPrefixRaw).trim() : '';

  const bucketSource = logoBaseUrlRaw && String(logoBaseUrlRaw).trim().length > 0
    ? String(logoBaseUrlRaw).trim()
    : logoBucketRaw;
  const logoBucketValue = bucketSource ? String(bucketSource).trim() : null;

  const normalizedLogoValue = (() => {
    if (!logoValue) {
      return '';
    }

    if (/^(?:https?:|s3:|data:|blob:)/i.test(logoValue)) {
      return logoValue;
    }

    if (!logoPrefix) {
      return logoValue;
    }

    const normalizedPrefix = logoPrefix.replace(/\/+$/, '');
    const normalizedValue = logoValue.replace(/^\/+/, '');
    return normalizedPrefix ? `${normalizedPrefix}/${normalizedValue}` : normalizedValue;
  })();

  const logoUrl = resolveLogoUrl(
    normalizedLogoValue.length > 0 ? normalizedLogoValue : null,
    logoBucketValue,
  );

  return {
    id,
    nombreNegocio,
    nombreCliente,
    giroComercial,
    direccion: direccion ?? null,
    telefonoNegocio: telefonoNegocio ?? null,
    logoUrl: logoUrl ?? null,
    latitud,
    longitud,
  };
};

const getInitials = (text: string): string => {
  if (!text) {
    return 'CROV';
  }

  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return 'CROV';
  }

  const initials = words.slice(0, 2).map((word) => word.charAt(0).toUpperCase());

  return initials.join('') || 'CROV';
};

const buildMapLink = (latitud: number | null, longitud: number | null, nombre: string): string | null => {
  if (latitud === null || longitud === null) {
    return null;
  }

  return `https://www.google.com/maps?q=${latitud},${longitud}(${encodeURIComponent(nombre || 'Ubicación CROV')})`;
};

export default function DirectorioClientesPage() {
  const [clientes, setClientes] = useState<ClienteDirectorio[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedGiro, setSelectedGiro] = useState('');
  const [logoCache, setLogoCache] = useState<Record<string, string | null>>({});

  const logoCacheRef = useRef<Record<string, string | null>>({});
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const requestedLogosRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    logoCacheRef.current = logoCache;
  }, [logoCache]);

  const registerObjectUrl = useCallback((url: string | null | undefined) => {
    if (url && url.startsWith('blob:')) {
      objectUrlsRef.current.add(url);
    }
  }, []);

  const revokeObjectUrl = useCallback((url: string | null | undefined) => {
    if (url && url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(url);
      } catch (revokeError) {
        console.error('Error al liberar el objeto blob del logotipo CROV', revokeError);
      } finally {
        objectUrlsRef.current.delete(url);
      }
    }
  }, []);

  useEffect(() => {
    const objectUrlsSet = objectUrlsRef.current;
    return () => {
      const objectUrls = Array.from(objectUrlsSet);
      objectUrlsSet.clear();
      objectUrls.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (revokeError) {
          console.error('Error al liberar objeto URL de logotipo CROV al desmontar', revokeError);
        }
      });
    };
  }, []);

  const fetchClienteLogo = useCallback(
    async (clienteId: number, signal?: AbortSignal): Promise<string | null> => {
      if (!apiUrl) {
        return null;
      }

      const authToken = getDirectoryLogoAuthToken();
      const privateEndpoint = `${apiUrl}/cliente-crov-logo/${clienteId}`;
      const publicEndpoint = `${apiUrl}/public/clientes-crov/logo/${clienteId}`;
      const acceptHeader = 'application/json, image/*;q=0.8,*/*;q=0.5';
      const headers: HeadersInit = {
        Accept: acceptHeader,
      };

      if (authToken) {
        headers.Authorization = authToken;
      }

      let response = await fetch(privateEndpoint, {
        signal,
        headers,
      });

      if (!authToken && (response.status === 401 || response.status === 403)) {
        response = await fetch(publicEndpoint, {
          signal,
          headers: { Accept: acceptHeader },
        });
      }

      if (response.status === 404 || response.status === 204) {
        return null;
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        const message = (() => {
          if (!errorText) {
            return 'No se pudo obtener el logotipo del cliente.';
          }
          try {
            const parsed = JSON.parse(errorText);
            return (
              parsed?.mensaje ||
              parsed?.message ||
              parsed?.error ||
              'No se pudo obtener el logotipo del cliente.'
            );
          } catch {
            return errorText;
          }
        })();

        throw new Error(message);
      }

      const contentType = response.headers.get('content-type') ?? '';

      if (contentType.includes('application/json')) {
        const data = await response.json().catch(() => null);
        if (!data) {
          return null;
        }

        const url =
          typeof data?.url === 'string'
            ? data.url
            : typeof data?.imageUrl === 'string'
              ? data.imageUrl
              : typeof data?.logo === 'string'
                ? data.logo
                : null;

        return url ?? null;
      }

      if (contentType.startsWith('image/')) {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }

      const text = (await response.text().catch(() => '')).trim();
      return text || null;
    },
    [apiUrl],
  );

  const fetchClientes = useCallback(
    async (signal?: AbortSignal) => {
      if (!apiUrl) {
        setError('Falta configurar el servicio de API para mostrar el directorio.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${apiUrl}/public/clientes-crov/directorio`, {
          signal,
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Error al cargar el directorio de clientes.');
        }

        const payload = await response.json();
        const list = extractClientesList(payload);

        if (
          list.length === 0 &&
          payload &&
          typeof payload === 'object' &&
          !Array.isArray(payload)
        ) {
          const message =
            payload?.message ??
            payload?.error ??
            payload?.detail ??
            payload?.descripcion ??
            payload?.mensaje ??
            null;

          if (message) {
            throw new Error(String(message));
          }
        }

        const normalized = list.map((item, index) => normalizeCliente(item, index));
        const uniqueMap = new Map<string, ClienteDirectorio>();

        normalized.forEach((cliente) => {
          uniqueMap.set(cliente.id, cliente);
        });

        const deduped = Array.from(uniqueMap.values()).filter((cliente) => {
          return (
            cliente.nombreNegocio.length > 0 ||
            cliente.nombreCliente.length > 0 ||
            (cliente.giroComercial?.length ?? 0) > 0 ||
            (cliente.direccion?.length ?? 0) > 0 ||
            cliente.telefonoNegocio !== null
          );
        });

        setClientes(deduped);
        setLogoCache((prev) => {
          if (!prev || Object.keys(prev).length === 0) {
            return prev;
          }

          Object.values(prev).forEach((value) => {
            revokeObjectUrl(value ?? null);
          });

          return {};
        });
        requestedLogosRef.current.clear();
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return;
        }

        console.error('Error al obtener el directorio de clientes CROV', err);
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar el directorio de clientes. Intenta nuevamente más tarde.',
        );
      } finally {
        if (!signal || !signal.aborted) {
          setLoading(false);
        }
      }
    },
    [revokeObjectUrl],
  );

  useEffect(() => {
    if (!apiUrl || clientes.length === 0) {
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const pending = clientes
      .map((cliente) => {
        const numericId = Number.parseInt(cliente.id, 10);
        return { idKey: cliente.id, numericId };
      })
      .filter(({ idKey, numericId }) => {
        if (!Number.isInteger(numericId) || numericId <= 0) {
          return false;
        }

        if (logoCacheRef.current && Object.prototype.hasOwnProperty.call(logoCacheRef.current, idKey)) {
          return false;
        }

        if (requestedLogosRef.current.has(idKey)) {
          return false;
        }

        return true;
      });

    if (pending.length === 0) {
      return () => {
        controller.abort();
      };
    }

    pending.forEach(({ idKey }) => requestedLogosRef.current.add(idKey));

    const run = async () => {
      await Promise.all(
        pending.map(async ({ idKey, numericId }) => {
          try {
            const logoUrl = await fetchClienteLogo(numericId, signal);
            if (signal.aborted) {
              return;
            }

            if (logoUrl && logoUrl.startsWith('blob:')) {
              registerObjectUrl(logoUrl);
            }

            setLogoCache((prev) => {
              const previous = prev[idKey] ?? null;
              const nextValue = logoUrl ?? null;

              if (previous && previous.startsWith('blob:') && previous !== nextValue) {
                revokeObjectUrl(previous);
              }

              if (previous === nextValue) {
                return prev;
              }

              return { ...prev, [idKey]: nextValue };
            });
          } catch (err) {
            if ((err as Error).name !== 'AbortError') {
              console.error(`Error al obtener logotipo del cliente CROV ${numericId}`, err);
              setLogoCache((prev) => {
                const previous = prev[idKey] ?? null;
                if (previous && previous.startsWith('blob:')) {
                  revokeObjectUrl(previous);
                }

                if (Object.prototype.hasOwnProperty.call(prev, idKey) && prev[idKey] === null) {
                  return prev;
                }

                return { ...prev, [idKey]: null };
              });
            }
          } finally {
            requestedLogosRef.current.delete(idKey);
          }
        }),
      );
    };

    void run();

    const pendingIds = pending.map(({ idKey }) => idKey);
    const requestedLogosSet = requestedLogosRef.current;

    return () => {
      controller.abort();
      pendingIds.forEach((idKey) => requestedLogosSet.delete(idKey));
    };
  }, [clientes, fetchClienteLogo, registerObjectUrl, revokeObjectUrl]);

  useEffect(() => {
    const controller = new AbortController();
    fetchClientes(controller.signal);

    return () => controller.abort();
  }, [fetchClientes]);

  const girosDisponibles = useMemo(() => {
    const unique = new Set<string>();
    clientes.forEach((cliente) => {
      const giro = cliente.giroComercial?.trim();
      if (giro) {
        unique.add(giro);
      }
    });

    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }, [clientes]);

  const filteredClientes = useMemo(() => {
    const term = search.trim().toLowerCase();
    const normalizedSelectedGiro = selectedGiro.trim().toLowerCase();

    return clientes.filter((cliente) => {
      const nombre = `${cliente.nombreNegocio} ${cliente.nombreCliente}`.toLowerCase();
      const giro = (cliente.giroComercial ?? '').toLowerCase();
      const direccion = (cliente.direccion ?? '').toLowerCase();
      const telefono = (cliente.telefonoNegocio ?? '').toLowerCase();

      const matchesSearch = !term
        ? true
        : nombre.includes(term) || giro.includes(term) || direccion.includes(term) || telefono.includes(term);

      const matchesGiro = !normalizedSelectedGiro ? true : giro === normalizedSelectedGiro;

      return matchesSearch && matchesGiro;
    });
  }, [clientes, search, selectedGiro]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="relative overflow-hidden bg-gradient-to-b from-white via-orange-50/60 to-white">
        <div
          className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.18),_transparent_65%)]"
          aria-hidden
        />
        <div className="absolute -top-48 left-1/2 h-96 w-[110rem] -translate-x-1/2 rounded-full bg-orange-100/60 blur-3xl" aria-hidden />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pb-20 pt-16 sm:px-10 lg:pt-24">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-lg font-semibold">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-2 shadow-lg shadow-orange-100">
                <Image src="/images/logo2.png" alt="Logotipo CROV" width={48} height={48} className="h-8 w-8" priority />
              </span>
              <span className="hidden text-sm font-medium text-orange-600 sm:inline">Directorio CROV</span>
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
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                +200 negocios forman la Comunidad CROV
              </h1>
              <p className="max-w-xl text-lg text-slate-600">
                Este directorio muestra únicamente a los clientes que decidieron aparecer para impulsar su negocio y conectar con nuevos consumidores.
              </p>
            </div>
            <div className="relative">
              <div className="absolute -left-8 -top-8 h-40 w-40 rounded-full bg-orange-200/70 blur-3xl" aria-hidden />
              <div className="absolute -right-10 -bottom-16 h-52 w-52 rounded-full bg-orange-100 blur-3xl" aria-hidden />
              <div className="relative flex flex-col gap-6 rounded-3xl border border-orange-100 bg-white p-10 shadow-xl">
                <div className="flex items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-orange-500">
                    <Building2 className="h-7 w-7" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-orange-500">+200 negocios aliados</p>
                    <p className="text-sm text-slate-600">Crecen con software y acompañamiento experto.</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600">
                  Si deseas ser parte del directorio o actualizar tu información, ponte en contacto con nuestro equipo de soporte.
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-10">
        <section className="space-y-12">
          <div className="flex flex-col gap-6 rounded-3xl border border-orange-100 bg-white p-6 shadow-lg shadow-orange-100/40">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Directorio de clientes CROV</h2>
                <p className="text-sm text-slate-600">
                  Explora algunos de los negocios que forman parte de nuestra red tecnológica. Usa el buscador para encontrar comercios por nombre, ubicación o teléfono.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-sm font-medium text-orange-600">
                {filteredClientes.length} negocios disponibles
              </span>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row">
              <label className="flex flex-1 items-center gap-3 rounded-full border border-orange-200 bg-orange-50/50 px-4 py-2 shadow-inner">
                <Search className="h-4 w-4 text-orange-500" />
                <span className="sr-only">Buscar en el directorio</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nombre, giro, dirección o teléfono"
                  className="flex-1 border-none bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
              </label>
              <div className="flex flex-col gap-2 rounded-2xl border border-orange-100 bg-white/70 px-4 py-3 shadow-inner lg:w-64">
                <label
                  htmlFor="giro-filter"
                  className="text-xs font-semibold uppercase tracking-wide text-orange-600"
                >
                  Giro comercial
                </label>
                <select
                  id="giro-filter"
                  value={selectedGiro}
                  onChange={(event) => setSelectedGiro(event.target.value)}
                  disabled={girosDisponibles.length === 0}
                  className="w-full rounded-full border border-orange-200 bg-orange-50/50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">Todos los giros</option>
                  {girosDisponibles.map((giro) => (
                    <option key={giro} value={giro}>
                      {giro}
                    </option>
                  ))}
                </select>
                {girosDisponibles.length === 0 && (
                  <p className="text-xs text-slate-400">Mostraremos los giros cuando haya negocios disponibles.</p>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-orange-100 bg-orange-50/60 p-10 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
              <p className="text-sm font-medium text-orange-600">Cargando directorio de clientes...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-100 bg-red-50/70 p-10 text-center">
              <p className="text-lg font-semibold text-red-600">No pudimos cargar el directorio</p>
              <p className="text-sm text-red-500">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setError(null);
                  fetchClientes();
                }}
                className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
              >
                Reintentar
              </button>
            </div>
          ) : filteredClientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-orange-100 bg-orange-50/70 p-10 text-center">
              <p className="text-lg font-semibold text-orange-600">No encontramos negocios con tu búsqueda</p>
              <p className="text-sm text-slate-500">
                Ajusta los términos o explora el directorio completo para descubrir más clientes CROV.
              </p>
              <button
                type="button"
                onClick={() => setSearch('')}
                className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-5 py-2 text-sm font-semibold text-orange-600 shadow-sm transition hover:border-orange-300 hover:text-orange-700"
              >
                Limpiar búsqueda
              </button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filteredClientes.map((cliente) => {
                const displayName = cliente.nombreNegocio || cliente.nombreCliente || 'Cliente CROV';
                const initials = getInitials(displayName);
                const sanitizedPhone = sanitizePhone(cliente.telefonoNegocio);
                const whatsappUrl = sanitizedPhone ? `https://wa.me/${sanitizedPhone}` : null;
                const mapUrl = buildMapLink(cliente.latitud, cliente.longitud, displayName);
                const resolvedLogo = Object.prototype.hasOwnProperty.call(logoCache, cliente.id)
                  ? logoCache[cliente.id]
                  : cliente.logoUrl;
                const hasLogo = typeof resolvedLogo === 'string' && resolvedLogo.trim().length > 0;

                return (
                  <article
                    key={cliente.id}
                    className="flex h-full flex-col justify-between rounded-2xl border border-orange-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="space-y-5">
                      <div className="flex items-center gap-4">
                        {hasLogo ? (
                          <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-orange-100 bg-orange-50">
                            <Image
                              src={resolvedLogo as string}
                              alt={`Logo ${displayName}`}
                              width={56}
                              height={56}
                              className="h-full w-full object-cover"
                              sizes="56px"
                              unoptimized
                            />
                          </span>
                        ) : (
                          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-lg font-semibold text-orange-600">
                            {initials}
                          </span>
                        )}
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{displayName}</h3>
                          {cliente.giroComercial && (
                            <p className="text-sm text-slate-500">Giro comercial: {cliente.giroComercial}</p>
                          )}
                        </div>
                      </div>
                      {cliente.direccion ? (
                        <p className="flex items-start gap-2 text-sm text-slate-600">
                          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-500" />
                          <span>{cliente.direccion}</span>
                        </p>
                      ) : (
                        <p className="flex items-center gap-2 text-sm text-slate-400">
                          <MapPin className="h-4 w-4 text-orange-300" />
                          Dirección no disponible
                        </p>
                      )}
                      {cliente.telefonoNegocio ? (
                        <p className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="h-4 w-4 text-orange-500" />
                          <span className="text-slate-500">Teléfono del negocio:</span>
                          <a href={`tel:${cliente.telefonoNegocio}`} className="hover:text-orange-600">
                            {cliente.telefonoNegocio}
                          </a>
                        </p>
                      ) : (
                        <p className="flex items-center gap-2 text-sm text-slate-400">
                          <Phone className="h-4 w-4 text-orange-300" />
                          Teléfono del negocio no disponible
                        </p>
                      )}
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <a
                        href={mapUrl ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-disabled={!mapUrl}
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition ${
                          mapUrl
                            ? 'bg-orange-500 text-white hover:bg-orange-600'
                            : 'cursor-not-allowed bg-slate-100 text-slate-400'
                        }`}
                      >
                        <MapPin className="h-4 w-4" />
                        Ver ubicación
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <a
                        href={whatsappUrl ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-disabled={!whatsappUrl}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          whatsappUrl
                            ? 'border-green-200 bg-green-50 text-green-700 hover:border-green-300 hover:text-green-800'
                            : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                        }`}
                      >
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
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
    </div>
  );
}
