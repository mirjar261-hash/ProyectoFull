'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Table, TableHeader, TableHead, TableRow, TableCell, TableBody } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getInternalAuthHeaders } from '@/lib/internalAuth';

type Nivel = 'BRONCE' | 'PLATA' | 'ORO';

interface Distribuidor {
  id: number;
  nombre_completo: string;
  telefono: string;
  domicilio: string | null;
  email: string | null;
  nivel: Nivel;
  descuento: number;
  nombre_comercial: string | null;
  activo: number; // 0 | 1
  creadoEn?: string;
  documentos?: {
    ine?: string | null;
    constanciaFiscal?: string | null;
    comprobanteDomicilio?: string | null;
    contrato?: string | null;
  } | null;
}

type DistribuidorForm = {
  nombre_completo: string;
  telefono: string;
  domicilio: string;
  email: string;
  nivel: Nivel;
  descuento: number;
  nombre_comercial: string;
  activo?: number; // para editar
};
type DistributorDocFormKey = 'ine' | 'constanciaFiscal' | 'comprobanteDomicilio';
const CONTRACT_TEMPLATE_PATHS = [
  '/contratos/CONTRATO DE DISTRUBUCION PERSONA FISICA_MACHOTE.docx',
  '/contratos/CONTRATO DE DISTRUBUCION PERSONA FISICA_MACHOTE.pdf',
] as const;

declare global {
  interface Window {
    JSZip?: any;
    __jsZipLoadingPromise?: Promise<any>;
    Tesseract?: any;
    __tesseractLoadingPromise?: Promise<any>;
    pdfjsLib?: any;
    __pdfjsLoadingPromise?: Promise<any>;
  }
}

const getJsZip = async () => {
  if (typeof window === 'undefined') {
    throw new Error('La generación de contratos sólo está disponible en el navegador.');
  }

  if (window.JSZip) {
    return window.JSZip;
  }

  if (!window.__jsZipLoadingPromise) {
    window.__jsZipLoadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.async = true;
      script.onload = () => {
        if (window.JSZip) {
          resolve(window.JSZip);
        } else {
          window.__jsZipLoadingPromise = undefined;
          script.remove();
          reject(new Error('No se pudo inicializar la librería para procesar Word.'));
        }
      };
      script.onerror = () => {
        window.__jsZipLoadingPromise = undefined;
        script.remove();
        reject(new Error('No se pudo cargar la librería necesaria para generar el contrato.'));
      };
      (document.head || document.body || document.documentElement).appendChild(script);
    });
  }

  return window.__jsZipLoadingPromise;
};

const getTesseract = async () => {
  if (typeof window === 'undefined') {
    throw new Error('La extracción del RFC desde imágenes sólo está disponible en el navegador.');
  }

  if (window.Tesseract) {
    return window.Tesseract;
  }

  if (!window.__tesseractLoadingPromise) {
    window.__tesseractLoadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      script.async = true;
      script.onload = () => {
        if (window.Tesseract) {
          resolve(window.Tesseract);
        } else {
          window.__tesseractLoadingPromise = undefined;
          script.remove();
          reject(new Error('No se pudo inicializar la librería para reconocer texto en imágenes.'));
        }
      };
      script.onerror = () => {
        window.__tesseractLoadingPromise = undefined;
        script.remove();
        reject(new Error('No se pudo cargar la librería necesaria para leer la constancia fiscal.'));
      };
      (document.head || document.body || document.documentElement).appendChild(script);
    });
  }

  return window.__tesseractLoadingPromise;
};

const getPdfjs = async () => {
  if (typeof window === 'undefined') {
    throw new Error('La extracción del RFC desde constancias en PDF sólo está disponible en el navegador.');
  }

  if (window.pdfjsLib) {
    return window.pdfjsLib;
  }

  if (!window.__pdfjsLoadingPromise) {
    window.__pdfjsLoadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.async = true;
      script.onload = () => {
        const pdfjsLib = window.pdfjsLib;
        if (pdfjsLib) {
          try {
            if (pdfjsLib.GlobalWorkerOptions) {
              pdfjsLib.GlobalWorkerOptions.workerSrc =
                pdfjsLib.GlobalWorkerOptions.workerSrc ||
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }
          } catch (error) {
            console.warn('No se pudo configurar el worker de pdf.js', error);
          }
          resolve(pdfjsLib);
        } else {
          window.__pdfjsLoadingPromise = undefined;
          script.remove();
          reject(new Error('No se pudo inicializar la librería para leer constancias en PDF.'));
        }
      };
      script.onerror = () => {
        window.__pdfjsLoadingPromise = undefined;
        script.remove();
        reject(new Error('No se pudo cargar la librería necesaria para procesar la constancia fiscal en PDF.'));
      };
      (document.head || document.body || document.documentElement).appendChild(script);
    });
  }

  return window.__pdfjsLoadingPromise;
};


export default function DistribuidoresPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== 'undefined' ? localStorage.getItem('internalToken') : null;
  const authHeaders = useMemo(() => getInternalAuthHeaders(token), [token]);

  const [items, setItems] = useState<Distribuidor[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [q, setQ] = useState('');
  const [nivel, setNivel] = useState<Nivel | 'TODOS'>('TODOS');
  const [soloActivos, setSoloActivos] = useState(true);

  // Modales
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [editing, setEditing] = useState<Distribuidor | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [docsTarget, setDocsTarget] = useState<Distribuidor | null>(null);

  // Form
  const initialForm: DistribuidorForm = {
    nombre_completo: '',
    telefono: '',
    domicilio: '',
    email: '',
    nivel: 'BRONCE',
    descuento: 0,
    nombre_comercial: '',
    activo: 1,
  };
  const [form, setForm] = useState<DistribuidorForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
 const [uploadingDocs, setUploadingDocs] = useState(false);
  const [docsError, setDocsError] = useState('');
  const [docsFiles, setDocsFiles] = useState<Record<DistributorDocFormKey, File | null>>({
    ine: null,
    constanciaFiscal: null,
    comprobanteDomicilio: null,
  });
  const [docLocations, setDocLocations] = useState<Record<DistributorDocFormKey, string | null>>({
    ine: null,
    constanciaFiscal: null,
    comprobanteDomicilio: null,
  });
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Ya no dependemos de sucursalId
  const canFetch = Boolean(apiUrl);

  const onlyDigits = (s: string) => (s || '').replace(/\D+/g, '');
  const clampPct = (n: any, min = 0, max = 100) => {
    const x = Number(n);
    if (!Number.isFinite(x)) return 0;
    return Math.min(max, Math.max(min, x));
  };
  const isValidEmail = (s: string) => !s || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

  const fetchDistribuidores = async () => {
    if (!canFetch) return;
    setLoading(true);
    try {
      // mismos endpoints; quitamos sucursalId del query
      const params: any = { activo: soloActivos ? 1 : 0 };
      if (nivel !== 'TODOS') params.nivel = nivel;
      if (q.trim()) params.q = q.trim();

      const res = await axios.get(`${apiUrl}/crovinternal`, {
        params,
        headers: authHeaders,
      });

      const data = Array.isArray(res.data?.items) ? res.data.items : [];
      setItems(data);
    } catch (err) {
      console.error('Error al cargar distribuidores', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistribuidores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl, token]);

  // Si quieres reactivar el debounce por filtros, descomenta:
  // useEffect(() => {
  //   if (!canFetch) return;
  //   const id = setTimeout(() => {
  //     fetchDistribuidores();
  //   }, 400);
  //   return () => clearTimeout(id);
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [q, nivel, soloActivos]);

  const clearFilters = () => {
    setQ('');
    setNivel('TODOS');
    setSoloActivos(true);
  };

  // Handlers de acciones
  const openCreate = () => {
    setForm(initialForm);
    setErrorMsg('');
    setShowCreate(true);
  };

  const openEdit = (row: Distribuidor) => {
    setEditing(row);
    setForm({
      nombre_completo: row.nombre_completo || '',
      telefono: row.telefono || '',
      domicilio: row.domicilio || '',
      email: row.email || '',
      nivel: row.nivel,
      descuento: Number(row.descuento ?? 0),
      nombre_comercial: row.nombre_comercial || '',
      activo: row.activo,
    });
    setErrorMsg('');
    setShowEdit(true);
  };

  const openDelete = (id: number) => {
    setDeletingId(id);
    setShowDelete(true);
  };

  const openDocs = (row: Distribuidor) => {
    setDocsTarget(row);
    setDocsFiles({ ine: null, constanciaFiscal: null, comprobanteDomicilio: null });
    setDocLocations({
      ine: row.documentos?.ine ?? null,
      constanciaFiscal: row.documentos?.constanciaFiscal ?? null,
      comprobanteDomicilio: row.documentos?.comprobanteDomicilio ?? null,
    });
    setDocsError('');
    setShowDocs(true);
  };

  const closeModals = () => {
    setShowCreate(false);
    setShowEdit(false);
    setShowDelete(false);
    setShowDocs(false);
    setEditing(null);
    setDeletingId(null);
    setDocsTarget(null);
    setErrorMsg('');
   setDocsError('');
    setDocLocations({ ine: null, constanciaFiscal: null, comprobanteDomicilio: null });
  };

  const closeDocsModal = () => {
    setShowDocs(false);
    setDocsTarget(null);
    setDocsError('');
    setDocsFiles({ ine: null, constanciaFiscal: null, comprobanteDomicilio: null });
    setDocLocations({ ine: null, constanciaFiscal: null, comprobanteDomicilio: null });
  };



  const validateForm = (f: DistribuidorForm) => {
    if (!f.nombre_completo.trim()) return 'El nombre completo es obligatorio';
    if (!f.telefono.trim()) return 'El teléfono es obligatorio';
    if (!isValidEmail(f.email.trim())) return 'Email inválido';
    return '';
  };

  const handleCreate = async () => {
    const f = {
      ...form,
      telefono: onlyDigits(form.telefono).slice(0, 10),
      descuento: clampPct(form.descuento),
    };
    const err = validateForm(f);
    if (err) {
      setErrorMsg(err);
      return;
    }
    setSaving(true);
    try {
      await axios.post(
        `${apiUrl}/crovinternal`,
        {
          // mismos endpoints; quitamos sucursalId del body
          nombre_completo: f.nombre_completo.trim(),
          telefono: f.telefono,
          domicilio: f.domicilio.trim() || null,
          email: f.email.trim() || null,
          nivel: f.nivel,
          descuento: f.descuento,
          nombre_comercial: f.nombre_comercial.trim() || null,
        },
        { headers: authHeaders }
      );
      await fetchDistribuidores();
      closeModals();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.response?.data?.message || 'Error al crear distribuidor');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    const f = {
      ...form,
      telefono: onlyDigits(form.telefono).slice(0, 10),
      descuento: clampPct(form.descuento),
    };
    const err = validateForm(f);
    if (err) {
      setErrorMsg(err);
      return;
    }
    setSaving(true);
    try {
      await axios.put(
        `${apiUrl}/crovinternal/${editing.id}`,
        {
          nombre_completo: f.nombre_completo.trim(),
          telefono: f.telefono,
          domicilio: f.domicilio.trim() || null,
          email: f.email.trim() || null,
          nivel: f.nivel,
          descuento: f.descuento,
          nombre_comercial: f.nombre_comercial.trim() || null,
          activo: Number(f.activo ?? 1),
        },
        { headers: authHeaders }
      );
      await fetchDistribuidores();
      closeModals();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.response?.data?.message || 'Error al actualizar distribuidor');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setSaving(true);
    try {
      await axios.delete(`${apiUrl}/crovinternal/${deletingId}`, {
        headers: authHeaders,
      });
      await fetchDistribuidores();
      closeModals();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.response?.data?.message || 'Error al eliminar distribuidor');
    } finally {
      setSaving(false);
    }
  };

type DistributorDocKey = 'INE' | 'CONSTANCIA_FISCAL' | 'COMPROBANTE_DOMICILIO';

  const DOC_TYPES: Record<DistributorDocFormKey, DistributorDocKey> = {
    ine: 'INE',
    constanciaFiscal: 'CONSTANCIA_FISCAL',
    comprobanteDomicilio: 'COMPROBANTE_DOMICILIO',
  } as const;

  const DOC_LABELS: Record<DistributorDocFormKey, string> = {
    ine: 'INE (PDF o imagen) *',
    constanciaFiscal: 'Constancia de situación fiscal (PDF o imagen) *',
    comprobanteDomicilio: 'Comprobante de domicilio (PDF o imagen) *',
  };

  const formatS3Location = (bucket: string | undefined, key: string) => {
    if (!key) return '';
    if (bucket) return `s3://${bucket}/${key}`;
    return key;
  };

  const copyLocation = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Ruta copiada al portapapeles.');
    } catch (error) {
      console.error('No se pudo copiar', error);
      toast.error('No se pudo copiar la ruta.');
    }
  };

  const MAX_DOC_BYTES = 10 * 1024 * 1024;
  const ACCEPTED_DOC_MIMES = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
  ];

  const uploadDistributorDocument = async (
    file: File,
    distribuidorId: number,
    docType: DistributorDocKey
  ) => {
    if (!apiUrl) throw new Error('No se ha configurado la URL de la API.');

    if (!ACCEPTED_DOC_MIMES.includes(file.type)) {
      throw new Error('Formato de archivo no permitido. Usa PDF o imagen.');
    }
    if (file.size > MAX_DOC_BYTES) {
      throw new Error('El archivo excede el límite de 10 MB.');
    }

    const headers =
      getInternalAuthHeaders(token, {
        'Content-Type': 'application/json',
      }) ?? { 'Content-Type': 'application/json' };

    const presignRes = await fetch(`${apiUrl}/uploadsRoutes/presigned-url`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        distribuidorId,
        documentType: docType,
        contentType: file.type || 'application/octet-stream',
        fileName: file.name,
        fileSize: file.size,
      }),
    });

    const presignData = await presignRes.json().catch(() => null);
    if (!presignRes.ok || !presignData) {
      const errMsg = presignData?.mensaje || presignData?.message || 'No se pudo preparar la subida.';
      throw new Error(errMsg);
    }

    const { url, fields, key, bucket } = presignData as {
      url: string;
      fields?: Record<string, string>;
      key: string;
      bucket?: string;
    };

    const formData = new FormData();
    Object.entries(fields || {}).forEach(([k, v]) => formData.append(k, v));
    if (!(fields && 'Content-Type' in fields)) {
      formData.append('Content-Type', file.type || 'application/octet-stream');
    }
    formData.append('file', file);

    const uploadRes = await fetch(url, { method: 'POST', body: formData });
    if (!uploadRes.ok) {
      const errTxt = await uploadRes.text().catch(() => '');
      throw new Error(`Error al subir a S3 (${uploadRes.status}): ${errTxt.slice(0, 200)}`);
    }

    const confirmRes = await fetch(`${apiUrl}/uploadsRoutes/confirm`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ distribuidorId, documentType: docType, key }),
    });
    const confirmData = await confirmRes.json().catch(() => null);
    if (!confirmRes.ok || !confirmData) {
      const errMsg = confirmData?.mensaje || confirmData?.message || 'No se pudo confirmar la subida.';
      throw new Error(errMsg);
    }

    const confirmedKey = typeof confirmData?.key === 'string' && confirmData.key.length > 0 ? confirmData.key : key;
    const confirmedBucket = typeof confirmData?.bucket === 'string' && confirmData.bucket.length > 0 ? confirmData.bucket : bucket;

    return { key: confirmedKey, bucket: confirmedBucket };
  };

  const persistDistributorDocuments = async (
    target: Distribuidor,
    updates: Partial<Record<DistributorDocFormKey, string>>
  ) => {
    if (!apiUrl) throw new Error('No se ha configurado la URL de la API.');

    const headers = authHeaders;

    const documentosPayload = {
      ine: updates.ine ?? target.documentos?.ine ?? null,
      constanciaFiscal: updates.constanciaFiscal ?? target.documentos?.constanciaFiscal ?? null,
      comprobanteDomicilio: updates.comprobanteDomicilio ?? target.documentos?.comprobanteDomicilio ?? null,
    };

    await axios.put(
      `${apiUrl}/crovinternal/${target.id}`,
      {
        nombre_completo: target.nombre_completo,
        telefono: target.telefono,
        domicilio: target.domicilio,
        email: target.email,
        nivel: target.nivel,
        descuento: target.descuento,
        nombre_comercial: target.nombre_comercial,
        activo: target.activo,
        documentos: documentosPayload,
      },
      { headers }
    );
  };

  const handleUploadDocuments = async () => {
    if (!docsTarget) return;
    const hasSelection = Object.values(docsFiles).some(Boolean);
    if (!hasSelection) {
      setDocsError('Selecciona al menos un documento.');
      return;
    }

    setDocsError('');
    setUploadingDocs(true);
    try {
      const distribuidorId = docsTarget.id;
      const newDocs: Partial<Record<DistributorDocFormKey, string>> = {};
      for (const [docKey, file] of Object.entries(docsFiles) as [DistributorDocFormKey, File | null][]) {
        if (!file) continue;
        const docType = DOC_TYPES[docKey];
        const { key, bucket } = await uploadDistributorDocument(file, distribuidorId, docType);
        const location = formatS3Location(bucket, key);
        setDocLocations((prev) => ({ ...prev, [docKey]: location }));
        newDocs[docKey] = location;
      }
      if (Object.keys(newDocs).length > 0) {
        await persistDistributorDocuments(docsTarget, newDocs);
      }
      toast.success('Documentos cargados correctamente.');
      await fetchDistribuidores();
      setDocsFiles({ ine: null, constanciaFiscal: null, comprobanteDomicilio: null });
      setDocsTarget((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          documentos: {
            ...prev.documentos,
            ine: newDocs.ine ?? prev.documentos?.ine ?? null,
            constanciaFiscal:
              newDocs.constanciaFiscal ?? prev.documentos?.constanciaFiscal ?? null,
            comprobanteDomicilio:
              newDocs.comprobanteDomicilio ?? prev.documentos?.comprobanteDomicilio ?? null,
          },
        };
      });
    } catch (error: any) {
      console.error(error);
      const msg = error?.message || 'Error al subir documentos.';
      setDocsError(msg);
      toast.error(msg);
    } finally {
      setUploadingDocs(false);
    }
  };

  const handleDownloadContract = async (row: Distribuidor) => {
    setDownloadingId(row.id);
    try {
         const fetchTemplate = async () => {
        for (const path of CONTRACT_TEMPLATE_PATHS) {
          try {
            const response = await fetch(path);
            if (!response.ok) {
              continue;
            }

            const arrayBuffer = await response.arrayBuffer();
            const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';

            return { arrayBuffer, contentType, path };
          } catch (err) {
            console.warn(`Error al intentar obtener el contrato en ${path}`, err);
          }
        }


        throw new Error('No se pudo obtener el contrato.');
        };

      const { arrayBuffer, contentType, path } = await fetchTemplate();
      const templateBytes = new Uint8Array(arrayBuffer);
      const pathLower = path.toLowerCase();
      const isDocxTemplate =
        pathLower.endsWith('.docx') || contentType.includes('wordprocessingml');

      const cleanValue = (value: unknown) => {
        if (typeof value !== 'string') {
          return '';
        }
        return value.replace(/\s+/g, ' ').trim();
      };

      const uppercaseOrFallback = (value: unknown, fallback: string) => {
        const cleaned = cleanValue(value);
        if (!cleaned) {
          return fallback;
        }
        try {
          return cleaned.toLocaleUpperCase('es-MX');
        } catch {
          return cleaned.toUpperCase();
        }
      };

      const sanitizeAddressPiece = (
        value: string,
        type: 'street' | 'colony' | 'city' | 'state'
      ) => {
        const normalized = value.replace(/\s+/g, ' ').trim();
        if (!normalized) return '';
        const basePatterns: Record<'street' | 'colony' | 'city' | 'state', RegExp[]> = {
          street: [/^(CALLE|CAL\.|C\/)/i],
          colony: [
            /^(COLONIA|COL\.|FRACCIONAMIENTO|FRACC\.|FRACC)/i,
            /^COL\s+/i,
          ],
          city: [/^(MUNICIPIO|MPIO\.|CD\.|CIUDAD)/i],
          state: [/^(ESTADO|EDO\.|E\.)/i],
        };
        const patterns = basePatterns[type] || [];
        const withoutPrefix = patterns.reduce(
          (acc, regex) => acc.replace(regex, '').trim(),
          normalized
        );
        return withoutPrefix;
      };

      const stripPostalCodeTokens = (text: string, code: string) => {
        if (!text) return '';
        let result = text.replace(/C\.?P\.?\s*/gi, '');
        if (code) {
          const postalRegex = new RegExp(`\\b${code}\\b`, 'gi');
          result = result.replace(postalRegex, '');
        }
        return result.replace(/\s{2,}/g, ' ').replace(/[\s,]+$/, '').trim();
      };

      const removeCityTokensFromState = (stateValue: string, cityValue: string) => {
        const normalizedState = stateValue.replace(/[,]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!normalizedState) return '';

        const normalizedCity = cityValue.replace(/[,]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!normalizedCity) {
          return normalizedState;
        }

        const cityRegex = new RegExp(`\\b${normalizedCity}\\b`, 'gi');
        const cleaned = normalizedState
          .replace(cityRegex, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim();

        if (!cleaned) {
          return normalizedState;
        }

        return cleaned;
      };

      const RFC_PATTERN = /\b[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}\b/;

      const extractRfcFromString = (text: string) => {
        if (!text) return '';
        const match = text.toUpperCase().match(RFC_PATTERN);
        return match?.[0] ?? '';
      };

      const encodeS3KeySegment = (segment: string) => encodeURIComponent(segment);

      const inferContentTypeFromLocation = (location: string) => {
        const lower = location.toLowerCase();
        if (lower.endsWith('.pdf')) {
          return 'application/pdf';
        }
        if (lower.endsWith('.png')) {
          return 'image/png';
        }
        if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
          return 'image/jpeg';
        }
        if (lower.endsWith('.webp')) {
          return 'image/webp';
        }
        return '';
      };

      const buildHttpUrlFromS3Location = (location: string) => {
        const match = /^s3:\/\/([^/]+)\/(.+)$/i.exec(location.trim());
        if (!match) {
          return location.startsWith('http') ? location : '';
        }
        const [, bucket, key] = match;
        const encodedKey = key
          .split('/')
          .filter(Boolean)
          .map((segment) => encodeS3KeySegment(segment))
          .join('/');
        return `https://${bucket}.s3.amazonaws.com/${encodedKey}`;
      };

      const fetchConstanciaBytes = async (location: string) => {
        const attempts: string[] = [];
        const directUrl = buildHttpUrlFromS3Location(location);
        if (directUrl) {
          attempts.push(directUrl);
        }

        if (apiUrl) {
          const authSuffix = `${row.id}/constancia-situacion-fiscal`;
          attempts.push(
            `${apiUrl}/uploadsRoutes/distributor-file/${authSuffix}`
          );
          attempts.push(
            `${apiUrl}/uploadsRoutes/distributor-file/${row.id}/${DOC_TYPES.constanciaFiscal}`
          );
        }

        const requestHeaders = authHeaders;

        for (const url of attempts) {
          try {
            const requestInit: RequestInit = requestHeaders ? { headers: requestHeaders } : {};
            const response = await fetch(url, requestInit);
            if (!response.ok) {
              continue;
            }
            const arrayBuffer = await response.arrayBuffer();
            const headerType = response.headers.get('content-type')?.toLowerCase() ?? '';
            const inferredType = headerType || inferContentTypeFromLocation(location);
            return { bytes: new Uint8Array(arrayBuffer), contentType: inferredType };
          } catch (error) {
            console.warn('No se pudo descargar la constancia fiscal desde', url, error);
          }
        }

        return null;
      };

      const extractRfcFromImageBytes = async (bytes: Uint8Array, mimeType: string) => {
        if (typeof window === 'undefined') {
          return '';
        }

        try {
          const Tesseract = await getTesseract();
          if (!Tesseract) {
            return '';
          }

          const blob = new Blob([bytes], { type: mimeType || 'image/jpeg' });
          const blobUrl = window.URL.createObjectURL(blob);

          try {
            const result = await Tesseract.recognize(blobUrl, 'eng');
            const text = result?.data?.text || '';
            const rfcFromOcr = extractRfcFromString(text);
            if (rfcFromOcr) {
              return rfcFromOcr;
            }

            const lines: string[] = Array.isArray(result?.data?.lines)
              ? result.data.lines.map((line: any) => line?.text || '')
              : [];
            for (const line of lines) {
              const lineRfc = extractRfcFromString(line);
              if (lineRfc) {
                return lineRfc;
              }
            }
          } finally {
            window.URL.revokeObjectURL(blobUrl);
          }
        } catch (error) {
          console.warn('No se pudo reconocer el RFC desde la constancia fiscal', error);
        }

        return '';
      };

      const extractRfcFromPdfBytes = async (bytes: Uint8Array) => {
        if (typeof window === 'undefined') {
          return '';
        }

        try {
          const pdfjsLib = await getPdfjs();
          if (!pdfjsLib) {
            return '';
          }

          const loadingTask = pdfjsLib.getDocument({ data: bytes });
          const pdfDocument = await loadingTask.promise;

          const maxPages = Math.min(pdfDocument.numPages || 0, 12);
          let aggregatedText = '';

          for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
            try {
              const page = await pdfDocument.getPage(pageNumber);
              const textContent = await page.getTextContent();
              const pageText = Array.isArray(textContent?.items)
                ? textContent.items
                    .map((item: any) => (typeof item?.str === 'string' ? item.str : ''))
                    .join(' ')
                : '';

              if (pageText) {
                const pageRfc = extractRfcFromString(pageText);
                if (pageRfc) {
                  return pageRfc;
                }
                aggregatedText += `\n${pageText}`;
              }
            } catch (error) {
              console.warn('No se pudo leer una página de la constancia fiscal en PDF', error);
            }
          }

          if (aggregatedText) {
            const combinedRfc = extractRfcFromString(aggregatedText);
            if (combinedRfc) {
              return combinedRfc;
            }
          }
        } catch (error) {
          console.warn('No se pudo procesar la constancia fiscal en PDF', error);
        }

        return '';
      };

      const tryDecodeBytesToText = (bytes: Uint8Array) => {
        const decoders: TextDecoder[] = [];
        try {
          decoders.push(new TextDecoder('utf-8', { fatal: false }));
        } catch (error) {
          console.warn('No se pudo inicializar el decodificador UTF-8', error);
        }
        try {
          decoders.push(new TextDecoder('latin1', { fatal: false }));
        } catch (error) {
          console.warn('No se pudo inicializar el decodificador Latin1', error);
        }

        for (const decoder of decoders) {
          try {
            const text = decoder.decode(bytes);
            if (text && text.trim()) {
              return text;
            }
          } catch (error) {
            console.warn('Error al decodificar bytes de constancia', error);
          }
        }

        return '';
      };

      const resolveRfcFromConstancia = async () => {
        const location = row.documentos?.constanciaFiscal;
        if (!location) {
          return '';
        }

        const rfcFromPath = extractRfcFromString(location);
        if (rfcFromPath) {
          return rfcFromPath;
        }

        const fetched = await fetchConstanciaBytes(location);
        if (!fetched) {
          return '';
        }

        const { bytes, contentType } = fetched;
        const normalizedContentType = contentType || inferContentTypeFromLocation(location);

        if (
          normalizedContentType.includes('pdf') ||
          normalizedContentType === '' ||
          normalizedContentType === 'application/octet-stream'
        ) {
          const pdfRfc = await extractRfcFromPdfBytes(bytes);
          if (pdfRfc) {
            return pdfRfc;
          }

          const decoded = tryDecodeBytesToText(bytes);
          const fallbackPdfRfc = extractRfcFromString(decoded);
          if (fallbackPdfRfc) {
            return fallbackPdfRfc;
          }
        }

        if (normalizedContentType.startsWith('text/')) {
          const decoded = tryDecodeBytesToText(bytes);
          const textRfc = extractRfcFromString(decoded);
          if (textRfc) {
            return textRfc;
          }
        }

        if (normalizedContentType.startsWith('image/')) {
          const imageRfc = await extractRfcFromImageBytes(bytes, normalizedContentType);
          if (imageRfc) {
            return imageRfc;
          }
        }

        return '';
      };

      const parseAddressComponents = (value: unknown) => {
        const cleaned = cleanValue(value);
        if (!cleaned) {
          return { street: '', colony: '', postalCode: '', city: '', state: '' };
        }

        const normalized = cleaned.replace(/\s+/g, ' ').trim();
        const parts = normalized.split(/,\s*/).map((part) => part.trim());

        let street = '';
        let colony = '';
        let city = '';
        let state = '';

        if (parts.length > 0) {
          street = parts.shift() || '';
        }

        if (parts.length > 0) {
          const colonyIndex = parts.findIndex((part) => /COL(ONIA)?|FRACC/i.test(part));
          if (colonyIndex >= 0) {
            colony = parts.splice(colonyIndex, 1)[0];
          }
        }

        if (!colony && parts.length > 0) {
          colony = parts.shift() || '';
        }

        const postalCodeMatch = normalized.match(/\b\d{5}\b/);
        let postalCode = postalCodeMatch ? postalCodeMatch[0] : '';

        if (!postalCode) {
          const postalIndex = parts.findIndex((part) => /\d{5}/.test(part));
          if (postalIndex >= 0) {
            const cpPart = parts.splice(postalIndex, 1)[0];
            postalCode = cpPart.match(/\d{5}/)?.[0] || '';
          }
        }

        if (!postalCode) {
          const cpWithPrefix = normalized.match(/C\.?P\.?\s*(\d{5})/i);
          if (cpWithPrefix) {
            postalCode = cpWithPrefix[1];
          }
        }

        if (parts.length > 0) {
          city = parts.shift() || '';
        }

        if (parts.length > 0) {
          state = parts.shift() || '';
        }

        city = stripPostalCodeTokens(city, postalCode);
        state = stripPostalCodeTokens(state, postalCode);

        return {
          street: sanitizeAddressPiece(street, 'street'),
          colony: sanitizeAddressPiece(colony, 'colony'),
          postalCode,
          city: sanitizeAddressPiece(city, 'city'),
          state: sanitizeAddressPiece(state, 'state'),
        };
      };

      const sanitizeForPdf = (value: string) =>
        value.replace(/[()\\]/g, ' ').replace(/\s+/g, ' ').trim();

      const ensureValue = (value: string, fallback: string) => {
        const normalized = sanitizeForPdf(value);
        if (normalized) {
          return normalized;
        }
        return sanitizeForPdf(fallback) || fallback;
      };

      const { street, colony, postalCode, city, state } = parseAddressComponents(row.domicilio);

      const distributorName = ensureValue(
        uppercaseOrFallback(row.nombre_completo, 'SIN NOMBRE REGISTRADO'),
        'SIN NOMBRE REGISTRADO'
      );
      const distributorCommercialName = ensureValue(
        uppercaseOrFallback(row.nombre_comercial || row.nombre_completo, distributorName),
        distributorName
      );
      const rfcFromConstancia = await resolveRfcFromConstancia();
      const rawRfc = rfcFromConstancia || (row as unknown as { rfc?: string })?.rfc;
      const distributorRfc = ensureValue(
        uppercaseOrFallback(rawRfc, 'SIN RFC REGISTRADO'),
        'SIN RFC REGISTRADO'
      );

      const distributorStreet = ensureValue(
        uppercaseOrFallback(street, 'SIN CALLE REGISTRADA'),
        'SIN CALLE REGISTRADA'
      );
      const distributorColony = ensureValue(
        uppercaseOrFallback(colony, 'SIN COLONIA REGISTRADA'),
        'SIN COLONIA REGISTRADA'
      );
      const distributorPostalCode = ensureValue(
        uppercaseOrFallback(postalCode, 'S/N'),
        'S/N'
      );
      const distributorCity = ensureValue(
        uppercaseOrFallback(city || 'Tepic', 'TEPIC'),
        'TEPIC'
      );
      const stateValue = uppercaseOrFallback(state || 'Nayarit', 'NAYARIT');
      const stateWithoutCity = removeCityTokensFromState(stateValue, distributorCity);
      const distributorStateName = ensureValue(stateWithoutCity || stateValue, 'NAYARIT');
      const locationSegments = [distributorCity];
      if (distributorStateName && distributorStateName !== distributorCity) {
        locationSegments.push(distributorStateName);
      }
       const distributorLocation = ensureValue(
        locationSegments.join(', '),
        'TEPIC, NAYARIT'
      );

      const monthNames = [
        'ENERO',
        'FEBRERO',
        'MARZO',
        'ABRIL',
        'MAYO',
        'JUNIO',
        'JULIO',
        'AGOSTO',
        'SEPTIEMBRE',
        'OCTUBRE',
        'NOVIEMBRE',
        'DICIEMBRE',
      ];
      const now = new Date();
      const dayText = now.getDate().toString().padStart(2, '0');
      const monthText = monthNames[now.getMonth()] || '';
      const yearText = now.getFullYear().toString();

      const adjustValueToLength = (value: string, length: number) => {
        let text = value;
        if (text.length > length) {
          text = text.slice(0, length);
        }
        if (text.length < length) {
          text = text.padEnd(length, ' ');
        }
        return text;
      };

      const decodePdfBytes = (bytes: Uint8Array) => {
        let result = '';
        for (let i = 0; i < bytes.length; i += 1) {
          result += String.fromCharCode(bytes[i]);
        }
        return result;
      };

      const encodePdfString = (content: string) => {
        const output = new Uint8Array(content.length);
        for (let i = 0; i < content.length; i += 1) {
          output[i] = content.charCodeAt(i) & 0xff;
        }
        return output;
      };

      const fillTemplatePlaceholders = (
        bytes: Uint8Array,
        replacements: Record<string, string>
      ) => {
        let content = decodePdfBytes(bytes);
        const missing: string[] = [];

        Object.entries(replacements).forEach(([placeholder, formattedValue]) => {
          if (!content.includes(placeholder)) {
            missing.push(placeholder);
            return;
          }
          content = content.split(placeholder).join(formattedValue);
        });

        if (missing.length > 0) {
          console.warn(
            'No se encontraron los siguientes marcadores en el contrato:',
            missing
          );
        }

        return encodePdfString(content);
      };

      const placeholderValues: Record<string, string> = {
        '{{NOMBRE_DISTRIBUIDOR}}': distributorName,
        '{{NOMBRE_COMERCIAL}}': distributorCommercialName,
        '{{RFC}}': distributorRfc,
        '{{DOMICILIO_CALLE}}': distributorStreet,
        '{{DOMICILIO_COLONIA}}': distributorColony,
        '{{DOMICILIO_CP}}': distributorPostalCode,
        '{{DOMICILIO_CIUDAD}}': distributorCity,
        '{{DOMICILIO_ESTADO}}': distributorLocation,
        '{{DIA}}': dayText,
        '{{MES}}': monthText,
      };

      const yearPlaceholders = ['{{AÑO}}', '{{AÑIO}}', '{{ANIO}}'];
      yearPlaceholders.forEach((placeholder) => {
        placeholderValues[placeholder] = yearText;
        placeholderValues[`${placeholder} `] = `${yearText} `;
      });

      const pdfPlaceholderMap: Record<string, string> = Object.fromEntries(
        Object.entries(placeholderValues).map(([key, value]) => [
          key,
          adjustValueToLength(value, key.length),
        ])
      );

      const filledPdfTemplate = (bytes: Uint8Array) =>
        fillTemplatePlaceholders(bytes, pdfPlaceholderMap);

      const fillDocxTemplate = async (
        bytes: Uint8Array,
        replacements: Record<string, string>
      ) => {
        const JSZip = await getJsZip();
        const zip = await JSZip.loadAsync(bytes);
        const documentFile = zip.file('word/document.xml');
        if (!documentFile) {
          throw new Error('El contrato de Word no contiene el documento principal.');
        }

        let content = await documentFile.async('string');
        const missing: string[] = [];

        Object.entries(replacements).forEach(([placeholder, formattedValue]) => {
          if (!content.includes(placeholder)) {
            missing.push(placeholder);
            return;
          }
          content = content.split(placeholder).join(formattedValue);
        });

        if (missing.length > 0) {
          console.warn(
            'No se encontraron los siguientes marcadores en el contrato de Word:',
            missing
          );
        }

        zip.file('word/document.xml', content);
        return zip.generateAsync({ type: 'uint8array' });
      };

      const createDownload = (
        bytes: Uint8Array,
        mimeType: string,
        extension: 'pdf' | 'docx'
      ) => {
        const blob = new Blob([bytes], { type: mimeType });
        const safeName = row.nombre_completo?.replace(/[^\w\d_-]+/g, '_') || `${row.id}`;
        const derivedName = `Contrato_${safeName}.${extension}`;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = derivedName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      };

      if (isDocxTemplate) {
        const filledDocx = await fillDocxTemplate(templateBytes, placeholderValues);
        createDownload(
          filledDocx,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'docx'
        );
      } else {
        const filledPdfBytes = filledPdfTemplate(templateBytes);
        createDownload(filledPdfBytes, 'application/pdf', 'pdf');
      }

      toast.success('Contrato descargado con los datos del distribuidor.');
    } catch (error: any) {
      console.error(error);
      const message = error?.message || 'No se pudo descargar el contrato.';
      toast.error(message);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-orange-600">Distribuidores</h1>

        {/* Controles */}
        <div className="w-full sm:w-auto rounded-lg border bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            {/* Switch nativo (checkbox estilizado) */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={soloActivos}
                onChange={(e) => setSoloActivos(e.target.checked)}
                aria-label="Mostrar sólo activos"
              />
              <span className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 transition-colors peer-checked:bg-green-500">
                <span className="absolute left-1 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
              </span>
              <span className="text-sm text-muted-foreground">Activos</span>
            </label>

            {/* Select nativo */}
            <div className="flex items-center gap-2">
              <label htmlFor="nivel" className="text-sm text-muted-foreground">
                Nivel
              </label>
              <select
                id="nivel"
                value={nivel}
                onChange={(e) => setNivel(e.target.value as Nivel | 'TODOS')}
                className="h-10 w-[160px] rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="TODOS">Todos</option>
                <option value="BRONCE">BRONCE</option>
                <option value="PLATA">PLATA</option>
                <option value="ORO">ORO</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              {/* <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchDistribuidores()}
                placeholder="Buscar por nombre, comercial o email..."
                className="w-[260px]"
              /> */}
              <Button
                onClick={fetchDistribuidores}
                disabled={loading || !canFetch}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loading ? 'Cargando...' : 'Aplicar'}
              </Button>
              <Button
                variant="outline"
                onClick={clearFilters}
                disabled={loading}
                className="border-orange-200 hover:bg-orange-50"
              >
                Limpiar
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={openCreate}
                disabled={!canFetch}
              >
                Agregar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-auto rounded-lg border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-orange-100">
              <TableHead className="whitespace-nowrap">Nombre</TableHead>
              <TableHead className="whitespace-nowrap">Comercial</TableHead>
              <TableHead className="whitespace-nowrap">Teléfono</TableHead>
              <TableHead className="whitespace-nowrap">Email</TableHead>
              <TableHead className="whitespace-nowrap">Nivel</TableHead>
              <TableHead className="whitespace-nowrap">Desc. %</TableHead>
              <TableHead className="whitespace-nowrap">Estado</TableHead>
              <TableHead className="whitespace-nowrap text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {items.map((d) => (
              <TableRow key={d.id} className="border-t odd:bg-gray-50">
                <TableCell className="max-w-[240px] truncate">{d.nombre_completo}</TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {d.nombre_comercial ?? <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {d.telefono || <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="max-w-[220px] truncate">
                  {d.email ?? <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="whitespace-nowrap">{d.nivel}</TableCell>
                <TableCell className="whitespace-nowrap">{Number(d.descuento ?? 0)}%</TableCell>
                <TableCell className="whitespace-nowrap">
                  {d.activo === 1 ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      Inactivo
                    </span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" className="h-8 px-3" onClick={() => openEdit(d)}>
                      Editar
                    </Button>
                     <Button
                      variant="outline"
                      className="h-8 px-3"
                      onClick={() => openDocs(d)}
                    >
                      Documentos
                    </Button>
                    <Button
                      variant="outline"
                      className="h-8 px-3"
                      disabled={downloadingId === d.id}
                      onClick={() => handleDownloadContract(d)}
                    >
                      {downloadingId === d.id ? 'Descargando…' : 'Contrato'}
                    </Button>
                    <Button
                      variant="destructive"
                      className="h-8 px-3 bg-red-600 hover:bg-red-700"
                      onClick={() => openDelete(d.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center p-6">
                  {loading ? 'Cargando distribuidores…' : 'Sin distribuidores'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {!canFetch && (
        <p className="text-sm text-red-600">
          Falta <code>NEXT_PUBLIC_API_URL</code>.{' '}
          {token ? null : <>Y no encuentro <code>internalToken</code> en <code>localStorage</code>.</>}
        </p>
      )}

      {/* ---------- Modal Agregar / Editar ---------- */}
      {(showCreate || showEdit) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModals} />
          <div className="relative z-10 w-full max-w-2xl rounded-lg bg-white p-5 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">
              {showCreate ? 'Agregar distribuidor' : 'Editar distribuidor'}
            </h3>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm">Nombre completo *</label>
                <Input
                  value={form.nombre_completo}
                  onChange={(e) => setForm((s) => ({ ...s, nombre_completo: e.target.value }))}
                  placeholder="Nombre completo"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm">Teléfono *</label>
                <Input
                  value={form.telefono}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, telefono: onlyDigits(e.target.value).slice(0, 10) }))
                  }
                  placeholder="10 dígitos"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm">Email</label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm">Domicilio</label>
                <Input
                  value={form.domicilio}
                  onChange={(e) => setForm((s) => ({ ...s, domicilio: e.target.value }))}
                  placeholder="Calle, No., Colonia…"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm">Nombre comercial</label>
                <Input
                  value={form.nombre_comercial}
                  onChange={(e) => setForm((s) => ({ ...s, nombre_comercial: e.target.value }))}
                  placeholder="Ej. Miscelánea Juan"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm">Nivel</label>
                <select
                  value={form.nivel}
                  onChange={(e) => setForm((s) => ({ ...s, nivel: e.target.value as Nivel }))}
                  className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="BRONCE">BRONCE</option>
                  <option value="PLATA">PLATA</option>
                  <option value="ORO">ORO</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm">Descuento %</label>
                <Input
                  type="number"
                  value={form.descuento}
                  onChange={(e) => setForm((s) => ({ ...s, descuento: clampPct(e.target.value) }))}
                  placeholder="0 - 100"
                />
              </div>

              {showEdit && (
                <label className="mt-6 flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={(form.activo ?? 1) === 1}
                    onChange={(e) => setForm((s) => ({ ...s, activo: e.target.checked ? 1 : 0 }))}
                  />
                  <span className="text-sm">Activo</span>
                </label>
              )}
            </div>

            {errorMsg && <p className="mt-3 text-sm text-red-600">{errorMsg}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={closeModals}>
                Cancelar
              </Button>
              {showCreate ? (
                <Button onClick={handleCreate} disabled={saving} className="bg-green-600 hover:bg-green-700">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
              ) : (
                <Button onClick={handleUpdate} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {saving ? 'Actualizando...' : 'Actualizar'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

       {/* ---------- Modal Documentos ---------- */}
      {showDocs && docsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeDocsModal} />
          <div className="relative z-10 w-full max-w-xl rounded-lg bg-white p-5 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">
              Documentos de {docsTarget.nombre_completo}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">{DOC_LABELS.ine}</label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) =>
                    setDocsFiles((prev) => ({
                      ...prev,
                      ine: e.target.files?.[0] ?? null,
                    }))
                  }
                  className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {docsFiles.ine && (
                  <p className="mt-1 text-xs text-muted-foreground">{docsFiles.ine.name}</p>
                )}
                {docLocations.ine && (
                  <div className="mt-2 space-y-1 rounded-md bg-orange-50 p-2 text-xs text-orange-800">
                    <div className="flex items-center justify-between gap-2">
                      <span className="break-all font-mono">{docLocations.ine}</span>
                      <Button
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => copyLocation(docLocations.ine!)}
                      >
                        Copiar
                      </Button>
                    </div>
                    <p className="text-[10px] uppercase tracking-wide text-orange-700">Ruta S3</p>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">{DOC_LABELS.constanciaFiscal}</label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) =>
                    setDocsFiles((prev) => ({
                      ...prev,
                      constanciaFiscal: e.target.files?.[0] ?? null,
                    }))
                  }
                  className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {docsFiles.constanciaFiscal && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {docsFiles.constanciaFiscal.name}
                  </p>
                )}
                {docLocations.constanciaFiscal && (
                  <div className="mt-2 space-y-1 rounded-md bg-orange-50 p-2 text-xs text-orange-800">
                    <div className="flex items-center justify-between gap-2">
                      <span className="break-all font-mono">{docLocations.constanciaFiscal}</span>
                      <Button
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => copyLocation(docLocations.constanciaFiscal!)}
                      >
                        Copiar
                      </Button>
                    </div>
                    <p className="text-[10px] uppercase tracking-wide text-orange-700">Ruta S3</p>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">{DOC_LABELS.comprobanteDomicilio}</label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) =>
                    setDocsFiles((prev) => ({
                      ...prev,
                      comprobanteDomicilio: e.target.files?.[0] ?? null,
                    }))
                  }
                  className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {docsFiles.comprobanteDomicilio && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {docsFiles.comprobanteDomicilio.name}
                  </p>
                )}
                {docLocations.comprobanteDomicilio && (
                  <div className="mt-2 space-y-1 rounded-md bg-orange-50 p-2 text-xs text-orange-800">
                    <div className="flex items-center justify-between gap-2">
                      <span className="break-all font-mono">{docLocations.comprobanteDomicilio}</span>
                      <Button
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => copyLocation(docLocations.comprobanteDomicilio!)}
                      >
                        Copiar
                      </Button>
                    </div>
                    <p className="text-[10px] uppercase tracking-wide text-orange-700">Ruta S3</p>
                  </div>
                )}
              </div>
            </div>

            {docsError && <p className="mt-3 text-sm text-red-600">{docsError}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={closeDocsModal} disabled={uploadingDocs}>
                Cancelar
              </Button>
              <Button
                onClick={handleUploadDocuments}
                disabled={uploadingDocs}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {uploadingDocs ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {uploadingDocs ? 'Subiendo...' : 'Subir documentos'}
              </Button>
            </div>
          </div>
        </div>
      )}


      {/* ---------- Modal Confirmar Eliminación ---------- */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModals} />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold">Eliminar distribuidor</h3>
            <p className="text-sm text-muted-foreground">
              ¿Seguro que deseas eliminar este distribuidor? <p> (Se desactivará el distribuidor) </p>
            </p>
            {errorMsg && <p className="mt-3 text-sm text-red-600">{errorMsg}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={closeModals}>Cancelar</Button>
              <Button
                onClick={handleDelete}
                disabled={saving}
                className="bg-red-600 hover:bg-red-700"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {saving ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
