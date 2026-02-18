'use client';

import { useEffect, useMemo, useState, memo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Loader2, Building2, FileText, ShieldCheck, KeyRound, UploadCloud, CheckCircle2, XCircle } from 'lucide-react';

const sfEnv =
  (process.env.NEXT_PUBLIC_SF_ENV_DEFAULT || 'test').toLowerCase() === 'prod' ? 'prod' : 'test';
// const sfEnvLabel = sfEnv === 'prod' ? 'Producción' : 'Testing';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const CSD_PRESIGNED = `${apiUrl}/uploadsRoutes/getPresignedPostForSucursalCSDPair`;
const CSD_VALIDATE = `${apiUrl}/facturacion/validar-csd`;
const S3_CONFIRM = `${apiUrl}/uploadsRoutes/confirm`;
const CSD_SAVE_PASS = `${apiUrl}/facturacion/csd/password`;

const GIROS_COMERCIALES = [
  'Abarrotes', 'Papelería', 'Farmacia', 'Ferretería', 'Estética / Barbería',
  'Tienda de ropa', 'Miscelánea', 'Restaurante', 'Cafetería', 'Taquería',
  'Panadería', 'Carnicería', 'Tienda de electrónicos', 'Refaccionaria',
  'Tienda naturista', 'Tlapalería', 'Oficina / Servicios profesionales',
];

type Regimen = {
  clave: string;
  descripcion: string;
  aplica_fisica: boolean;
  aplica_moral: boolean;
};

type FieldProps = {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
};

const Field = memo(function Field({ label, hint, children, className = '' }: FieldProps) {
  return (
    <div className={className}>
      <div className="text-sm font-medium mb-1">{label}</div>
      {children}
      {hint ? <p className="text-xs text-muted-foreground mt-1">{hint}</p> : null}
    </div>
  );
});
Field.displayName = 'Field';

/* =======================
   Helpers de sanitización
======================= */
const toRFC = (v: string) =>
  (v ?? '')
    .replace(/[-–—\s]/g, '')
    .toUpperCase()
    .slice(0, 13);

const onlyDigits = (v: string, max = 5) =>
  (v ?? '').replace(/\D/g, '').slice(0, max);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RFC_FISICA_RE = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;
const RFC_MORAL_RE = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/;

type Form = {
  razon_social: string;
  rfc: string;
  contacto: string;
  direccion: string;
  colonia: string;
  estado: string;
  municipio: string;
  cp: string;
  correo: string;
  tel: string;
  cel: string;
  giro_comercial: string;
  nombre_comercial: string;
  tipo_persona: string;
  regimen_fiscal: string;
  correo_notificacion: string;
};

type Errors = Partial<Record<
  | 'razon_social'
  | 'rfc'
  | 'cp'
  | 'correo'
  | 'correo_notificacion'
  | 'tel'
  | 'cel'
  | 'regimen_fiscal'
  | 'tipo_persona',
  string
>>;

async function uploadWithPresigned(url: string, fields: Record<string, string>, file: File) {
  const formData = new FormData();
  Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
  formData.append('file', file);
  const resp = await fetch(url, { method: 'POST', body: formData });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Error al subir a S3 (${resp.status}): ${txt.slice(0, 300)}`);
  }
}


/* =======================
   Validación de formulario
======================= */
function computeErrors(f: Form): Errors {
  const e: Errors = {};
  if (!f.correo?.trim()) e.correo = 'El correo es obligatorio.';
  else if (!EMAIL_RE.test(f.correo.trim())) e.correo = 'Correo inválido.';

  if (f.tel && f.tel.length !== 10) e.tel = 'El teléfono debe tener 10 dígitos.';
  if (f.cel && f.cel.length !== 10) e.cel = 'El celular debe tener 10 dígitos.';
  if (f.cp && f.cp.length !== 5) e.cp = 'El C.P. debe tener 5 dígitos.';

  if (f.tipo_persona) {
    if (!f.regimen_fiscal) e.regimen_fiscal = 'Selecciona un régimen fiscal.';
    if (!f.razon_social?.trim()) e.razon_social = 'La razón social es obligatoria para timbrado.';
    if (!f.rfc) e.rfc = 'El RFC es obligatorio para timbrado.';
    else {
      if (f.tipo_persona === 'FISICA') {
        if (f.rfc.length !== 13 || !RFC_FISICA_RE.test(f.rfc)) {
          e.rfc = 'RFC de persona física inválido (formato: 4 letras + 6 dígitos + 3 alfanum).';
        }
      } else if (f.tipo_persona === 'MORAL') {
        if (f.rfc.length !== 12 || !RFC_MORAL_RE.test(f.rfc)) {
          e.rfc = 'RFC de persona moral inválido (formato: 3 letras + 6 dígitos + 3 alfanum).';
        }
      }
    }
  } else {
    if (f.rfc && !RFC_FISICA_RE.test(f.rfc) && !RFC_MORAL_RE.test(f.rfc)) {
      e.rfc = 'RFC con formato inválido.';
    }
  }

  if (f.correo_notificacion?.trim() && !EMAIL_RE.test(f.correo_notificacion.trim())) {
    e.correo_notificacion = 'Correo de CFDI inválido.';
  }

  return e;
}

/* ============
   Componente
=========== */
export default function SucursalForm() {
  const [form, setForm] = useState<Form>({
    razon_social: '',
    rfc: '',
    contacto: '',
    direccion: '',
    colonia: '',
    estado: '',
    municipio: '',
    cp: '',
    correo: '',
    tel: '',
    cel: '',
    giro_comercial: '',
    nombre_comercial: '',
    tipo_persona: '',
    regimen_fiscal: '',
    correo_notificacion: '',
  });

  const [regimenes, setRegimenes] = useState<Regimen[]>([]);
  const [loadingRegimen, setLoadingRegimen] = useState(false);
  const [buscarRegimen, setBuscarRegimen] = useState('');
  const [saving, setSaving] = useState(false);
  const [openRegimen, setOpenRegimen] = useState(false);

  // incluir nueva pestaña 'archivos'
  const [tab, setTab] = useState<'generales' | 'facturacion' | 'archivos'>('generales');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const sucursalId = typeof window !== 'undefined' ? localStorage.getItem('sucursalId') : null;
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  // estilos select
  const triggerSolid =
    'bg-white border shadow-sm rounded-md h-10 px-3 data-[placeholder]:text-muted-foreground ' +
    'hover:bg-orange-50/30 focus:ring-2 focus:ring-orange-200';
  const contentSolid = 'bg-white border shadow-md rounded-md';
  const itemSolid = 'cursor-pointer focus:bg-orange-50 focus:text-foreground';

  // errores y validez
  const errors = useMemo(() => computeErrors(form), [form]);
  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  // =========================
  // Archivos de facturación
  // =========================
  const [cerFile, setCsdFile] = useState<File | null>(null); // .cer
  const [keyFile, setKeyFile] = useState<File | null>(null); // .key
  const [cerPass, setCerPass] = useState('');
  const [validateWithSF, setValidateWithSF] = useState(sfEnv === 'test');


  const [filesStatus, setFilesStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [filesError, setFilesError] = useState<string>('');
  const [serverReport, setServerReport] = useState<null | {
    ok: boolean;
    errors: { code: string; message: string }[];
    csdInfo?: {
      rfc: string | null;
      noCertificado: string | null;
      notBefore: string | null;
      notAfter: string | null;
      keyOpens: boolean;
      modulusMatch: boolean | null;
      isCsd: boolean | null;
    };
    sf?: { withSF: boolean; env?: string; endpoint?: string; authOk: boolean | null; raw?: any };

  }>(null);

  // claves S3 resultantes de la subida
  const [bucket, setBucket] = useState<string>('');
  const [cerKeyS3, setCerKeyS3] = useState<string>(''); // key del .cer en S3
  const [keyKeyS3, setKeyKeyS3] = useState<string>(''); // key del .key en S3
  const isFiel = serverReport?.csdInfo?.isCsd === false;

  const resetFilesState = () => {
    setFilesStatus('idle');
    setFilesError('');
    setServerReport(null);
  };

  const onPickCsd = (f?: File) => {
    setCsdFile(f ?? null);
    resetFilesState();
  };
  const onPickKey = (f?: File) => {
    if (!f) {
      setKeyFile(null);
      resetFilesState();
      return;
    }
    const name = f.name?.toLowerCase() || '';
    if (!name.endsWith('.key')) {
      toast.error('La llave debe ser un archivo .key');
      return;
    }
    setKeyFile(f);
    resetFilesState();
  };

  const isExt = (name: string | undefined, ...exts: string[]) => {
    if (!name) return false;
    const lower = name.toLowerCase();
    return exts.some(e => lower.endsWith(e));
  };

  const isBusy = filesStatus === 'validating';

  // ---------- helpers de S3 ----------
  async function uploadPairToS3(): Promise<{ bucket: string; cerKey: string; keyKey: string }> {
    if (!sucursalId) throw new Error('Falta sucursalId');

    const { data } = await axios.post(CSD_PRESIGNED, {
      sucursalId: Number(sucursalId),
      cerFileName: cerFile!.name,
      cerContentType: cerFile!.type || 'application/pkix-cert',
      cerFileSize: cerFile!.size,
      keyFileName: keyFile!.name,
      keyContentType: keyFile!.type || 'application/octet-stream',
      keyFileSize: keyFile!.size,
    }, { headers: authHeader });

    const { bucket, cer, key } = data as {
      bucket: string;
      cer: { url: string; fields: Record<string, string>; key: string };
      key: { url: string; fields: Record<string, string>; key: string };
    };

    await uploadWithPresigned(cer.url, cer.fields, cerFile!);
    await uploadWithPresigned(key.url, key.fields, keyFile!);

    return { bucket, cerKey: cer.key, keyKey: key.key };
  }

  // ---------- Validación en servidor ----------
  const validarEnServidor = async () => {
    try {
      setFilesStatus('validating');
      setFilesError('');
      setServerReport(null);

      if (!cerFile) throw new Error('Adjunta el archivo .cer.');
      if (!keyFile) throw new Error('Adjunta el archivo .key.');
      if (!cerPass.trim()) throw new Error('Ingresa la contraseña del CSD/KEY.');

      const MAX_BYTES = 1 * 1024 * 1024;
      const okExt = (n: string, ...es: string[]) => es.some(e => n.toLowerCase().endsWith(e));

      if (!okExt(cerFile.name, '.cer')) throw new Error('El certificado debe ser .cer');
      if (!okExt(keyFile.name, '.key')) throw new Error('La llave debe ser .key.');

      if (cerFile.size <= 0 || cerFile.size > MAX_BYTES) {
        throw new Error('El .cer está vacío o excede 1MB.');
      }
      if (keyFile.size <= 0 || keyFile.size > MAX_BYTES) {
        throw new Error('El .key está vacío o excede 1MB.');
      }

      // 1) subir a S3
      const { bucket, cerKey, keyKey } = await uploadPairToS3();
      setBucket(bucket);
      setCerKeyS3(cerKey);
      setKeyKeyS3(keyKey);

      // 2) validar en backend Test
      // const { data } = await axios.post(CSD_VALIDATE, {
      //   bucket,
      //   cerKey,
      //   keyKey,
      //   password: cerPass,
      //   validateWithSF,
      //   sucursalId: Number(sucursalId) || undefined,
      // }, { headers: authHeader });

      const { data } = await axios.post(CSD_VALIDATE, {
        bucket,
        cerKey,
        keyKey,
        password: cerPass,
        validateWithSF,
        sucursalId: Number(sucursalId) || undefined,
      }, { headers: authHeader });


      setServerReport(data);

      // Aviso si el RFC del CSD no coincide con el de la sucursal
      const rfcSrv = (data?.csdInfo?.rfc || '').toUpperCase();
      const rfcForm = (form?.rfc || '').toUpperCase();
      if (rfcSrv && rfcForm && rfcSrv !== rfcForm) {
        toast.message('El RFC del certificado no coincide con el de la sucursal', {
          description: `CSD: ${rfcSrv} · Sucursal: ${rfcForm}`,
        });
      }

      // ⚠️ ADVERTENCIA si es FIEL (no CSD)
      if (data?.csdInfo?.isCsd === false) {
        toast.warning('El certificado es FIEL (e.firma) y no timbra CFDI. Sube un CSD.');
      }

      if (data?.ok) {
        setFilesStatus('valid');
        toast.success('CSD válido');
      } else {
        setFilesStatus('invalid');
        const msg = (data?.errors || []).map((e: any) => e.message).join('\n') || 'Validación falló';
        setFilesError(msg);
        toast.error('Validación falló');
      }
    } catch (err: any) {
      setFilesStatus('invalid');
      const msg = err?.response?.data?.message || err?.message || 'Error al validar';
      setFilesError(msg);
      toast.error(msg);
    }
  };

  // ---------- Guardar en BD (confirmar S3 + persistir pass cifrada) ----------
  const guardarArchivos = async () => {
    try {
      if (!sucursalId) throw new Error('Falta sucursalId');
      if (!bucket || !cerKeyS3 || !keyKeyS3) throw new Error('Primero valida y sube los archivos.');

      // Confirmar .cer/.csd
      await axios.post(S3_CONFIRM, { sucursalId: Number(sucursalId), key: cerKeyS3 }, { headers: authHeader });
      // Confirmar .key
      await axios.post(S3_CONFIRM, { sucursalId: Number(sucursalId), key: keyKeyS3 }, { headers: authHeader });

      // Guardar contraseña cifrada
      if (cerPass && cerPass.trim().length > 0) {
        await axios.put(CSD_SAVE_PASS, {
          sucursalId: Number(sucursalId),
          password: cerPass,
        }, { headers: authHeader });
      }

      toast.success('Archivos asociados a la sucursal');
    } catch (err: any) {
      const msg = err?.response?.data?.mensaje || err?.response?.data?.message || err?.message || 'Error al asociar archivos';
      toast.error(msg);
    }
  };

  const canValidate = !!cerFile && !!keyFile && !!cerPass && filesStatus !== 'validating';
  // const canSaveFiles = filesStatus === 'valid' && !!cerKeyS3 && !!keyKeyS3;
  const canSaveFiles = filesStatus === 'valid' && !!cerKeyS3 && !!keyKeyS3 && !isFiel;

  // --------- cargar sucursal ----------
  const cargarSucursal = async () => {
    try {
      const res = await axios.get(`${apiUrl}/sucursales/${sucursalId}`, { headers: authHeader });
      const d = res.data || {};
      setForm(prev => ({
        ...prev,
        razon_social: d.razon_social ?? prev.razon_social ?? '',
        rfc: toRFC(d.rfc ?? prev.rfc ?? ''),
        contacto: d.contacto ?? prev.contacto ?? '',
        direccion: d.direccion ?? prev.direccion ?? '',
        colonia: d.colonia ?? prev.colonia ?? '',
        estado: d.estado ?? prev.estado ?? '',
        municipio: d.municipio ?? prev.municipio ?? '',
        cp: onlyDigits(d.cp ?? prev.cp ?? '', 5),
        correo: (d.correo ?? prev.correo ?? '').trim(),
        tel: onlyDigits(d.tel ?? prev.tel ?? '', 10),
        cel: onlyDigits(d.cel ?? prev.cel ?? '', 10),
        giro_comercial: d.giro_comercial ?? prev.giro_comercial ?? '',
        nombre_comercial: d.nombre_comercial ?? prev.nombre_comercial ?? '',
        tipo_persona: d.tipo_persona ?? prev.tipo_persona ?? '',
        regimen_fiscal: d.regimen_fiscal ?? prev.regimen_fiscal ?? '',
        correo_notificacion: (d.correo_notificacion ?? prev.correo_notificacion ?? '').trim().toLowerCase(),
      }));
    } catch (error) {
      console.error(error);
      toast.error('No se pudo cargar la sucursal');
    }
  };

  // --------- guardar sucursal ----------
  const guardarSucursal = async () => {
    const payload: Form = {
      ...form,
      rfc: toRFC(form.rfc),
      cp: onlyDigits(form.cp, 5),
      tel: onlyDigits(form.tel, 10),
      cel: onlyDigits(form.cel, 10),
      correo: (form.correo || '').trim(),
      correo_notificacion: (form.correo_notificacion || '').trim().toLowerCase(),
    };

    const currentErrors = computeErrors(payload);
    if (Object.keys(currentErrors).length > 0) {
      if (currentErrors.regimen_fiscal || currentErrors.rfc || currentErrors.razon_social || currentErrors.correo_notificacion) {
        setTab('facturacion');
      } else {
        setTab('generales');
      }
      toast.error('Corrige los campos marcados antes de guardar.');
      return;
    }

    try {
      setSaving(true);
      await axios.put(`${apiUrl}/sucursales/${sucursalId}`, payload, {
        headers: { ...authHeader, 'Content-Type': 'application/json' },
      });
      toast.success('Sucursal actualizada con éxito');
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar la sucursal. Verifica los datos o intenta más tarde.');
    } finally {
      setSaving(false);
    }
  };

  // --------- cargar regímenes ----------
  const cargarRegimenes = async (opts?: { all?: boolean }) => {
    if (!form.tipo_persona) {
      setRegimenes([]);
      return;
    }
    try {
      setLoadingRegimen(true);
      const params = new URLSearchParams();
      params.set('persona', form.tipo_persona);
      const q = buscarRegimen.trim();
      if (!opts?.all && q) params.set('q', q);

      const res = await axios.get(`${apiUrl}/facturacion/regimen-fiscal/cli?${params.toString()}`, {
        headers: authHeader,
      });
      const lista: Regimen[] = res.data || [];
      setRegimenes(lista);
    } catch (e) {
      console.error(e);
      toast.error('No se pudieron cargar los regímenes fiscales');
    } finally {
      setLoadingRegimen(false);
    }
  };

  // init
  useEffect(() => {
    if (token && sucursalId) cargarSucursal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, sucursalId]);

  // debounce búsqueda regímenes
  useEffect(() => {
    if (!token) return;
    const id = setTimeout(() => cargarRegimenes(), 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.tipo_persona, buscarRegimen, token]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white p-6 shadow rounded-2xl space-y-5">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-orange-600" />
          <h2 className="text-xl font-bold text-orange-600">Editar Sucursal</h2>
          {/* <span //Entorno en el que esta el frontend 
            className={`ml-auto text-xs px-2 py-1 rounded-full border ${sfEnv === 'prod'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            title="Entorno configurado para Solución Factible"
          >
            Entorno SF: <b>{sfEnvLabel}</b>
          </span> */}
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-3 w-full rounded-xl">
            <TabsTrigger value="generales" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">
              Datos Generales
            </TabsTrigger>
            <TabsTrigger value="facturacion" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">
              <div className="inline-flex items-center gap-2">
                <FileText className="h-4 w-4" /> Datos de Facturación
              </div>
            </TabsTrigger>
            <TabsTrigger value="archivos" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">
              <div className="inline-flex items-center gap-2">
                <UploadCloud className="h-4 w-4" /> Archivos de facturación
              </div>
            </TabsTrigger>
          </TabsList>

          {/* Generales */}
          <TabsContent value="generales" forceMount>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <Field label="Razón social">
                <Input
                  value={form.razon_social ?? ''}
                  onChange={(e) => setForm(p => ({ ...p, razon_social: e.target.value }))}
                />
                {errors.razon_social && <p className="text-xs text-red-600 mt-1">{errors.razon_social}</p>}
              </Field>

              <Field label="RFC">
                <Input
                  value={form.rfc ?? ''}
                  onChange={(e) => setForm(p => ({ ...p, rfc: toRFC(e.target.value) }))}
                  onBlur={(e) => setForm(p => ({ ...p, rfc: toRFC(e.target.value) }))}
                  autoCapitalize="characters"
                  placeholder="EJEMPLO000101ABC"
                />
                {errors.rfc && <p className="text-xs text-red-600 mt-1">{errors.rfc}</p>}
              </Field>

              <Field label="Dirección">
                <Input value={form.direccion ?? ''} onChange={(e) => setForm(p => ({ ...p, direccion: e.target.value }))} />
              </Field>

              <Field label="Colonia">
                <Input value={form.colonia ?? ''} onChange={(e) => setForm(p => ({ ...p, colonia: e.target.value }))} />
              </Field>

              <Field label="Municipio">
                <Input value={form.municipio ?? ''} onChange={(e) => setForm(p => ({ ...p, municipio: e.target.value }))} />
              </Field>

              <Field label="Estado">
                <Input value={form.estado ?? ''} onChange={(e) => setForm(p => ({ ...p, estado: e.target.value }))} />
              </Field>

              <Field label="Código Postal">
                <Input
                  value={form.cp ?? ''}
                  onChange={(e) => setForm(p => ({ ...p, cp: onlyDigits(e.target.value, 5) }))}
                  inputMode="numeric"
                  pattern="\d*"
                  placeholder="XXXXX"
                />
                {errors.cp && <p className="text-xs text-red-600 mt-1">{errors.cp}</p>}
              </Field>

              <Field label="Correo">
                <Input
                  type="email"
                  value={form.correo ?? ''}
                  onChange={(e) => setForm(p => ({ ...p, correo: e.target.value.replace(/\s/g, '') }))}
                  onBlur={(e) => setForm(p => ({ ...p, correo: (e.target.value || '').trim() }))}
                />
                {errors.correo && <p className="text-xs text-red-600 mt-1">{errors.correo}</p>}
              </Field>

              <Field label="Teléfono">
                <Input
                  value={form.tel ?? ''}
                  onChange={(e) => setForm(p => ({ ...p, tel: onlyDigits(e.target.value, 10) }))}
                  inputMode="tel"
                  placeholder="10 dígitos"
                />
                {errors.tel && <p className="text-xs text-red-600 mt-1">{errors.tel}</p>}
              </Field>

              <Field label="Celular">
                <Input
                  value={form.cel ?? ''}
                  onChange={(e) => setForm(p => ({ ...p, cel: onlyDigits(e.target.value, 10) }))}
                  inputMode="tel"
                  placeholder="10 dígitos"
                />
                {errors.cel && <p className="text-xs text-red-600 mt-1">{errors.cel}</p>}
              </Field>

              <Field label="Nombre comercial">
                <Input value={form.nombre_comercial ?? ''} onChange={(e) => setForm(p => ({ ...p, nombre_comercial: e.target.value }))} />
              </Field>

              <div className="md:col-span-2">
                <Field label="Giro comercial">
                  <select
                    className="border px-3 py-2 rounded w-full"
                    value={form.giro_comercial}
                    onChange={(e) => setForm(p => ({ ...p, giro_comercial: e.target.value }))}
                  >
                    <option value="">Selecciona un giro comercial</option>
                    {GIROS_COMERCIALES.map((giro, i) => (
                      <option key={i} value={giro}>{giro}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          </TabsContent>

          {/* Facturación */}
          <TabsContent value="facturacion" forceMount>
            <div className="rounded-xl border p-4 mt-4 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-base flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-orange-600" />
                    Configuración CFDI
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Define el tipo de persona y el régimen fiscal. Usa el selector para filtrar por tipo de persona.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Tipo de persona" hint="Esto filtra los regímenes válidos.">
                  <Select
                    value={form.tipo_persona}
                    onValueChange={(v) => {
                      setForm(p => ({ ...p, tipo_persona: v, regimen_fiscal: '' }));
                      setBuscarRegimen('');
                      cargarRegimenes({ all: true });
                    }}
                  >
                    <SelectTrigger className={triggerSolid}>
                      <SelectValue placeholder="Selecciona tipo de persona" />
                    </SelectTrigger>
                    <SelectContent className={contentSolid}>
                      <SelectItem className={itemSolid} value="FISICA">Física</SelectItem>
                      <SelectItem className={itemSolid} value="MORAL">Moral</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.tipo_persona && <p className="text-xs text-red-600 mt-1">{errors.tipo_persona}</p>}
                </Field>

                <Field
                  label="Régimen fiscal"
                  className="md:col-span-2"
                  hint={
                    form.regimen_fiscal
                      ? `Seleccionado: ${form.regimen_fiscal}`
                      : loadingRegimen
                        ? 'Cargando opciones…'
                        : regimenes.length
                          ? `Mostrando ${regimenes.length} resultado(s)`
                          : form.tipo_persona
                            ? 'No hay coincidencias con tu búsqueda'
                            : 'Selecciona antes el tipo de persona'
                  }
                >
                  <Select
                    value={form.regimen_fiscal}
                    onValueChange={(v) => setForm(p => ({ ...p, regimen_fiscal: v }))}
                    disabled={!form.tipo_persona || loadingRegimen}
                    open={openRegimen}
                    onOpenChange={(o) => {
                      setOpenRegimen(o);
                      if (o) cargarRegimenes({ all: true });
                    }}
                  >
                    <SelectTrigger className="w-full bg-white border shadow-sm rounded-md px-3 py-2 min-h-[3rem] data-[placeholder]:text-muted-foreground hover:bg-orange-50/30 focus:ring-2 focus:ring-orange-200">
                      <div className="flex items-start gap-2 min-w-0 w-full">
                        {loadingRegimen ? <Loader2 className="h-4 w-4 animate-spin mt-0.5 shrink-0" /> : null}
                        <span className="truncate leading-snug line-clamp-2">
                          {form.regimen_fiscal
                            ? (() => {
                              const sel = regimenes.find(r => r.clave === form.regimen_fiscal);
                              return sel ? `${sel.clave} — ${sel.descripcion}` : form.regimen_fiscal;
                            })()
                            : (loadingRegimen ? 'Cargando…' : 'Selecciona un régimen')}
                        </span>
                      </div>
                    </SelectTrigger>

                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      sideOffset={8}
                      className="z-50 bg-white border shadow-md rounded-md max-h-96 overflow-auto"
                      style={{ width: 'var(--radix-select-trigger-width)' }}
                    >
                      {regimenes.map((r) => (
                        <SelectItem
                          key={r.clave}
                          value={r.clave}
                          className="py-2.5 whitespace-normal text-left leading-snug focus:bg-orange-50"
                          title={`${r.clave} — ${r.descripcion}`}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium break-words">{r.clave} — {r.descripcion}</span>
                            <span className="text-xs text-muted-foreground mt-0.5">
                              {[r.aplica_fisica ? 'Física' : null, r.aplica_moral ? 'Moral' : null].filter(Boolean).join(' · ')}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                      {!regimenes.length && <div className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</div>}
                    </SelectContent>
                  </Select>
                  {errors.regimen_fiscal && <p className="text-xs text-red-600 mt-1">{errors.regimen_fiscal}</p>}
                </Field>

                <Field label="Razón social (CFDI)" hint="Debe coincidir con el SAT para timbrado.">
                  <Input
                    value={form.razon_social ?? ''}
                    onChange={(e) => setForm(p => ({ ...p, razon_social: e.target.value }))}
                  />
                  {errors.razon_social && <p className="text-xs text-red-600 mt-1">{errors.razon_social}</p>}
                </Field>

                <Field label="RFC (CFDI)" hint="Sin guiones, en mayúsculas.">
                  <Input
                    value={form.rfc ?? ''}
                    onChange={(e) => setForm(p => ({ ...p, rfc: toRFC(e.target.value) }))}
                    onBlur={(e) => setForm(p => ({ ...p, rfc: toRFC(e.target.value) }))}
                    autoCapitalize="characters"
                    placeholder="EJEMPLO000101ABC"
                  />
                  {errors.rfc && <p className="text-xs text-red-600 mt-1">{errors.rfc}</p>}
                </Field>

                <Field label="Correo (CFDI)" hint="Se usará para notificaciones y timbrado.">
                  <Input
                    type="email"
                    value={form.correo_notificacion ?? ''}
                    onChange={(e) => setForm(p => ({ ...p, correo_notificacion: e.target.value.replace(/\s/g, '') }))}
                    onBlur={(e) => setForm(p => ({ ...p, correo_notificacion: (e.target.value || '').trim().toLowerCase() }))}
                    placeholder="facturacion@tu-dominio.com"
                  />
                  {errors.correo_notificacion && <p className="text-xs text-red-600 mt-1">{errors.correo_notificacion}</p>}
                </Field>

                {/* Domicilio fiscal */}
                <div className="md:col-span-2 pt-2">
                  <div className="text-sm font-semibold mb-2">Domicilio fiscal</div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Dirección (CFDI)">
                      <Input value={form.direccion ?? ''} onChange={(e) => setForm(p => ({ ...p, direccion: e.target.value }))} />
                    </Field>
                    <Field label="C.P. (CFDI)">
                      <Input
                        value={form.cp ?? ''}
                        onChange={(e) => setForm(p => ({ ...p, cp: onlyDigits(e.target.value, 5) }))}
                        inputMode="numeric"
                        pattern="\d*"
                        placeholder="XXXXX"
                      />
                      {errors.cp && <p className="text-xs text-red-600 mt-1">{errors.cp}</p>}
                    </Field>
                    <Field label="Estado (CFDI)">
                      <Input value={form.estado ?? ''} onChange={(e) => setForm(p => ({ ...p, estado: e.target.value }))} />
                    </Field>
                    <Field label="Municipio (CFDI)">
                      <Input value={form.municipio ?? ''} onChange={(e) => setForm(p => ({ ...p, municipio: e.target.value }))} />
                    </Field>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>


          <TabsContent value="archivos" forceMount>
            <div className="rounded-xl border p-4 mt-4 space-y-4">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-orange-600" />
                <div className="font-semibold text-base">Archivos de facturación (CER) y (KEY)</div>
              </div>
              <p className="text-sm text-muted-foreground -mt-2">
                Sube tu certificado (.cer) y llave privada (.key), ingresa la contraseña y presiona <strong>Validar</strong>.
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Certificado (.cer)">
                  <Input
                    type="file"
                    accept=".cer,.CER"
                    onChange={(e) => onPickCsd(e.target.files?.[0])}
                    disabled={isBusy}
                  />
                  {cerFile && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Archivo: <span className="font-medium">{cerFile.name}</span> · {(cerFile.size / 1024).toFixed(1)} KB
                    </p>
                  )}
                </Field>

                <Field label="Llave privada (.key)">
                  <input
                    className="block w-full border rounded px-3 py-2 text-sm file:mr-3 file:py-1.5 file:px-3 file:border-0 file:bg-muted file:text-muted-foreground"
                    type="file"
                    accept=".key,application/octet-stream,application/x-pem-file,application/pkcs8,application/x-pkcs8"
                    onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                    onChange={(e) => onPickKey(e.currentTarget.files?.[0])}
                    disabled={isBusy}
                  />
                  {keyFile && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Archivo: <span className="font-medium">{keyFile.name}</span> · {(keyFile.size / 1024).toFixed(1)} KB
                    </p>
                  )}
                </Field>

                <Field label="Contraseña del CER/KEY" className="md:col-span-2">
                  <Input
                    type="password"
                    value={cerPass}
                    onChange={(e) => { setCerPass(e.target.value); resetFilesState(); }}
                    placeholder="••••••••"
                    disabled={isBusy}
                  />
                </Field>
              </div>

             
              {filesStatus !== 'idle' && (
                <div
                  className={`rounded-md border p-3 text-sm flex items-start gap-2 ${filesStatus === 'valid' ? 'border-green-200 bg-green-50' :
                    filesStatus === 'invalid' ? 'border-red-200 bg-red-50' :
                      'border-orange-200 bg-orange-50'
                    }`}
                >
                  {filesStatus === 'valid' ? (
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                  ) : filesStatus === 'invalid' ? (
                    <XCircle className="h-4 w-4 mt-0.5 text-red-600" />
                  ) : (
                    <Loader2 className="h-4 w-4 mt-0.5 animate-spin text-orange-600" />
                  )}
                  <div className="space-y-2 w-full">
                    {filesStatus === 'validating' && 'Validando archivos...'}
                    {filesStatus === 'invalid' && (filesError || 'Archivos inválidos.')}
                    {filesStatus === 'valid' && (
                      <>
                        <div>Validación completa.</div>

                        
                        {serverReport?.csdInfo?.isCsd === false && (
                          <div className="text-xs rounded-md border border-amber-200 bg-amber-50 text-amber-900 p-2">
                            ⚠️ El certificado cargado es una <b>FIEL (e.firma)</b>. <br />
                            No es válido para timbrar CFDI. Debes subir un <b>CSD</b>.
                          </div>
                        )}

                        {serverReport?.csdInfo && (
                          <ul className="text-xs leading-5">
                            <li><b>RFC:</b> {serverReport.csdInfo.rfc ?? '—'}</li>
                            <li><b>No. Certificado:</b> {serverReport.csdInfo.noCertificado ?? '—'}</li>
                            <li><b>Vigencia:</b> {serverReport.csdInfo.notBefore ?? '—'} — {serverReport.csdInfo.notAfter ?? '—'}</li>
                            <li><b>Contraseña correcta:</b> {serverReport.csdInfo.keyOpens ? 'Sí' : 'No'}</li>
                            <li><b>Par Modulos (cert-key):</b> {serverReport.csdInfo.modulusMatch ? 'Sí' : (serverReport.csdInfo.modulusMatch === false ? 'No' : '—')}</li>
                            <li><b>Tipo:</b> {serverReport.csdInfo.isCsd ? 'CSD' : (serverReport.csdInfo.isCsd === false ? 'FIEL (no válido para timbrar)' : '—')}</li>
                          </ul>
                        )}
                        {!serverReport?.ok && serverReport?.errors?.length ? (
                          <div className="text-xs text-red-700">
                            {serverReport.errors.map((e, i) => <div key={i}>• {e.message}</div>)}
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={validarEnServidor}
                  disabled={!canValidate}
                  className="inline-flex items-center gap-2"
                  title={!canValidate ? 'Adjunta .cer .key y contraseña' : 'Validar archivos'}
                >
                  {filesStatus === 'validating' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Validar
                </Button>

                <Button
                  onClick={guardarArchivos}
                  disabled={!canSaveFiles}
                  className="bg-orange-500 text-white hover:bg-orange-600 h-11 font-semibold disabled:opacity-60"
                  title={!canSaveFiles
                    ? (isFiel
                      ? 'No puedes guardar: el certificado es FIEL (e.firma). Sube un CSD válido.'
                      : 'Primero valida los archivos')
                    : 'Guardar archivos'}
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                  Guardar archivos
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => {
                    setCsdFile(null);
                    setKeyFile(null);
                    setCerPass('');
                    setBucket('');
                    setCerKeyS3('');
                    setKeyKeyS3('');
                    resetFilesState();
                  }}
                >
                  Limpiar
                </Button>
              </div>

            </div>
          </TabsContent>

          
        </Tabs>

        {(tab === 'generales' || tab === 'facturacion') && (
          <Button
            onClick={guardarSucursal}
            disabled={saving || !isValid}
            className="bg-orange-500 text-white hover:bg-orange-600 w-full h-11 font-semibold disabled:opacity-60"
            title={!isValid ? 'Corrige los campos marcados' : 'Guardar cambios'}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Guardar cambios
          </Button>
        )}
      </div>
    </div>
  );
}
