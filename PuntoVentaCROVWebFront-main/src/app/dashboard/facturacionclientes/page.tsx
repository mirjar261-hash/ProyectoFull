'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClaveProdServSelect, ClaveUnidadSelect } from '@/components/ComboboxSAT';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Loader2, Search, Calendar, FastForward, Rewind, SlidersHorizontal, Undo2,
  FileText, AlertCircle, UserPlus, Check, XCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
  DialogFooter
} from '@/components/ui/dialog';
import { ConfirmarPasswordCSDDialog } from '@/components/ConfirmarPasswordCSDDialog';

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

const rawApiUrl = (process.env.NEXT_PUBLIC_API_URL || '/backend').trim();
const apiBaseURL = rawApiUrl.replace(/\/+$/, '');

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
export const api = axios.create({ baseURL: apiBaseURL });

function normalizePath(path: string): string {
  const p = (path || '').trim();
  if (/^https?:\/\//i.test(p)) return p;
  // Quitar el prefijo "/backend/" que sobra
  const noBackendPrefix = p.replace(/^\/+backend\/+/, '/');
  const leading = `/${noBackendPrefix.replace(/^\/+/, '')}`;
  return leading.replace(/\/{2,}/g, '/');
}


// === Axios global (para componentes que usan axios de forma directa) ===
declare global {
  interface Window { _axiosAuthConfigured?: boolean }
}
if (typeof window !== 'undefined' && !window._axiosAuthConfigured) {

  axios.interceptors.request.use((config) => {
    const t = getToken();
    config.headers = config.headers ?? {};
    if (t) {
      (config.headers as any).Authorization = `Bearer ${t}`;
      (config.headers as any)['x-access-token'] = t;
      (config.headers as any).token = t;
    }
    return config;
  });

  axios.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err?.response?.status === 401) {
        const e = new Error('NO_TOKEN');
        (e as any).code = 'NO_TOKEN';
        throw e;
      }
      throw err;
    }
  );

  window._axiosAuthConfigured = true;
}


function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const keys = [
    'token', 'authToken', 'accessToken', 'jwt', 'JWT',
  ];
  for (const k of keys) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v && v.trim()) return v.trim();
  }

  const m = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  if (m && m[1]) return decodeURIComponent(m[1]);

  return null;
}

api.interceptors.request.use((config) => {
  const t = getToken();
  config.headers = config.headers ?? {};
  if (t) {
    (config.headers as any).Authorization = `Bearer ${t}`;
  }
  if (config.url) {
    config.url = normalizePath(config.url);
  }
  return config;
});

async function apiGet<T = any>(url: string, cfg: any = {}) {
  return api.get<T>(url, cfg);
}
async function apiPost<T = any>(url: string, data?: any, cfg: any = {}) {
  return api.post<T>(url, data, cfg);
}
async function apiPut<T = any>(url: string, data?: any, cfg: any = {}) {
  return api.put<T>(url, data, cfg);
}

// ==== Endpoints ====
const VENTAS_LIST = `/venta`;                                 // GET /venta, GET /venta/:id
const PRODUCTOS = `/producto/productos`;                      // GET/PUT /producto/productos/:id
const REGIMEN_FISCAL_BY_CLIENT = `/facturacion/cliente/:id/regimen-fiscal`; // GET por clienteId
const REGIMEN_FISCAL_CLI = `/facturacion/regimen-fiscal/cli`; // catálogo para el front

const CLIENTE_BASE = `/cliente`;
const CLIENTE_CREATE = CLIENTE_BASE;                          // POST /cliente
const CLIENTE_UPDATE = `${CLIENTE_BASE}/:id`;                 // PUT /cliente/:id  -> usa .replace(':id', id)
const CLIENTE_SEARCH = `${CLIENTE_BASE}/buscar`;              // GET /cliente/buscar?sucursalId=&q=
const CLIENTE_BY_ID = `${CLIENTE_BASE}/clientes/:id`;         // GET /cliente/clientes/:id
const CLIENTE_ASIGNAR_A_VENTA = `${CLIENTE_BASE}/asignar-a-venta`; // POST
const CLIENTE_CREAR_Y_ASIGNAR = `${CLIENTE_BASE}/crear-y-asignar`; // POST
// const CFDI_GENERAR_XML = `/facturacion/cfdi40/generar-xml`;
// const CFDI_TIMBRAR = `/facturacion/timbrar`;
/* ============================ */

type VentaDetalle = {
  id: number;
  id_producto?: number | string;
  cantidad?: number;
  precio_unitario?: number;
  total: number;
  numitems?: number;
  promociones?: Array<any>;
};

type RegimenFiscalByCliente = {
  clave: string;        // p.ej. "601"
  descripcion: string;  // p.ej. "General de Ley Personas Morales"
};

type Cliente = {
  id: number;
  razon_social: string;
  telefono: string;
  movil?: string | null;
  nom_contacto?: string | null;
  email?: string | null;
  activo: number;
  // Facturación
  razon_social_facturacion?: string | null;
  rfc_facturacion?: string | null;
  curp_facturacion?: string | null;
  domicilio_facturacion?: string | null;
  no_ext_facturacion?: string | null;
  no_int_facturacion?: string | null;
  cp_facturacion?: string | null;
  colonia_facturacion?: string | null;
  ciudad_facturacion?: string | null;
  localidad_facturacion?: string | null;
  estado_facturacion?: string | null;
  pais_facturacion?: string | null;
  regimen_fiscal?: string | null;
  sucursalId: number;
  dias_credito?: number | null;
  limite_credito?: number | null;
  tipo_precio?: number | null;
};

type UsuarioSimple = { nombre: string; apellidos: string };

type Venta = {
  id: number;
  fecha: string;
  numdoc?: string | null;
  subtotal?: number;
  impuestos?: number;
  descuento?: number;
  total: number;
  id_factura: number | null;

  numitems?: number;

  cliente?: Cliente | null;
  usuario?: UsuarioSimple | null;
  detalles: VentaDetalle[];
};

type ProductoLite = {
  id: number;
  nombre?: string;
  descripcion?: string;
  claveProdServ?: string | null;
  claveUnidad?: string | null;
};

type RegimenFiscalOpt = {
  clave: string;
  descripcion: string;
  aplica_fisica: boolean;
  aplica_moral: boolean;
};

function renderFolio(v: Venta) {
  if (v.numdoc && v.numdoc.trim().length > 0) return v.numdoc;
  const year = new Date(v.fecha).getFullYear();
  return `VV-${String(v.id).padStart(5, '0')}-${year}`;
}

function getSucursalId() {
  if (typeof window !== 'undefined') {
    const fromLS = window.localStorage.getItem('sucursalId');
    if (fromLS && !Number.isNaN(Number(fromLS))) return Number(fromLS);
  }
  return 1;
}

function startOfDayIsoUTC(d: Date) {
  const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  return dd.toISOString();
}
function endOfDayIsoUTC(d: Date) {
  const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return dd.toISOString();
}
function parseYMD(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

type SearchMode = 'todo' | 'folio' | 'cliente';

// Heurística simple: 13 = FÍSICA, 12 = MORAL
function detectarPersonaDesdeRFC(rfc?: string | null): 'FISICA' | 'MORAL' | undefined {
  const clean = (rfc || '').trim().toUpperCase();
  if (clean.length === 13) return 'FISICA';
  if (clean.length === 12) return 'MORAL';
  return undefined;
}

function ClienteCard({
  initialCliente,
  onSaveCliente,
}: {
  initialCliente: Cliente | null | undefined;
  onSaveCliente: (c: Partial<Cliente>) => Promise<Cliente>;
}) {
  // Campos de facturación
  const [razon_social_facturacion, setRazonSocialFact] = useState(initialCliente?.razon_social_facturacion ?? '');
  const [rfc_facturacion, setRfcFact] = useState(initialCliente?.rfc_facturacion ?? '');
  const [curp_facturacion, setCurpFact] = useState(initialCliente?.curp_facturacion ?? '');
  const [domicilio_facturacion, setDomFact] = useState(initialCliente?.domicilio_facturacion ?? '');
  const [no_ext_facturacion, setNoExt] = useState(initialCliente?.no_ext_facturacion ?? '');
  const [no_int_facturacion, setNoInt] = useState(initialCliente?.no_int_facturacion ?? '');
  const [cp_facturacion, setCpFact] = useState(initialCliente?.cp_facturacion ?? '');
  const [colonia_facturacion, setColoniaFact] = useState(initialCliente?.colonia_facturacion ?? '');
  const [ciudad_facturacion, setCiudadFact] = useState(initialCliente?.ciudad_facturacion ?? '');
  const [localidad_facturacion, setLocalidadFact] = useState(initialCliente?.localidad_facturacion ?? '');
  const [estado_facturacion, setEstadoFact] = useState(initialCliente?.estado_facturacion ?? '');
  const [pais_facturacion, setPaisFact] = useState(initialCliente?.pais_facturacion ?? '');

  // Régimen fiscal (clave SAT como string "601", "612", etc.)
  const [regimen_fiscal, setRegimenFiscal] = useState<string>(initialCliente?.regimen_fiscal ?? '');

  // Catálogo régimen fiscal
  const [optsRegimen, setOptsRegimen] = useState<RegimenFiscalOpt[]>([]);
  const [loadingRegimen, setLoadingRegimen] = useState(false);

  // Marca: si el régimen se obtuvo vía backend por cliente
  const [regimenDetectado, setRegimenDetectado] = useState<RegimenFiscalByCliente | null>(null);

  const isNuevo = !initialCliente?.id;
  const [saving, setSaving] = useState(false);

  const personaDetectada = useMemo(
    () => detectarPersonaDesdeRFC(rfc_facturacion),
    [rfc_facturacion]
  );

  // --- util ---
  const asNullIfEmpty = (v: string | undefined) => (v && v.trim() !== '' ? v : null);

  async function loadRegimenes(q?: string) {
    try {
      setLoadingRegimen(true);
      const params: any = {};
      if (personaDetectada) params.persona = personaDetectada;
      if (q && q.trim()) params.q = q.trim();

      const { data } = await apiGet<RegimenFiscalOpt[]>(REGIMEN_FISCAL_CLI, { params });
      setOptsRegimen(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setOptsRegimen([]);
    } finally {
      setLoadingRegimen(false);
    }
  }

  // Carga catálogo inicial
  useEffect(() => {
    loadRegimenes().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-carga catálogo al cambiar persona (RFC)
  useEffect(() => {
    loadRegimenes().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personaDetectada]);

  // Sincroniza formulario cuando cambia el cliente seleccionado
  useEffect(() => {
    setRazonSocialFact(initialCliente?.razon_social_facturacion ?? '');
    setRfcFact((initialCliente?.rfc_facturacion ?? '').toUpperCase());
    setCurpFact((initialCliente?.curp_facturacion ?? '').toUpperCase());
    setDomFact(initialCliente?.domicilio_facturacion ?? '');
    setNoExt(initialCliente?.no_ext_facturacion ?? '');
    setNoInt(initialCliente?.no_int_facturacion ?? '');
    setCpFact(initialCliente?.cp_facturacion ?? '');
    setColoniaFact(initialCliente?.colonia_facturacion ?? '');
    setCiudadFact(initialCliente?.ciudad_facturacion ?? '');
    setLocalidadFact(initialCliente?.localidad_facturacion ?? '');
    setEstadoFact(initialCliente?.estado_facturacion ?? '');
    setPaisFact(initialCliente?.pais_facturacion ?? '');
    setRegimenFiscal(initialCliente?.regimen_fiscal ?? '');
    setRegimenDetectado(null);
  }, [initialCliente?.id]);

  // === NUEVO: obtener régimen fiscal desde backend por clienteId ===
  async function loadRegimenCliente(clienteId: number) {
    try {
      const url = REGIMEN_FISCAL_BY_CLIENT.replace(':id', String(clienteId));
      const { data } = await apiGet<RegimenFiscalByCliente>(url);

      if (data?.clave) {
        // seteamos el select con la clave devuelta
        setRegimenFiscal(data.clave);
        setRegimenDetectado(data);

        // si la clave no está en el catálogo cargado, la añadimos para mostrar su descripción
        const exists = optsRegimen.some(o => o.clave === data.clave);
        if (!exists) {
          setOptsRegimen(prev => [
            ...prev,
            {
              clave: data.clave,
              descripcion: data.descripcion || '(sin descripción)',
              aplica_fisica: true,
              aplica_moral: true,
            },
          ]);
        }
      } else {
        setRegimenDetectado(null);
      }
    } catch (err: any) {
      // Si tu API devuelve 404 cuando no hay régimen, solo limpiamos la marca
      if (err?.response?.status !== 404) {
        console.error('Error cargando régimen del cliente:', err?.response?.data || err?.message);
      }
      setRegimenDetectado(null);
    }
  }

  // Dispara la consulta del régimen cuando haya cliente.id
  useEffect(() => {
    if (initialCliente?.id) {
      loadRegimenCliente(initialCliente.id).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCliente?.id]);

  // --- validación para cambiar los indicadores ---
  const rfcValidation = (() => {
    const val = (rfc_facturacion || '').trim().toUpperCase();
    if (!val) return { ok: false, msg: 'RFC vacío' };

    // RFC válido persona moral (12)
    const moral = /^[A-Z&Ñ]{3}\d{6}[A-Z0-9]{3}$/;
    // RFC válido persona física (13)
    const fisica = /^[A-Z&Ñ]{4}\d{6}[A-Z0-9]{3}$/;

    if (moral.test(val)) return { ok: true, tipo: 'MORAL', msg: 'RFC válido de persona moral' };
    if (fisica.test(val)) return { ok: true, tipo: 'FISICA', msg: 'RFC válido de persona física' };

    return { ok: false, msg: 'Formato de RFC inválido' };
  })();

  const rfcOk = rfcValidation.ok;


  const razonOk = (razon_social_facturacion || '').trim().length >= 3;
  const regimenOk = !!(regimen_fiscal && regimen_fiscal.trim());

  const idFiscalCompleta = razonOk && rfcOk && regimenOk;

  const domOk = [
    domicilio_facturacion,
    colonia_facturacion,
    no_ext_facturacion,
    cp_facturacion,
    ciudad_facturacion,
    estado_facturacion,
    pais_facturacion,
  ].every(v => (v || '').trim().length > 0);


  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {isNuevo ? <UserPlus className="h-5 w-5" /> : <Check className="h-5 w-5" />}
        <div className="font-medium">{isNuevo ? 'Registrar cliente' : 'Datos de facturación'}</div>
      </div>

      {/* IDENTIFICACIÓN FISCAL */}
      <div className="rounded-2xl border bg-white/90 p-5 space-y-4 shadow-sm">
        <div className="text-sm font-medium inline-flex items-center gap-2">
          <span
            className={`inline-flex h-2.5 w-2.5 rounded-full ${idFiscalCompleta ? 'bg-emerald-500' : 'bg-orange-500'}`}
            title={idFiscalCompleta ? 'Sección completa' : 'Faltan datos'}
          />
          Identificación fiscal
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Razón social (facturación)</label>
            <Input className="h-9 text-sm" value={razon_social_facturacion} onChange={(e) => setRazonSocialFact(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">RFC</label>
            <Input
              className={`h-9 text-sm ${rfc_facturacion ? (rfcOk ? 'border-emerald-400 focus-visible:ring-emerald-400' : 'border-red-400 focus-visible:ring-red-400') : ''}`}
              value={rfc_facturacion || ''}
              onChange={(e) => setRfcFact(e.target.value.toUpperCase())}
            />

            {/* Mensaje de validación */}
            <div className="text-[11px] mt-1">
              {rfc_facturacion ? (
                <span className={rfcOk ? 'text-emerald-600' : 'text-red-600'}>
                  {rfcValidation.msg}
                </span>
              ) : (
                <span className="text-muted-foreground">Ingresa el RFC (12 o 13 caracteres)</span>
              )}
            </div>

            {/* Persona detectada */}
            <div className="text-[11px] text-muted-foreground">
              Persona detectada: <b>{personaDetectada ?? 'indefinido'}</b> {loadingRegimen && '· cargando regímenes…'}
            </div>


          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">CURP</label>
            <Input className="h-9 text-sm" value={curp_facturacion || ''} onChange={(e) => setCurpFact(e.target.value.toUpperCase())} />
          </div>

          {/* RÉGIMEN FISCAL (SAT) */}
          <div className="grid gap-1 min-w-0">
            <label className="text-xs font-medium text-muted-foreground">
              Régimen Fiscal (SAT)
            </label>

            {(() => {
              const sel = optsRegimen.find(o => o.clave === regimen_fiscal);
              const selectedLabel = regimen_fiscal
                ? (sel ? `${sel.clave} — ${sel.descripcion}` : `${regimen_fiscal} — ${loadingRegimen ? 'cargando…' : 'no listado'}`)
                : '';

              return (
                <Select
                  value={regimen_fiscal ?? ''}
                  onValueChange={(v) => {
                    setRegimenFiscal(v);
                    // si el usuario cambia manualmente, ya no marcamos "detectado vía backend"
                    setRegimenDetectado(null);
                  }}
                >
                  <SelectTrigger
                    className="h-10 text-sm bg-white border shadow-sm w-full max-w-full overflow-hidden"
                    title={selectedLabel || (loadingRegimen ? 'Cargando…' : 'Selecciona un régimen')}
                  >
                    {selectedLabel ? (
                      <span className="block truncate">{selectedLabel}</span>
                    ) : (
                      <span className="text-muted-foreground">
                        {loadingRegimen ? 'Cargando…' : 'Selecciona un régimen'}
                      </span>
                    )}
                  </SelectTrigger>

                  <SelectContent
                    className="z-[80] bg-white border shadow-lg max-h-72 overflow-auto w-[var(--radix-select-trigger-width)]"
                    side="bottom"
                    align="start"
                    sideOffset={4}
                  >
                    {optsRegimen.map((r) => (
                      <SelectItem key={r.clave} value={r.clave} className="whitespace-normal">
                        {r.clave} — {r.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            })()}

            {/* Indicador de origen (detectado automáticamente) */}
            {regimenDetectado && (
              <div className="mt-2 text-[11px]">
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 border bg-orange-50">
                  <AlertCircle className="h-3.5 w-3.5 text-orange-600" />
                  Detectado vía backend: <b>{regimenDetectado.clave}</b> — {regimenDetectado.descripcion}
                </span>
              </div>
            )}

            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 items-center gap-2">
              <div className="text-[11px] text-muted-foreground">
                {optsRegimen.length} opción(es).
              </div>
              <div className="flex sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setRegimenFiscal(''); setRegimenDetectado(null); }}
                  title="Limpiar"
                  className="h-8 px-3 text-xs"
                >
                  Limpiar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DOMICILIO FISCAL */}
      <div className="rounded-2xl border bg-white/90 p-5 space-y-4 shadow-sm">
        <div className="text-sm font-medium inline-flex items-center gap-2">
          <span
            className={`inline-flex h-2.5 w-2.5 rounded-full ${domOk ? 'bg-emerald-500' : 'bg-orange-500'}`}
            title={domOk ? 'Sección completa' : 'Faltan datos'}
          />

          Domicilio fiscal
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Calle</label>
            <Input className="h-9 text-sm" value={domicilio_facturacion || ''} onChange={(e) => setDomFact(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Colonia</label>
            <Input className="h-9 text-sm" value={colonia_facturacion || ''} onChange={(e) => setColoniaFact(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">No. Ext</label>
            <Input className="h-9 text-sm" value={no_ext_facturacion || ''} onChange={(e) => setNoExt(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">No. Int</label>
            <Input className="h-9 text-sm" value={no_int_facturacion || ''} onChange={(e) => setNoInt(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">CP</label>
            <Input className="h-9 text-sm" value={cp_facturacion || ''} onChange={(e) => setCpFact(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Ciudad</label>
            <Input className="h-9 text-sm" value={ciudad_facturacion || ''} onChange={(e) => setCiudadFact(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Localidad</label>
            <Input className="h-9 text-sm" value={localidad_facturacion || ''} onChange={(e) => setLocalidadFact(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Estado</label>
            <Input className="h-9 text-sm" value={estado_facturacion || ''} onChange={(e) => setEstadoFact(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">País</label>
            <Input className="h-9 text-sm" value={pais_facturacion || ''} onChange={(e) => setPaisFact(e.target.value)} />
          </div>
        </div>
      </div>

      <Button
        onClick={async () => {
          try {
            setSaving(true);
            const sucursalId = getSucursalId();

            const payload: Partial<Cliente> = {
              sucursalId,
              razon_social_facturacion: asNullIfEmpty(razon_social_facturacion),
              rfc_facturacion: asNullIfEmpty(rfc_facturacion?.toUpperCase()),
              curp_facturacion: asNullIfEmpty(curp_facturacion?.toUpperCase()),
              domicilio_facturacion: asNullIfEmpty(domicilio_facturacion),
              no_ext_facturacion: asNullIfEmpty(no_ext_facturacion),
              no_int_facturacion: asNullIfEmpty(no_int_facturacion),
              cp_facturacion: asNullIfEmpty(cp_facturacion),
              colonia_facturacion: asNullIfEmpty(colonia_facturacion),
              ciudad_facturacion: asNullIfEmpty(ciudad_facturacion),
              localidad_facturacion: asNullIfEmpty(localidad_facturacion),
              estado_facturacion: asNullIfEmpty(estado_facturacion),
              pais_facturacion: asNullIfEmpty(pais_facturacion),
              regimen_fiscal: asNullIfEmpty(regimen_fiscal),
            };

            const saved = await onSaveCliente(payload);
            setRegimenFiscal(saved?.regimen_fiscal ?? regimen_fiscal);
            setRegimenDetectado(null);
            toast.success(`Cliente ${saved.id ? 'actualizado' : 'creado'} correctamente`);
          } catch (e: any) {
            if (e?.code === 'NO_TOKEN' || e?.message === 'NO_TOKEN') {
              toast.error('Inicia sesión para continuar.');
            } else {
              toast.error(e?.response?.data?.error || 'No se pudo guardar el cliente');
            }
          } finally {
            setSaving(false);
          }
        }}
        disabled={saving || !rfcOk}
        title={!rfcOk ? (rfc_facturacion ? rfcValidation.msg : 'Ingresa el RFC') : undefined}
        className="w-full h-9 rounded-xl shadow-sm"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {isNuevo ? 'Guardar cliente' : 'Actualizar cliente'}
      </Button>
    </div>
  );
}

/**
 * Tabla de productos con edición inline de ClaveProdServ y ClaveUnidad
 */
function ProductosTabla({
  productos,
  cantidadesPorProducto,
  onSaveClaves,
}: {
  productos: ProductoLite[];
  cantidadesPorProducto: Map<number, number>;
  onSaveClaves: (id: number, claves: { claveProdServ?: string; claveUnidad?: string }) => Promise<void>;
}) {
  type RowState = { claveProdServ: string; claveUnidad: string; saving: boolean; dirty: boolean };
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const [soloFaltantes, setSoloFaltantes] = useState(true);

  // Sincroniza estado local cuando cambian productos
  useEffect(() => {
    const next: Record<number, RowState> = {};
    for (const p of productos) {
      next[p.id] = {
        claveProdServ: p.claveProdServ || '',
        claveUnidad: p.claveUnidad || '',
        saving: false,
        dirty: false,
      };
    }
    setRows(next);
  }, [productos]);

  const saveRow = async (id: number) => {
    const st = rows[id];
    if (!st) return;
    try {
      setRows((prev) => ({ ...prev, [id]: { ...st, saving: true } }));
      await onSaveClaves(id, { claveProdServ: st.claveProdServ || undefined, claveUnidad: st.claveUnidad || undefined });
      setRows((prev) => ({ ...prev, [id]: { ...prev[id], saving: false, dirty: false } }));
      toast.success('Claves actualizadas');
    } catch (e: any) {
      setRows((prev) => ({ ...prev, [id]: { ...prev[id], saving: false } }));
      toast.error(e?.response?.data?.error || 'No se pudieron actualizar las claves');
    }
  };

  const mostrar = useMemo(() => {
    return productos.filter((p) => {
      if (!soloFaltantes) return true;
      return !p.claveProdServ || !p.claveUnidad;
    });
  }, [productos, soloFaltantes]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {productos.length} producto(s). {mostrar.length !== productos.length && `Mostrando ${mostrar.length} con claves pendientes.`}
        </div>
        <button
          type="button"
          onClick={() => setSoloFaltantes(v => !v)}
          className={`text-xs px-3 py-1.5 rounded-full border transition ${soloFaltantes ? 'bg-orange-600 text-white border-orange-600' : 'bg-white hover:bg-orange-50'
            }`}
        >
          {soloFaltantes ? 'Solo faltantes' : 'Todos'}
        </button>
      </div>

      <div className="overflow-auto rounded-xl border bg-white shadow-sm min-h-[360px] md:min-h-[440px] xl:min-h-[730px] max-h-[60vh]">

        <table className="min-w-full text-sm">
          <thead className="bg-muted/60 sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-muted/40">
            <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
              <th className="w-8"></th>
              <th className="min-w-[100px]">Producto</th>
              <th className="w-24 text-center">Cantidad</th>
              <th className="min-w-[220px]">Clave ProdServ</th>
              <th className="min-w-[220px]">Clave Unidad</th>
              <th className="w-36 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {mostrar.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  {soloFaltantes ? 'Todos los productos tienen claves capturadas.' : 'Sin productos para mostrar.'}
                </td>
              </tr>
            )}

            {mostrar.map((p) => {
              const st = rows[p.id] || { claveProdServ: p.claveProdServ || '', claveUnidad: p.claveUnidad || '', saving: false, dirty: false };
              const faltante = !st.claveProdServ || !st.claveUnidad;
              const qty = cantidadesPorProducto.get(p.id) ?? 0;

              return (
                <tr key={p.id} className="[&>td]:px-3 [&>td]:py-2 border-t hover:bg-orange-50/40 transition-colors">
                  <td className="align-middle">
                    <span className={`inline-flex h-2.5 w-2.5 rounded-full ${faltante ? 'bg-red-500' : 'bg-green-500'}`} title={faltante ? 'Faltan claves' : 'Completo'} />
                  </td>
                  <td className="max-w-[360px]">
                    <div className="font-medium truncate" title={p.nombre || p.descripcion || `Producto #${p.id}`}>
                      {p.nombre || p.descripcion || `Producto #${p.id}`}
                    </div>
                  </td>
                  <td className="text-center tabular-nums">{qty}</td>
                  <td>
                    <ClaveProdServSelect
                      value={st.claveProdServ}
                      onChange={(clave) =>
                        setRows((prev) => ({ ...prev, [p.id]: { ...st, claveProdServ: clave, dirty: true } }))
                      }
                    />
                    <div className="text-[11px] text-muted-foreground mt-1">Busca por clave o descripción.</div>
                  </td>
                  <td>
                    <ClaveUnidadSelect
                      value={st.claveUnidad}
                      onChange={(clave) =>
                        setRows((prev) => ({ ...prev, [p.id]: { ...st, claveUnidad: clave, dirty: true } }))
                      }
                    />
                    <div className="text-[11px] text-muted-foreground mt-1">Clave, nombre o símbolo.</div>
                  </td>
                  <td className="text-center">
                    <Button
                      variant="outline"
                      className="h-8 mx-auto"
                      disabled={st.saving || !st.dirty}
                      onClick={() => saveRow(p.id)}
                    >
                      {st.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      <span className="ml-2">Guardar</span>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AsignarClienteDialog({
  open,
  onOpenChange,
  ventaIds,
  onAsignado,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ventaIds: number[];
  onAsignado: (ventasActualizadas: Venta[]) => void; // devuelve ventas con include { cliente: true }
}) {
  const sucursalId = useMemo(() => getSucursalId(), []);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<Cliente[]>([]);
  const [saving, setSaving] = useState(false);

  // Campos para crear cliente rápido 
  const [nuevoRazSoc, setNuevoRazSoc] = useState('');
  const [nuevoRFC, setNuevoRFC] = useState('');
  const [nuevoTel, setNuevoTel] = useState('');

  useEffect(() => {
    if (!open) return;
    setQ('');
    setResultados([]);
    setNuevoRazSoc('');
    setNuevoRFC('');
    setNuevoTel('');
  }, [open]);

  async function buscar() {
    try {
      setLoading(true);
      // const { data } = await axios.get<Cliente[]>(CLIENTE_SEARCH, {
      //   params: { sucursalId, q },
      // });
      const { data } = await apiGet<Cliente[]>(CLIENTE_SEARCH, { params: { sucursalId, q } });

      setResultados(Array.isArray(data) ? data : []);
    } catch (e: any) {
      if (e?.code === 'NO_TOKEN' || e?.message === 'NO_TOKEN') {
        toast.error('Inicia sesión para continuar.');
      } else {
        console.error(e);
      }
      setResultados([]);
    } finally {
      setLoading(false);
    }
  }

  async function asignarExistente(clienteId: number) {
    if (!ventaIds || ventaIds.length === 0) return;
    try {
      setSaving(true);
      const resps = await Promise.all(ventaIds.map((vid) =>
        apiPost(CLIENTE_ASIGNAR_A_VENTA, { ventaId: vid, clienteId, sucursalId })
      ));
      const ventasAct = resps.map(r => r.data as Venta);
      toast.success('Cliente asignado a las ventas seleccionadas');
      onAsignado(ventasAct);
      onOpenChange(false);
    } catch (e: any) {
      if (e?.code === 'NO_TOKEN' || e?.message === 'NO_TOKEN') {
        toast.error('Inicia sesión para continuar.');
      } else {
        toast.error(e?.response?.data?.error || 'No se pudo asignar el cliente');
      }
    } finally {
      setSaving(false);
    }
  }

  async function crearYAsignar() {
    if (!ventaIds || ventaIds.length === 0) return;

    if (!nuevoRazSoc.trim()) { toast.error('Captura la razón social'); return; }
    if (!nuevoTel.trim()) { toast.error('Captura el teléfono'); return; }


    if (!nuevoRazSoc.trim()) { toast.error('Captura la razón social'); return; }
    if (!nuevoTel.trim()) { toast.error('Captura el teléfono'); return; }

    try {
      setSaving(true);
      const primeraVentaId = ventaIds[0];

      // 1) Crear cliente y asignarlo a la PRIMERA venta (body correcto para el controller)
      const { data: ventaConCliente } = await apiPost<Venta>(CLIENTE_CREAR_Y_ASIGNAR, {
        ventaId: primeraVentaId,
        sucursalId,
        cliente: {
          razon_social: nuevoRazSoc.trim(),
          razon_social_facturacion: nuevoRazSoc.trim(),
          rfc_facturacion: (nuevoRFC || '').trim().toUpperCase() || null,
          telefono: nuevoTel.trim(),
          activo: 1,
        },
      });

      const clienteId = ventaConCliente?.cliente?.id;
      if (!clienteId) {
        toast.error('No se obtuvo el cliente creado');
        return;
      }

      // 2) Asignarlo a las demás ventas seleccionadas (si hay más)
      const restantes = ventaIds.slice(1);
      const resps = await Promise.all(
        restantes.map((vid) =>
          apiPost(CLIENTE_ASIGNAR_A_VENTA, { ventaId: vid, clienteId, sucursalId })
        )
      );

      // Construir arreglo con TODAS las ventas actualizadas (la primera + las restantes)
      const ventasAct: Venta[] = [
        ventaConCliente,
        ...resps.map(r => r.data as Venta),
      ];

      toast.success('Cliente creado y asignado a las ventas seleccionadas');
      onAsignado(ventasAct);
      onOpenChange(false);
    } catch (e: any) {
      if (e?.code === 'NO_TOKEN' || e?.message === 'NO_TOKEN') {
        toast.error('Inicia sesión para continuar.');
      } else {
        toast.error(e?.response?.data?.error || 'No se pudo crear/asignar el cliente');
      }
    } finally {
      setSaving(false);
    }
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogOverlay className="bg-black/40 fixed inset-0 z-40" />
      <DialogContent className="z-50 max-w-2xl w-[95vw] rounded-2xl border shadow-xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-orange-500" />
            Asignar cliente a {ventaIds.length} venta(s)
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5">
          {/* Buscar existentes */}
          <div className="rounded-xl border p-4 space-y-3">
            <div className="text-sm font-medium">Buscar cliente (sucursal actual)</div>
            <div className="flex gap-2">
              <Input
                placeholder="Razón social, RFC, contacto, teléfono…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <Button onClick={buscar} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="ml-2">Buscar</span>
              </Button>
            </div>

            <div className="max-h-64 overflow-auto border rounded-lg">
              {resultados.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  {loading ? 'Buscando…' : 'Sin resultados'}
                </div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2">Cliente</th>
                      <th className="text-left px-3 py-2">RFC</th>
                      <th className="text-left px-3 py-2">Contacto</th>
                      <th className="text-right px-3 py-2">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.map((c) => {
                      const nombre =
                        c.razon_social_facturacion?.trim() ||
                        c.razon_social?.trim() ||
                        `#${c.id}`;
                      return (
                        <tr key={c.id} className="border-t hover:bg-orange-50/40">
                          <td className="px-3 py-2">{nombre}</td>
                          <td className="px-3 py-2">{c.rfc_facturacion || '—'}</td>
                          <td className="px-3 py-2">{c.nom_contacto || '—'}</td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={saving}
                              onClick={() => asignarExistente(c.id)}
                            >
                              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                              <span className="ml-2">Asignar</span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Crear rápido */}
          <div className="rounded-xl border p-4 space-y-3">
            <div className="text-sm font-medium">Crear cliente rápido</div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground">Razón social</label>
                <Input value={nuevoRazSoc} onChange={(e) => setNuevoRazSoc(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">RFC (opcional)</label>
                <Input
                  value={nuevoRFC}
                  onChange={(e) => setNuevoRFC(e.target.value.toUpperCase())}
                  placeholder="ABC123…"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Teléfono *</label>
                <Input
                  value={nuevoTel}
                  onChange={(e) => setNuevoTel(e.target.value)}
                  placeholder="Ej. 6691234567"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button className="gap-2" onClick={crearYAsignar} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Crear y asignar
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 bg-muted/30 flex items-center justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FacturarWizard({
  open,
  onOpenChange,
  ventasSeleccionadas,
  onTimbradoOk,
  onClienteActualizado,
  onCerrar
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ventasSeleccionadas: Venta[];
  onTimbradoOk: () => void;
  onClienteActualizado?: (cliente: Cliente) => void;
  onCerrar?: () => void;
}) {
  const cliente = ventasSeleccionadas[0]?.cliente ?? null;
  const ventasIds = ventasSeleccionadas.map(v => v.id);
  const [clienteGuardado, setClienteGuardado] = useState<Cliente | null>(null);
  const [huboCambiosCliente, setHuboCambiosCliente] = useState(false);

  function getQtyFromDetalle(d: VentaDetalle): number {
    if (typeof d.numitems === 'number' && !Number.isNaN(d.numitems)) return Number(d.numitems);
    if (typeof d.cantidad === 'number' && !Number.isNaN(d.cantidad)) return Number(d.cantidad);
    return 0;
  }

  const [ventasFull, setVentasFull] = useState<Venta[]>(ventasSeleccionadas);
  useEffect(() => {
    let cancelled = false;

    async function ensureFullVentas() {
      try {
        const enriched = await Promise.all(
          ventasSeleccionadas.map(async (v) => {
            const detalleOk =
              Array.isArray(v.detalles) && v.detalles.length > 0 &&
              v.detalles.some(d => typeof d.numitems === 'number' || typeof d.cantidad === 'number');
            if (detalleOk) return v;
            const { data } = await apiGet<Venta>(`${VENTAS_LIST}/${v.id}`);
            return data;
          })
        );
        if (!cancelled) setVentasFull(enriched);
      } catch (e) {
        console.error(e);
        if (!cancelled) setVentasFull(ventasSeleccionadas);
      }
    }

    if (open && ventasSeleccionadas.length > 0) {
      ensureFullVentas();
    } else {
      setVentasFull(ventasSeleccionadas);
    }

    return () => { cancelled = true; };
  }, [open, ventasSeleccionadas]);

  // Consolidar cantidades por producto
  const cantidadesPorProducto = useMemo(() => {
    const map = new Map<number, number>();

    for (const v of ventasSeleccionadas) {
      const ventaQtyFallback =
        typeof v.numitems === 'number' && !Number.isNaN(v.numitems) ? Number(v.numitems) : 0;

      for (const d of v.detalles) {
        const pid = Number(d.id_producto);
        if (!pid) continue;

        // Prioriza la cantidad del detalle; si no viene, usa numitems de la venta
        const qty =
          typeof d.cantidad === 'number' && !Number.isNaN(d.cantidad)
            ? Number(d.cantidad)
            : ventaQtyFallback;

        map.set(pid, (map.get(pid) ?? 0) + qty);
      }
    }

    return map;
  }, [ventasSeleccionadas]);

  // 2) Cargar info de cada producto (claves, nombre, etc.)
  const [productos, setProductos] = useState<ProductoLite[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoadingProductos(true);
        const ids = Array.from(cantidadesPorProducto.keys());
        const fetched: ProductoLite[] = [];

        for (const id of ids) {
          const { data } = await apiGet(`${PRODUCTOS}/${id}`);
          const prod: ProductoLite = {
            id: Number(data.id),
            nombre: data.nombre ?? data.descripcion ?? undefined,
            descripcion: data.descripcion ?? undefined,
            claveProdServ: data?.prodServ?.clave ?? data?.clave_prodserv ?? null,
            claveUnidad: data?.unidad?.clave ?? data?.clave_unidad_medida ?? null,
          };
          fetched.push(prod);
        }

        setProductos(fetched);
      } catch (e) {
        console.error(e);
        setProductos([]);
      } finally {
        setLoadingProductos(false);
      }
    }
    if (open) load();
  }, [open, cantidadesPorProducto]);

  // 3) Guardar/crear cliente
  async function saveCliente(campos: Partial<Cliente>): Promise<Cliente> {
    const sucursalId = getSucursalId();
    const payload = { sucursalId, ...campos };

    if (cliente?.id) {
      const { data } = await apiPut<Cliente>(CLIENTE_UPDATE.replace(':id', String(cliente.id)), payload);

      setClienteGuardado(data);
      setHuboCambiosCliente(true);
      return data;
    }
    const { data } = await apiPost<Cliente>(CLIENTE_CREATE, payload);
    setClienteGuardado(data);
    setHuboCambiosCliente(true);
    return data;
  }

  // 4) Guardar claves producto
  async function saveClavesProducto(
    id: number,
    claves: { claveProdServ?: string; claveUnidad?: string }
  ) {
    const sucursalId = getSucursalId();

    const body: any = {
      sucursalId,
    };

    if (typeof claves.claveProdServ !== 'undefined') {
      body.clave_prodserv = claves.claveProdServ || null;
    }
    if (typeof claves.claveUnidad !== 'undefined') {
      body.clave_unidad_medida = claves.claveUnidad || null;
    }

    await apiPut(`${PRODUCTOS}/${id}`, body);

    setProductos((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, claveProdServ: body.clave_prodserv, claveUnidad: body.clave_unidad_medida } : p
      )
    );
  }

  const faltanClavesGlobal = useMemo(() => {
    return productos.some(p => !p.claveProdServ || !p.claveUnidad);
  }, [productos]);

  const [timbrando, setTimbrando] = useState(false);

  // async function handleTimbrar() { // Para cuando se ocupe el endpoint de timbrado
  //   try {
  //     setTimbrando(true);
  //     const body: any = { ventasIds };
  //     if (cliente?.id) body.clienteId = cliente.id;
  //     await api.post(CFDI_TIMBRAR, body);
  //     toast.success('CFDI timbrado correctamente');
  //     onOpenChange(false);
  //     onTimbradoOk();
  //   } catch (e: any) {
  //     toast.error(e?.response?.data?.error || 'No se pudo timbrar');
  //   } finally {
  //     setTimbrando(false);
  //   }
  // }

  return (
    <Dialog
      open={open}
      onOpenChange={
        (v) => {
          if (!v && huboCambiosCliente && clienteGuardado && onClienteActualizado) {
            onClienteActualizado(clienteGuardado);
            setHuboCambiosCliente(false);
            setClienteGuardado(null);
          }
          if (!v && onCerrar) onCerrar();
          onOpenChange(v);
        }
      }
    >
      <DialogOverlay className="bg-black/40 fixed inset-0 z-40" />
      <DialogContent className="z-50 max-w-6xl xl:max-w-7xl w-[98vw] rounded-2xl border shadow-xl p-0 overflow-hidden flex flex-col">
        <DialogHeader className="sticky top-0 z-20 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b px-6 pt-5 pb-3">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-500" />
            Facturar {ventasIds.length} venta(s)
          </DialogTitle>
        </DialogHeader>


        {/* Contenedor con scroll controlado */}
        <div className="px-6 pb-3 max-h-[80vh] xl:max-h-[84vh] overflow-auto flex-1 bg-muted/20">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Columna izquierda: Cliente */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border bg-white shadow-sm p-5">
                <ClienteCard initialCliente={cliente} onSaveCliente={saveCliente} />
              </div>
            </div>

            {/* Columna derecha: Productos */}
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-3 min-h-[48vh]">

                <div className="flex items-center justify-between">
                  <div className="font-medium flex items-center gap-2">
                    <span
                      className={`inline-flex h-2.5 w-2.5 rounded-full ${!faltanClavesGlobal ? 'bg-emerald-500' : 'bg-orange-500'}`}
                      title={!faltanClavesGlobal ? 'Todos los productos completos' : 'Faltan claves en productos'}
                    />

                    Productos a facturar
                  </div>
                  {loadingProductos && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>

                <ProductosTabla
                  productos={productos}
                  cantidadesPorProducto={cantidadesPorProducto}
                  onSaveClaves={saveClavesProducto}
                />
              </div>

              <div className="flex items-center justify-between px-1">
                {faltanClavesGlobal ? (
                  <div className="text-xs text-red-600 inline-flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Aún faltan claves en uno o más productos.
                  </div>
                ) : <span className="text-xs text-emerald-600">Todo listo</span>}
              </div>
            </div>
          </div>
        </div>

      </DialogContent >
    </Dialog>
  );
}


export default function VentasPage() {
  // Rango por defecto: últimos 7 días
  const [fechaInicio, setFechaInicio] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10);
  });
  const [fechaFin, setFechaFin] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [preset, setPreset] = useState<'custom' | 'today' | 'week' | 'month' | 'last30'>('custom');

  // NUEVO: ids de ventas para asignar cliente en bloque
  const [asignarClienteVentaIds, setAsignarClienteVentaIds] = useState<number[] | null>(null);

  // Búsqueda
  const [searchMode, setSearchMode] = useState<SearchMode>('todo');
  const [query, setQuery] = useState('');
  const [incluirDevueltas, setIncluirDevueltas] = useState(false);

  // Modal filtros
  const [openModal, setOpenModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Datos
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(false);

  // Paginación
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Selección
  const [seleccion, setSeleccion] = useState<number[]>([]);
  const [openFacturar, setOpenFacturar] = useState(false);

  const sucursalId = useMemo(() => getSucursalId(), []);

  // Presets de fecha
  useEffect(() => {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    if (preset === 'today') {
      setFechaInicio(fmt(now)); setFechaFin(fmt(now));
    } else if (preset === 'week') {
      const monday = new Date(now);
      const day = monday.getDay();
      const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
      monday.setDate(diff);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setFechaInicio(fmt(monday)); setFechaFin(fmt(sunday));
    } else if (preset === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setFechaInicio(fmt(first)); setFechaFin(fmt(last));
    } else if (preset === 'last30') {
      const start = new Date(now); start.setDate(start.getDate() - 29);
      setFechaInicio(fmt(start)); setFechaFin(fmt(now));
    }
  }, [preset]);

  // Autofocus input al abrir modal
  useEffect(() => {
    if (!openModal) return;
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [openModal]);

  async function fetchVentasBase(rangeWidenDays = 0) {
    const s = parseYMD(fechaInicio);
    const e = parseYMD(fechaFin);
    if (rangeWidenDays > 0) {
      s.setDate(s.getDate() - rangeWidenDays);
      e.setDate(e.getDate() + rangeWidenDays);
    }

    const params: any = {
      sucursalId,
      fechaInicio: startOfDayIsoUTC(s),
      fechaFin: endOfDayIsoUTC(e),
    };

    const [resActivas, resDevueltas] = await Promise.all([
      apiGet<Venta[]>(VENTAS_LIST, { params }),
      incluirDevueltas
        ? apiGet<Venta[]>(VENTAS_LIST, { params: { ...params, activos: '0' } })
        : Promise.resolve({ data: [] as Venta[] }),
    ]);

    const merged = [...(resActivas.data || []), ...(resDevueltas.data || [])];
    return Array.from(new Map(merged.map(v => [v.id, v])).values());
  }

  async function fetchVentaById(idVal: number) {
    const { data } = await apiGet<Venta>(`${VENTAS_LIST}/${idVal}`);
    return data ? [data] : [];
  }

  // Carga inicial
  useEffect(() => { handleBuscar(true).catch(console.error); /* eslint-disable-line */ }, []);

  // Buscar
  async function handleBuscar(silent = false) {
    try {
      setLoading(true);
      const q = query.trim().toLowerCase();

      // Atajo: modo folio + numérico => GET /venta/:id
      if (searchMode === 'folio' && /^\d+$/.test(q)) {
        const arr = await fetchVentaById(Number(q));
        setVentas(arr); setPage(1); setSeleccion([]);
        if (!silent) toast.success(`Se cargaron ${arr.length} ventas`);
        return;
      }

      // Si hay texto, ampliamos 60 días para mayor recall
      const base = await fetchVentasBase(q ? 60 : 0);

      const filtered = base.filter((v) => {
        // Filtro por folio
        const folioStr = `${renderFolio(v)} ${(v.numdoc ?? '')}`.toLowerCase();
        const okFolio =
          (searchMode === 'folio' || searchMode === 'todo')
            ? (!q || folioStr.includes(q))
            : true;

        // Filtro por cliente (razones sociales y RFC)
        const clienteStr = `${v.cliente?.razon_social ?? ''} ${v.cliente?.razon_social_facturacion ?? ''} ${v.cliente?.rfc_facturacion ?? ''} ${v.cliente?.nom_contacto ?? ''} ${v.cliente?.email ?? ''} ${v.cliente?.telefono ?? ''} ${v.cliente?.movil ?? ''}`.toLowerCase();
        const okCliente =
          (searchMode === 'cliente' || searchMode === 'todo')
            ? (!q || clienteStr.includes(q))
            : true;

        // En modo "todo" basta con que haga match en alguno
        if (searchMode === 'todo') {
          return okFolio || okCliente;
        }
        return okFolio && okCliente;
      });

      setVentas(filtered); setPage(1); setSeleccion([]);
      if (!silent) toast.success(`Se cargaron ${filtered.length} ventas`);
    } catch (err: any) {
      if (err?.code === 'NO_TOKEN' || err?.message === 'NO_TOKEN') {
        toast.error('Inicia sesión para continuar.');
      } else {
        console.error(err);
        toast.error(err?.response?.data?.error || 'Error al cargar ventas');
      }
      setVentas([]);
    } finally {
      setLoading(false);
    }
  }

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return ventas.slice(start, start + pageSize);
  }, [ventas, page]);

  const totalPages = Math.max(1, Math.ceil(ventas.length / pageSize));

  const resetFiltros = () => {
    setPreset('custom');
    const d = new Date(); const start = new Date(); start.setDate(d.getDate() - 7);
    setFechaInicio(start.toISOString().slice(0, 10));
    setFechaFin(d.toISOString().slice(0, 10));
    setQuery('');
    setIncluirDevueltas(false);
    setSearchMode('todo');
  };

  // Manejar selección restringida al mismo cliente
  function toggleSeleccion(venta: Venta) {
    const already = seleccion.includes(venta.id);

    if (already) {
      setSeleccion(seleccion.filter(id => id !== venta.id));
      return;
    }

    // Si es la primera, se permite
    if (seleccion.length === 0) {
      setSeleccion([venta.id]);
      return;
    }

    const selectedVentas = ventas.filter(v => seleccion.includes(v.id));
    const baseClienteId = selectedVentas[0]?.cliente?.id ?? null;
    const newClienteId = venta.cliente?.id ?? null;

    if (baseClienteId !== newClienteId) {
      toast.error('Solo puedes seleccionar ventas del mismo cliente.');
      return;
    }

    setSeleccion([...seleccion, venta.id]);
  }

  const ventasSeleccionadas = useMemo(
    () => ventas.filter(v => seleccion.includes(v.id)),
    [ventas, seleccion]
  );
  // helper: actualiza en memoria las ventas que correspondan a ese cliente
  const applyClienteEnTabla = (clienteActualizado: Cliente) => {
    setVentas(prev =>
      prev.map(v => {
        if (v.cliente?.id === clienteActualizado.id) {
          return { ...v, cliente: { ...(v.cliente || {}), ...clienteActualizado } };
        }
        return v;
      })
    );
  };

  // NUEVO: derivadas para asignación y facturación
  const ventasSeleccionadasSinCliente = useMemo(
    () => ventasSeleccionadas.filter(v => !v.cliente),
    [ventasSeleccionadas]
  );

  const haySeleccionSinCliente = useMemo(
    () => ventasSeleccionadas.some(v => !v.cliente),
    [ventasSeleccionadas]
  );

  const facturarDisabled = ventasSeleccionadas.length === 0 || haySeleccionSinCliente;
  const facturarTitle =
    ventasSeleccionadas.length === 0
      ? 'Selecciona al menos una venta'
      : (haySeleccionSinCliente ? 'Asigna un cliente a todas las ventas seleccionadas' : 'Abrir facturación');

  // Enter para aplicar / Esc para cerrar modal filtros
  useEffect(() => {
    if (!openModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenModal(false);
      if (e.key === 'Enter') {
        e.preventDefault();
        handleBuscar(false).then(() => setOpenModal(false));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openModal, searchMode, query, fechaInicio, fechaFin, incluirDevueltas]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Ventas</h1>
          <p className="text-sm text-muted-foreground">Selecciona ventas del mismo cliente y factura en lote</p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setOpenModal(true)} variant="outline" className="gap-2 rounded-xl shadow-sm">
            <SlidersHorizontal className="h-4 w-4" />
            Buscar
          </Button>
          <Button
            className="gap-2 rounded-xl"
            onClick={() => setOpenFacturar(true)}
            disabled={facturarDisabled}
            title={facturarTitle}
          >
            <FileText className="h-4 w-4" />
            Facturar seleccionadas ({ventasSeleccionadas.length})
          </Button>
        </div>
      </div>

      {/* Modal filtros */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogOverlay className="bg-black/40 fixed inset-0 z-40" />
        <DialogContent className="z-50 max-w-2xl w={[`95vw`]} rounded-2xl border shadow-xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-3">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Search className="h-5 w-5 text-orange-500" />
              Búsqueda rápida
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 pb-4 space-y-4">
            {/* Campo único */}
            <div>
              <label className="text-xs text-muted-foreground">Escribe folio, razón social o RFC</label>
              <Input
                ref={inputRef}
                placeholder="Ej: VV-00012-2025 · RAZÓN SOCIAL · ABCD800101XYZ"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="text-[11px] text-muted-foreground mt-1">
                Si escribes un número en modo "Folio".
              </div>
            </div>

            {/* Buscar por */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Buscar por:</span>
              {(['todo', 'folio', 'cliente'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setSearchMode(m)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition ${searchMode === m
                    ? 'bg-orange-600 text-white border-orange-600'
                    : 'bg-white hover:bg-orange-50'
                    }`}
                >
                  {m === 'todo' ? 'Todo' : m === 'folio' ? 'Folio' : 'Cliente'}
                </button>
              ))}
            </div>

            {/* Rango de fechas compacto */}
            <div className="rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Rango
                </div>
                <Select value={preset} onValueChange={(v) => setPreset(v as any)}>
                </Select>
              </div>

              {preset === 'custom' && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-xs">Desde</label>
                    <Input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => { setFechaInicio(e.target.value); setPreset('custom'); }}
                    />
                  </div>
                  <div>
                    <label className="text-xs">Hasta</label>
                    <Input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => { setFechaFin(e.target.value); setPreset('custom'); }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <input
                  id="devueltas"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={incluirDevueltas}
                  onChange={(e) => setIncluirDevueltas(e.target.checked)}
                />
                <label htmlFor="devueltas" className="text-sm">Incluir devoluciones</label>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 bg-muted/30 flex items-center justify-between">
            <Button variant="ghost" className="gap-2" onClick={resetFiltros}>
              <Undo2 className="h-4 w-4" />
              Limpiar
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpenModal(false)}>
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  await handleBuscar(false);
                  setOpenModal(false);
                }}
                className="gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Aplicar filtros
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50 sticky top-0 z-10">
            <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
              <th className="w-10"></th>
              <th>Folio</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Usuario</th>
              <th className="text-right">Subtotal</th>
              <th className="text-right">Impuestos</th>
              <th className="text-right">Descuento</th>
              <th className="text-right">Total</th>
              <th className="text-center">Id/Factura</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />
                  Cargando ventas…
                </td>
              </tr>
            )}

            {!loading && paged.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center">
                  <div className="text-base font-medium">Sin resultados</div>
                  <div className="text-sm text-muted-foreground mt-1">Ajusta los filtros y vuelve a intentar.</div>
                </td>
              </tr>
            )}

            {!loading &&
              paged.map((v) => {
                const folio = renderFolio(v);
                const fechaFmt = new Date(v.fecha).toLocaleString();
                const clienteNom =
                  v.cliente
                    ? (
                      v.cliente.razon_social_facturacion?.trim() ||
                      v.cliente.razon_social?.trim() ||
                      v.cliente.rfc_facturacion ||
                      '—'
                    )
                    : 'PÚBLICO EN GENERAL';
                const usuarioNom = v.usuario ? `${v.usuario.nombre} ${v.usuario.apellidos}` : '—';

                const checked = seleccion.includes(v.id);

                return (
                  <tr key={v.id} className="[&>td]:px-3 [&>td]:py-2 border-t hover:bg-orange-50/50">
                    <td className="align-middle">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={checked}
                        onChange={() => toggleSeleccion(v)}
                        title="Seleccionar venta para facturar"
                      />
                    </td>
                    <td className="font-medium">{folio}</td>
                    <td>{fechaFmt}</td>
                    <td>
                      {v.cliente ? (
                        <>
                          {v.cliente.razon_social_facturacion?.trim() ||
                            v.cliente.razon_social?.trim() ||
                            v.cliente.rfc_facturacion ||
                            '—'}
                        </>
                      ) : (
                        <>
                          {checked ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              onClick={() => {
                                const ids = ventasSeleccionadasSinCliente.length > 0
                                  ? ventasSeleccionadasSinCliente.map(vs => vs.id)
                                  : [v.id];
                                setAsignarClienteVentaIds(ids);
                              }}
                              title="Asignar cliente a ventas seleccionadas sin cliente"
                            >
                              <UserPlus className="h-4 w-4" />
                              Asignar cliente
                            </Button>
                          ) : (
                            <div className="text-muted-foreground">
                              PÚBLICO EN GENERAL
                              <div className="text-[11px]">Selecciona la venta para asignar un cliente</div>
                            </div>
                          )}
                        </>
                      )}
                    </td>

                    <td>{usuarioNom}</td>
                    <td className="text-right">{(v.subtotal ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</td>
                    <td className="text-right">{(v.impuestos ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</td>
                    <td className="text-right">{(v.descuento ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</td>
                    <td className="text-right font-semibold">{(v.total ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Paginación + acciones selección */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          Mostrando {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, ventas.length)} de {ventas.length}
        </div>
        <div className="flex items-center gap-2">
          {seleccion.length > 0 && (
            <>
              <div className="text-sm">
                Seleccionadas: <span className="font-medium">{seleccion.length}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1"
                onClick={() => setSeleccion([])}
                title="Limpiar selección"
              >
                <XCircle className="h-4 w-4" />
                Limpiar
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1"
          >
            <Rewind className="h-4 w-4" />
            Anterior
          </Button>
          <div className="text-sm">{page} / {totalPages}</div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1"
          >
            Siguiente
            <FastForward className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Wizard de facturación */}
      <FacturarWizard
        open={openFacturar}
        onOpenChange={setOpenFacturar}
        ventasSeleccionadas={ventasSeleccionadas}
        onTimbradoOk={() => {
          // refrescar listado y limpiar selección
          handleBuscar(true).catch(console.error);
          setSeleccion([]);
        }}
        onClienteActualizado={(cli) => {
          applyClienteEnTabla(cli);
          toast.success('Cliente actualizado en la tabla');
        }}
      />

      {/* NUEVO: diálogo de asignación en lote */}
      <AsignarClienteDialog
        open={asignarClienteVentaIds !== null}
        onOpenChange={(v) => setAsignarClienteVentaIds(v ? asignarClienteVentaIds : null)}
        ventaIds={asignarClienteVentaIds ?? []}
        onAsignado={(ventasAct) => {
          setVentas((prev) =>
            prev.map((v) => {
              const found = ventasAct.find((x) => x.id === v.id);
              return found ? { ...v, cliente: found.cliente } : v;
            })
          );
        }}
      />



    </div>
  );
}
