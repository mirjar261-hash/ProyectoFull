'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

/* -----------------------------
   Tipos compartidos
----------------------------- */
type Meta = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type ApiListResponse<T> = {
  data: T[];
  meta: Meta;
};

/* -----------------------------
   Tipos por catálogo
----------------------------- */
type CatRegimenFiscal = {
  id: number;
  clave: string;
  descripcion: string;
  aplica_fisica: boolean;
  aplica_moral: boolean;
  fecha_inicio_vigencia: string | null;
  fecha_fin_vigencia: string | null;
  activo: number;
};

type CatClaveUnidad = {
  id: number;
  clave: string;
  nombre: string | null;
  descripcion: string;
  simbolo: string | null;
  fecha_inicio_vigencia: string | null;
  fecha_fin_vigencia: string | null;
  activo: number;
};

type CatClaveProdServ = {
  id: number;
  clave: string;
  descripcion: string;
  incluir_iva_trasladado: string | null;
  incluir_ieps_trasladado: string | null;
  complemento_que_debe_incluir: string | null;
  fecha_inicio_vigencia: string | null;
  fecha_fin_vigencia: string | null;
  estimulo_franja_fronteriza: number | null;
  palabras_similares: string | null;
  activo: number;
};

/* -----------------------------
   Helpers UI
----------------------------- */
function VigenciaBadge({ inicio, fin }: { inicio: string | null; fin: string | null }) {
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString() : '—');
  return (
    <div className="text-xs text-muted-foreground">
      <div><span className="font-medium">Inicio:</span> {fmt(inicio)}</div>
      <div><span className="font-medium">Fin:</span> {fmt(fin)}</div>
    </div>
  );
}

function ActivoBadge({ activo }: { activo: number }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${activo ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  );
}

function Pagination({
  meta,
  onPageChange,
}: {
  meta: Meta | null;
  onPageChange: (nextPage: number) => void;
}) {
  if (!meta) return null;
  const { page, totalPages, total } = meta;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm text-muted-foreground">
        Página <span className="font-medium">{page}</span> de <span className="font-medium">{totalPages}</span> · {total.toLocaleString()} resultados
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(1)}>« Primera</Button>
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>← Anterior</Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Siguiente →</Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)}>Última »</Button>
      </div>
    </div>
  );
}

/* -----------------------------
   Utils de red
----------------------------- */
async function apiGet<T>(fullUrl: string): Promise<T> {
  if (!apiUrl) throw new Error('Falta NEXT_PUBLIC_API_URL');
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const res = await fetch(fullUrl, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const ct = res.headers.get('content-type') || '';
  const isJson = ct.includes('application/json');
  const raw = await res.text();
  const body = isJson ? (raw ? JSON.parse(raw) : null) : raw;

  if (!res.ok) {
    const msg = (isJson ? (body as any)?.error || (body as any)?.message : raw) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body as T;
}

function buildUrl(endpoint: string, params: Record<string, any>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  });
  return `${apiUrl}${endpoint}?${sp.toString()}`;
}

/* -----------------------------
   Debounce simple
----------------------------- */
function useDebounced<T>(value: T, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/* -----------------------------
   Hook genérico de listado
----------------------------- */
function useList<T>(endpoint: string, defaults: { pageSize?: number } = {}) {
  const [q, setQ] = useState('');
  const [activo, setActivo] = useState<'all' | '1' | '0'>('all');
  const [vigenteEn, setVigenteEn] = useState<string>(''); // yyyy-mm-dd
  const [page, setPage] = useState(1);
  const [pageSize] = useState(defaults.pageSize ?? 50);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [rows, setRows] = useState<T[]>([]);

  const debouncedQ = useDebounced(q, 500);
  const debouncedVigente = useDebounced(vigenteEn, 500);

  const params = useMemo(() => {
    const p: Record<string, any> = { page, pageSize };
    if (debouncedQ) p.q = debouncedQ;
    if (activo !== 'all') p.activo = activo;
    if (debouncedVigente) p.vigente_en = debouncedVigente;
    return p;
  }, [page, pageSize, debouncedQ, activo, debouncedVigente]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const url = buildUrl(endpoint, params);
      const resp = await apiGet<ApiListResponse<T>>(url);
      if (!resp || !Array.isArray(resp.data) || !resp.meta) {
        throw new Error('Respuesta inesperada del servidor');
      }
      setRows(resp.data);
      setMeta(resp.meta);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  // reset de página si cambian filtros
  useEffect(() => {
    setPage(1);
  }, [debouncedQ, activo, debouncedVigente]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedQ, activo, debouncedVigente]);

  return {
    q, setQ,
    activo, setActivo,
    vigenteEn, setVigenteEn,
    page, setPage,
    pageSize,
    loading, meta, rows,
    refetch: fetchData,
  };
}

/* -----------------------------
   Toolbar
----------------------------- */
function Toolbar({
  q, setQ,
  activo, setActivo,
  vigenteEn, setVigenteEn,
  onRefresh,
  extraRight,
}: {
  q: string;
  setQ: (v: string) => void;
  activo: 'all' | '1' | '0';
  setActivo: (v: 'all' | '1' | '0') => void;
  vigenteEn: string;
  setVigenteEn: (v: string) => void;
  onRefresh: () => void;
  extraRight?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
        <Input
          placeholder="Buscar por clave / descripción…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-72"
        />

        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Activo</label>

          {/* Select con fondo 100% sólido (sin transparencia ni blur) */}
          <Select value={activo} onValueChange={(v) => setActivo(v as any)}>
            <SelectTrigger
              className="
                w-40 rounded-md border bg-background shadow-sm
                !opacity-100 data-[state=open]:ring-2 data-[state=open]:ring-ring
              "
            >
              <SelectValue placeholder="Activo" />
            </SelectTrigger>

            <SelectContent
              sideOffset={6}
              className="
                z-[60] rounded-md border shadow-md
                !opacity-100 !backdrop-blur-0
                !bg-white dark:!bg-neutral-900
              "
            >
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="1">Solo activos</SelectItem>
              <SelectItem value="0">Solo inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Vigente en</label>
          <Input
            type="date"
            value={vigenteEn}
            onChange={(e) => setVigenteEn(e.target.value)}
            className="w-44"
          />
        </div>

        <Button variant="outline" onClick={onRefresh}>
          Refrescar
        </Button>
      </div>

      {extraRight}
    </div>
  );
}

/* -----------------------------
   Tablas
----------------------------- */
function TablaRegimenFiscal() {
  const s = useList<CatRegimenFiscal>('/facturacion/regimen-fiscal', { pageSize: 100 });

  return (
    <section className="rounded-2xl border p-4 md:p-6 space-y-4">
      <Toolbar q={s.q} setQ={s.setQ}
        activo={s.activo} setActivo={s.setActivo}
        vigenteEn={s.vigenteEn} setVigenteEn={s.setVigenteEn}
        onRefresh={s.refetch}
      />
      <div className="rounded-xl border">
        <div className="relative">
          {s.loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm z-10">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Clave</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="w-[120px]">Aplica</TableHead>
                <TableHead className="w-[180px]">Vigencia</TableHead>
                <TableHead className="w-[100px]">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                    Sin resultados
                  </TableCell>
                </TableRow>
              ) : s.rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.clave}</TableCell>
                  <TableCell>{r.descripcion}</TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <div>Física: <span className="font-medium">{r.aplica_fisica ? 'Sí' : 'No'}</span></div>
                      <div>Moral: <span className="font-medium">{r.aplica_moral ? 'Sí' : 'No'}</span></div>
                    </div>
                  </TableCell>
                  <TableCell><VigenciaBadge inicio={r.fecha_inicio_vigencia} fin={r.fecha_fin_vigencia} /></TableCell>
                  <TableCell><ActivoBadge activo={r.activo} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <Pagination meta={s.meta} onPageChange={s.setPage} />
    </section>
  );
}

/* ====== Clave Unidad (mantener orden de la API, SIN sort en cliente) ====== */
function TablaClaveUnidad() {
  const s = useList<CatClaveUnidad>('/facturacion/clave-unidad', { pageSize: 50 });

  return (
    <section className="rounded-2xl border p-4 md:p-6 space-y-4">
      <Toolbar q={s.q} setQ={s.setQ}
        activo={s.activo} setActivo={s.setActivo}
        vigenteEn={s.vigenteEn} setVigenteEn={s.setVigenteEn}
        onRefresh={s.refetch}
      />
      <div className="rounded-xl border">
        <div className="relative">
          {s.loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm z-10">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Clave</TableHead>
                <TableHead className="w-[220px]">Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="w-[120px]">Símbolo</TableHead>
                <TableHead className="w-[180px]">Vigencia</TableHead>
                <TableHead className="w-[100px]">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    Sin resultados
                  </TableCell>
                </TableRow>
              ) : s.rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.clave}</TableCell>
                  <TableCell>{r.nombre ?? '—'}</TableCell>
                  <TableCell className="max-w-[520px]"><span className="line-clamp-2">{r.descripcion}</span></TableCell>
                  <TableCell>{r.simbolo ?? '—'}</TableCell>
                  <TableCell><VigenciaBadge inicio={r.fecha_inicio_vigencia} fin={r.fecha_fin_vigencia} /></TableCell>
                  <TableCell><ActivoBadge activo={r.activo} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <Pagination meta={s.meta} onPageChange={s.setPage} />
    </section>
  );
}

function TablaClaveProdServ() {
  const s = useList<CatClaveProdServ>('/facturacion/clave-prodserv', { pageSize: 50 });

  return (
    <section className="rounded-2xl border p-4 md:p-6 space-y-4">
      <Toolbar q={s.q} setQ={s.setQ}
        activo={s.activo} setActivo={s.setActivo}
        vigenteEn={s.vigenteEn} setVigenteEn={s.setVigenteEn}
        onRefresh={s.refetch}
      />
      <div className="rounded-xl border">
        <div className="relative">
          {s.loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm z-10">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Clave</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="w-[140px]">IVA</TableHead>
                <TableHead className="w-[140px]">IEPS</TableHead>
                <TableHead className="w-[220px]">Complemento</TableHead>
                <TableHead className="w-[180px]">Vigencia</TableHead>
                <TableHead className="w-[100px]">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    Sin resultados
                  </TableCell>
                </TableRow>
              ) : s.rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.clave}</TableCell>
                  <TableCell className="max-w-[520px]">
                    <div className="space-y-1">
                      <div className="line-clamp-2">{r.descripcion}</div>
                      {r.palabras_similares && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          <span className="font-medium">Similares:</span> {r.palabras_similares}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{r.incluir_iva_trasladado ?? '—'}</TableCell>
                  <TableCell>{r.incluir_ieps_trasladado ?? '—'}</TableCell>
                  <TableCell className="max-w-[280px]"><span className="line-clamp-2">{r.complemento_que_debe_incluir ?? '—'}</span></TableCell>
                  <TableCell><VigenciaBadge inicio={r.fecha_inicio_vigencia} fin={r.fecha_fin_vigencia} /></TableCell>
                  <TableCell><ActivoBadge activo={r.activo} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <Pagination meta={s.meta} onPageChange={s.setPage} />
    </section>
  );
}

/* -----------------------------
   Página principal
----------------------------- */
export default function FacturacionCatalogosPage() {
  const [activeTab, setActiveTab] = useState<'regimen' | 'unidad' | 'prodserv'>('regimen');

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Catálogos SAT (CFDI 4.0)</h1>
          <p className="text-sm text-muted-foreground">
            Consulta de: Régimen Fiscal, Clave Unidad y Clave Producto/Servicio.
          </p>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="regimen">Catálogo Régimen Fiscal</TabsTrigger>
          <TabsTrigger value="unidad">Catálogo Clave Unidad</TabsTrigger>
          <TabsTrigger value="prodserv">Catálogo Clave producto / Servicio</TabsTrigger>
        </TabsList>

        <TabsContent value="regimen" className="mt-6"><TablaRegimenFiscal /></TabsContent>
        <TabsContent value="unidad" className="mt-6"><TablaClaveUnidad /></TabsContent>
        <TabsContent value="prodserv" className="mt-6"><TablaClaveProdServ /></TabsContent>
      </Tabs>
    </div>
  );
}
