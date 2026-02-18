'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { getInternalAuthHeaders } from '@/lib/internalAuth';

interface ClienteCROV {
  id: number;
  fecha_fin_soporte: string | null;
}

interface InternalUser {
  nombre_completo?: string;
  puesto?: string;
}

const hasActiveSupport = (fechaFinSoporte: string | null) => {
  if (!fechaFinSoporte) {
    return false;
  }

  const endDate = new Date(fechaFinSoporte);
  if (Number.isNaN(endDate.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  return today <= endDate;
};

export default function InternalDashboard() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const clientesEndpoint = useMemo(
    () => (apiUrl ? `${apiUrl}/crovinternal/clientes-crov` : null),
    [apiUrl]
  );
  const token = typeof window !== 'undefined' ? localStorage.getItem('internalToken') : null;
  const authHeaders = useMemo(() => getInternalAuthHeaders(token), [token]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supportSummary, setSupportSummary] = useState({ vigentes: 0, sinSoporte: 0 });
  const [internalUser, setInternalUser] = useState<InternalUser | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedUser = localStorage.getItem('internalUser');
    if (!storedUser) {
      return;
    }

    try {
      setInternalUser(JSON.parse(storedUser));
    } catch (parseError) {
      console.error('No se pudo leer el usuario interno', parseError);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      router.replace('/crovinternal');
      return;
    }

    if (!clientesEndpoint) {
      setError('No se pudo determinar la ruta de clientes CROV.');
      return;
    }

    const controller = new AbortController();

    const fetchClientes = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get<ClienteCROV[]>(clientesEndpoint, {
          headers: authHeaders,
          signal: controller.signal,
        });

        const data = Array.isArray(response.data) ? response.data : [];
        const summary = data.reduce(
          (acc, cliente) => {
            if (hasActiveSupport(cliente.fecha_fin_soporte)) {
              acc.vigentes += 1;
            } else {
              acc.sinSoporte += 1;
            }
            return acc;
          },
          { vigentes: 0, sinSoporte: 0 }
        );

        setSupportSummary(summary);
      } catch (err) {
        if (axios.isCancel(err)) {
          return;
        }

        console.error('Error al cargar clientes CROV', err);
        setError('No se pudieron cargar los clientes CROV.');
      } finally {
        setLoading(false);
      }
    };

    fetchClientes();

    return () => {
      controller.abort();
    };
  }, [clientesEndpoint, router, token]);

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-orange-600">Dashboard CROV</h1>
      </div>

      {error && (
        <div className="rounded-lg bg-red-100 p-4 text-sm text-red-700 shadow">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-purple-100 p-6 text-purple-900 shadow">
          <p className="text-sm font-medium uppercase tracking-wide">
            Clientes con soporte vigente
          </p>
          <p className="mt-2 text-3xl font-bold">
            {loading ? 'Cargando…' : supportSummary.vigentes}
          </p>
          <p className="text-xs text-purple-700">Clientes con soporte activo o vigente.</p>
        </div>

        <div className="rounded-lg bg-red-100 p-6 text-red-900 shadow">
          <p className="text-sm font-medium uppercase tracking-wide">
            Clientes sin soporte
          </p>
          <p className="mt-2 text-3xl font-bold">
            {loading ? 'Cargando…' : supportSummary.sinSoporte}
          </p>
          <p className="text-xs text-red-700">
            Incluye clientes sin fecha de soporte o con soporte vencido.
          </p>
        </div>
      </div>
    </div>
  );
}
