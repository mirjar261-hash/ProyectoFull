"use client";

import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIMES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/pdf",
];

async function uploadFileToS3(
  file: File,
  userId: number,
  token: string
): Promise<string | null> {
  try {
    if (!ALLOWED_MIMES.includes(file.type)) {
      toast.error("Formato de archivo no permitido");
      return null;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("El archivo excede 10 MB");
      return null;
    }

    const presignRes = await fetch(`${apiUrl}/uploadsRoutes/presigned-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId,
        contentType: file.type,
        fileName: file.name,
        fileSize: file.size,
      }),
    });

    if (!presignRes.ok) {
      const err = await presignRes.json().catch(() => ({}));
      toast.error(err?.mensaje || "No se pudo generar URL de carga");
      return null;
    }

    const { url, fields, key } = await presignRes.json();
    const s3Form = new FormData();
    Object.entries(fields || {}).forEach(([k, v]) =>
      s3Form.append(k, String(v))
    );
    if (!("Content-Type" in (fields || {}))) {
      s3Form.append("Content-Type", file.type);
    }
    s3Form.append("file", file);

    const s3Res = await fetch(url, { method: "POST", body: s3Form });
    if (!s3Res.ok) {
      const errTxt = await s3Res.text().catch(() => "");
      console.error("S3 upload error:", s3Res.status, errTxt);
      toast.error("Error al subir el archivo a S3");
      return null;
    }

    const confirmRes = await fetch(`${apiUrl}/uploadsRoutes/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, key }),
    });
    const confirmData = await confirmRes.json().catch(() => ({}));
    if (!confirmRes.ok) {
      toast.error(confirmData?.mensaje || "Error al confirmar la subida");
      return null;
    }

    return key as string;
  } catch (e) {
    console.error(e);
    toast.error("Error subiendo el archivo");
    return null;
  }
}

type Preview = { url: string; type: string; name?: string };

/* =============== FileInput embebido =============== */
type FileInputProps = {
  label: string;
  description?: string;
  accept?: string;
  multiple?: boolean;
  required?: boolean;
  maxFiles?: number;   // solo para mostrar contador/recorte
  exactFiles?: number; // para mostrar “n/2” y recortar tope
  onFilesChange?: (files: File[]) => void;
  existing?: Preview[];
  onRemoveExisting?: (index: number) => void;
};

function FileInput({
  label,
  description,
  accept = "image/*,application/pdf",
  multiple = false,
  required = false,
  maxFiles,
  exactFiles,
  onFilesChange,
  existing = [],
  onRemoveExisting,
}: FileInputProps) {
  const id = useId();
  const [files, setFiles] = useState<File[]>([]);

  function updateFileList(list: File[]) {
    setFiles((prev) => {
      let merged = multiple ? [...prev, ...list] : list;
      let limit: number | undefined;
      if (typeof exactFiles === "number") {
        merged = merged.slice(0, exactFiles);
        limit = exactFiles - existing.length;
      } else if (typeof maxFiles === "number") {
         limit = maxFiles - existing.length;
      }
      if (typeof limit === "number") {
        merged = limit > 0 ? merged.slice(0, limit) : [];
      }
      onFilesChange?.(merged);
      return merged;
    });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files ? Array.from(e.target.files) : [];
    updateFileList(list);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    const list = Array.from(e.dataTransfer.files || []);
    updateFileList(list);
  }

  function removeFile(index: number) {
    setFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      onFilesChange?.(updated);
      return updated;
    });
  }

  const countTotal = files.length + existing.length;
  const counter =
    typeof exactFiles === "number"
      ? `${countTotal}/${exactFiles}`
      : typeof maxFiles === "number"
      ? `${countTotal}/${maxFiles}`
      : `${countTotal}`;

  return (
    <div className="mb-5">
      <label
        htmlFor={id}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="block rounded-xl border border-dashed border-gray-300 p-4 hover:border-gray-400 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-gray-900">
              {label} {required && <span className="text-red-500">*</span>}
            </p>
            {description && (
              <p className="mt-1 text-sm text-gray-500">{description}</p>
            )}
            {existing.length > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                {existing.length === 1
                  ? "1 archivo actual"
                  : `${existing.length} archivos actuales`}
              </p>
            )}
            <p className="mt-2 text-xs text-gray-400">
              Arrastra y suelta archivos aquí o haz clic en “Elegir”.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Seleccionados: {counter}</span>
            <button
              type="button"
              onClick={() => document.getElementById(id)?.click()}
              className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
            >
              Elegir
            </button>
          </div>
        </div>

        <input
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          required={required && files.length === 0 && existing.length === 0}
          onChange={handleChange}
          className="hidden"
        />

        {/* Previews existentes con nombre */}
        {existing.length > 0 && (
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {existing.map((f, i) => (
              <li
                key={`ex-${i}`}
                className="relative flex items-center gap-3 rounded-lg border px-3 py-2"
              >
                {onRemoveExisting && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onRemoveExisting(i);
                    }}
                    className="absolute top-1 right-1 rounded-full p-1 text-gray-500 hover:bg-gray-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
                {f.type.startsWith("image/") ? (
                  <img
                    src={f.url}
                    alt={f.name || "previsualización"}
                    className="h-12 w-12 rounded object-cover"
                    onLoad={() => URL.revokeObjectURL(f.url)}
                  />
                ) : (
                  <div className="h-12 w-12 rounded bg-gray-100 grid place-content-center text-xs text-gray-500">
                    {f.type.includes("pdf") ? "PDF" : "FILE"}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm text-gray-800">
                    {f.name || "Archivo existente"}
                  </p>
                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-600 mt-1">
                    Actual
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Archivos nuevos (para reemplazar/agregar) */}
        {files.length > 0 && (
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {files.map((f, i) => {
              const isImage = f.type.startsWith("image/");
              const url = isImage ? URL.createObjectURL(f) : null;
              return (
                <li
                  key={i}
                  className="relative flex items-center gap-3 rounded-lg border px-3 py-2"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeFile(i);
                    }}
                    className="absolute top-1 right-1 rounded-full p-1 text-gray-500 hover:bg-gray-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  {isImage ? (
                    <img
                      src={url || ""}
                      alt={f.name}
                      className="h-12 w-12 rounded object-cover"
                      onLoad={() => url && URL.revokeObjectURL(url)}
                    />
                  ) : (
                    <div className="h-12 w-12 rounded bg-gray-100 grid place-content-center text-xs text-gray-500">
                      {f.type.includes("pdf") ? "PDF" : "FILE"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm text-gray-800">{f.name}</p>
                    <p className="text-xs text-gray-500">
                      {(f.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                    <p className="text-[11px] text-amber-600 mt-1">
                      {/* Si este input es de fotos múltiples, esto "agrega"; si es unitario, "reemplaza" */}
                      {multiple
                        ? "Al guardar, estas fotos se agregarán."
                        : "Al guardar, este archivo reemplazará al actual."}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </label>
    </div>
  );
}

function Stepper({ current }: { current: number }) {
  const steps = [
    { label: "Llenar datos" },
    { label: "Confirmar datos" },
    { label: "Estatus" },
    { label: "Editar" }, // Step 4
  ];
  return (
    <div className="mb-8 flex items-center justify-center text-sm">
      {steps.map((s, i) => {
        const status =
          current === i + 1
            ? "current"
            : current > i + 1
            ? "complete"
            : "upcoming";
        return (
          <div key={s.label} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                status === "current"
                  ? "border-blue-500 text-blue-600"
                  : status === "complete"
                  ? "border-blue-500 bg-blue-500 text-white"
                  : "border-gray-300 text-gray-400"
              }`}
            >
              {status === "complete" ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={`ml-2 ${
                status === "current" || status === "complete"
                  ? "text-blue-600"
                  : "text-gray-500"
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className="mx-4 h-px w-16 bg-gray-300" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* =============== Página del formulario =============== */
export default function FormPage() {
  const [step, setStep] = useState(1);
  const [terms, setTerms] = useState(false);
  const [form, setForm] = useState({
    correo: "",
    red: "",
    nombre: "",
    telefono: "",
    terminales: "",
  });

  const emptySelected = {
    ineFrente: [] as File[],
    ineReverso: [] as File[],
    comprobanteDomicilio: [] as File[],
    constanciaFiscal: [] as File[],
    fotosInterior: [] as File[],
    fotosExterior: [] as File[],
    estadoCuenta: [] as File[],
  };

  const [selectedFiles, setSelectedFiles] = useState(emptySelected);

  const emptyPreview = {
    ineFrente: [] as Preview[],
    ineReverso: [] as Preview[],
    comprobanteDomicilio: [] as Preview[],
    constanciaFiscal: [] as Preview[],
    fotosInterior: [] as Preview[],
    fotosExterior: [] as Preview[],
    estadoCuenta: [] as Preview[],
  };

  const [existingPreviews, setExistingPreviews] = useState(emptyPreview);
  const [solicitudId, setSolicitudId] = useState<number | null>(null);
  const [solicitudData, setSolicitudData] = useState<any | null>(null);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  const userId =
    typeof window !== "undefined"
      ? Number(localStorage.getItem("userId") || 0)
      : 0;
  const baseUrl = `${apiUrl}/solicitud-spin-negocios`;

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const res = await fetch(`${baseUrl}/activas`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const activa = Array.isArray(data)
          ? data[0]
          : (data && (data.solicitud || data));
        if (activa && activa.id) {
          setSolicitudId(activa.id);
          setSolicitudData(activa);
          setForm({
            correo: activa.correoElectronico || "",
            red: activa.linkRedSocial || "",
            nombre: activa.nombreCompleto || "",
            telefono: activa.telefono || "",
            terminales: String(activa.numeroTerminales || ""),
          });
          setStep(3);
        }
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [baseUrl, token]);

  const inputClass =
    "mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-gray-900";

  function handleStep1(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (solicitudId) {
      toast.info("Ya tienes una solicitud activa");
      setStep(3);
      return;
    }
    const formEl = e.currentTarget;
    if (!formEl.checkValidity()) {
      formEl.reportValidity();
      toast.error("Completa los campos requeridos");
      return;
    }
    setStep(2);
  }

  async function handleConfirm() {
    if (!terms) {
      toast.error("Debes aceptar los términos y condiciones");
      return;
    }
    if (!token) {
      toast.error("No autenticado");
      return;
    }

    const existing = {
      ineFrente: solicitudData?.ineFrente,
      ineReverso: solicitudData?.ineReverso,
      comprobanteDomicilio: solicitudData?.comprobanteDomicilio,
      constanciaFiscal: solicitudData?.constanciaFiscal,
      estadocuenta: solicitudData?.estadocuenta,
    } as Record<string, string | undefined>;
    const archivos = solicitudData?.archivos ? [...solicitudData.archivos] : [];

    const uploadSingle = async (arr: File[], field: string) => {
      if (arr.length > 0) {
        const key = await uploadFileToS3(arr[0], userId, token);
        if (key) existing[field] = key;
      }
    };

    await uploadSingle(selectedFiles.ineFrente, "ineFrente");
    await uploadSingle(selectedFiles.ineReverso, "ineReverso");
    await uploadSingle(
      selectedFiles.comprobanteDomicilio,
      "comprobanteDomicilio"
    );
    await uploadSingle(selectedFiles.constanciaFiscal, "constanciaFiscal");
    await uploadSingle(selectedFiles.estadoCuenta, "estadocuenta");

    for (const f of selectedFiles.fotosInterior) {
      const key = await uploadFileToS3(f, userId, token);
      if (key) archivos.push({ tipo: "FOTOS_INTERIOR", url: key });
    }
    for (const f of selectedFiles.fotosExterior) {
      const key = await uploadFileToS3(f, userId, token);
      if (key) archivos.push({ tipo: "FOTOS_EXTERIOR", url: key });
    }

    const payload = {
      ineFrente: existing.ineFrente,
      ineReverso: existing.ineReverso,
      comprobanteDomicilio: existing.comprobanteDomicilio,
      constanciaFiscal: existing.constanciaFiscal,
      estadocuenta: existing.estadocuenta,
      correoElectronico: form.correo,
      linkRedSocial: form.red,
      nombreCompleto: form.nombre,
      telefono: form.telefono,
      numeroTerminales: form.terminales,
      activo: 1,
      archivos,
    };

    try {
      if (!solicitudId) {
        const res = await fetch(baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(err?.mensaje || "Error al guardar");
          return;
        }
        const data = await res.json().catch(() => ({}));
        const id = data?.id;
        setSolicitudId(id);
        await fetch(`${baseUrl}/${id}/enviar-correo`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        const res = await fetch(`${baseUrl}/${solicitudId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(err?.mensaje || "Error al editar");
          return;
        }
      }
      toast.success("Datos enviados");
      setSolicitudData(payload);
      setStep(3);
    } catch (e) {
      console.error(e);
      toast.error("Error al enviar datos");
    }
  }

  async function fetchPreview(key: string): Promise<Preview | null> {
    try {
      const prefix = `users/${userId}/uploads/`;
      const cleanKey = key.startsWith(prefix) ? key.slice(prefix.length) : key;

      // derivar nombre de archivo visible
      const derivedName = decodeURIComponent(
        cleanKey.split("/").pop() || "Archivo"
      );

      const res = await fetch(
        `${apiUrl}/uploadsRoutes/user-file/${userId}/${encodeURIComponent(
          cleanKey
        )}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return null;
      const blob = await res.blob();
      return {
        url: URL.createObjectURL(blob),
        type: res.headers.get("Content-Type") || "",
        name: derivedName,
      };
    } catch {
      return null;
    }
  }

  async function preloadExistingFiles() {
    if (!solicitudData) return;
    const previews = { ...emptyPreview };
    const single: Record<string, string | undefined> = {
      ineFrente: solicitudData.ineFrente,
      ineReverso: solicitudData.ineReverso,
      comprobanteDomicilio: solicitudData.comprobanteDomicilio,
      constanciaFiscal: solicitudData.constanciaFiscal,
      estadoCuenta: solicitudData.estadocuenta,
    };
    for (const [field, key] of Object.entries(single)) {
      if (key) {
        const pv = await fetchPreview(key);
        if (pv) (previews as any)[field].push(pv);
      }
    }
    const archivos = solicitudData.archivos || [];
    for (const a of archivos) {
      const pv = await fetchPreview(a.url);
      if (!pv) continue;
      if (a.tipo === "FOTOS_INTERIOR") previews.fotosInterior.push(pv);
      if (a.tipo === "FOTOS_EXTERIOR") previews.fotosExterior.push(pv);
    }
    setExistingPreviews(previews);
  }

  // Guardar cambios en Step 4 (PUT siempre)
  async function handleSaveEdits() {
    if (!token || !solicitudId) {
      toast.error("No hay solicitud activa para editar");
      return;
    }

    const existing = {
      ineFrente: solicitudData?.ineFrente,
      ineReverso: solicitudData?.ineReverso,
      comprobanteDomicilio: solicitudData?.comprobanteDomicilio,
      constanciaFiscal: solicitudData?.constanciaFiscal,
      estadocuenta: solicitudData?.estadocuenta,
    } as Record<string, string | undefined>;

    const archivos: any[] = Array.isArray(solicitudData?.archivos)
      ? [...solicitudData.archivos]
      : [];

    const uploadSingle = async (arr: File[], field: string) => {
      if (arr.length > 0) {
        const key = await uploadFileToS3(arr[0], userId, token);
        if (key) existing[field] = key;
      }
    };

    try {
      await uploadSingle(selectedFiles.ineFrente, "ineFrente");
      await uploadSingle(selectedFiles.ineReverso, "ineReverso");
      await uploadSingle(
        selectedFiles.comprobanteDomicilio,
        "comprobanteDomicilio"
      );
      await uploadSingle(selectedFiles.constanciaFiscal, "constanciaFiscal");
      await uploadSingle(selectedFiles.estadoCuenta, "estadocuenta");

      for (const f of selectedFiles.fotosInterior) {
        const key = await uploadFileToS3(f, userId, token);
        if (key) archivos.push({ tipo: "FOTOS_INTERIOR", url: key });
      }
      for (const f of selectedFiles.fotosExterior) {
        const key = await uploadFileToS3(f, userId, token);
        if (key) archivos.push({ tipo: "FOTOS_EXTERIOR", url: key });
      }

      const payload = {
        ineFrente: existing.ineFrente,
        ineReverso: existing.ineReverso,
        comprobanteDomicilio: existing.comprobanteDomicilio,
        constanciaFiscal: existing.constanciaFiscal,
        estadocuenta: existing.estadocuenta,
        correoElectronico: form.correo,
        linkRedSocial: form.red,
        nombreCompleto: form.nombre,
        telefono: form.telefono,
        numeroTerminales: form.terminales,
        activo: 1,
        archivos,
      };

      const res = await fetch(`${baseUrl}/${solicitudId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.mensaje || "No se pudo guardar los cambios");
        return;
      }

      toast.success("Cambios guardados");
      setSolicitudData(payload);
      setSelectedFiles(emptySelected);
      setExistingPreviews(emptyPreview);
      await preloadExistingFiles();
      setStep(3);
    } catch (e) {
      console.error(e);
      toast.error("Error al guardar cambios");
    }
  }

  // Cancelar edición (no hace PUT)
  function handleCancelEdits() {
    setSelectedFiles(emptySelected);
    setExistingPreviews(emptyPreview);
    preloadExistingFiles();
    setStep(3);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Solicitud para terminales de Spin Negocios</h1>
        <p className="mt-2 text-sm text-gray-600">
          Rellena la información y sube los documentos solicitados.
        </p>
      </header>

      <Stepper current={step} />

      {step === 1 && (
        <form onSubmit={handleStep1} className="space-y-10">
          {/* Documentación */}
          <section>
            <h2 className="mb-4 text-lg font-medium">Documentación</h2>

            <FileInput
              label="INE Frente (vigente)"
              accept="image/*,application/pdf"
              required
              maxFiles={1}
              existing={existingPreviews.ineFrente}
              onFilesChange={(f) =>
                setSelectedFiles((p) => ({ ...p, ineFrente: f }))
              }
            />

            <FileInput
              label="INE Reverso"
              accept="image/*,application/pdf"
              required
              maxFiles={1}
              existing={existingPreviews.ineReverso}
              onFilesChange={(f) =>
                setSelectedFiles((p) => ({ ...p, ineReverso: f }))
              }
            />

            <FileInput
              label="Comprobante de domicilio (no mayor a 3 meses)"
              description="Recibo de luz, agua, teléfono, etc."
              accept="image/*,application/pdf"
              required
              maxFiles={1}
              existing={existingPreviews.comprobanteDomicilio}
              onFilesChange={(f) =>
                setSelectedFiles((p) => ({
                  ...p,
                  comprobanteDomicilio: f,
                }))
              }
            />

            <FileInput
              label="Constancia de situación fiscal (no mayor a 3 meses)"
              accept="application/pdf,image/*"
              required
              maxFiles={1}
              existing={existingPreviews.constanciaFiscal}
              onFilesChange={(f) =>
                setSelectedFiles((p) => ({ ...p, constanciaFiscal: f }))
              }
            />

            <FileInput
              label="2 fotos interior del negocio"
              description="Sube exactamente 2 fotos."
              accept="image/*"
              multiple
              exactFiles={2}
              existing={existingPreviews.fotosInterior}
              onFilesChange={(f) =>
                setSelectedFiles((p) => ({ ...p, fotosInterior: f }))
              }
            />

            <FileInput
              label="2 fotos exterior del negocio"
              description="Sube exactamente 2 fotos."
              accept="image/*"
              multiple
              exactFiles={2}
              existing={existingPreviews.fotosExterior}
              onFilesChange={(f) =>
                setSelectedFiles((p) => ({ ...p, fotosExterior: f }))
              }
            />

            <FileInput
              label="Estado de cuenta (no mayor a 3 meses)"
              accept="application/pdf,image/*"
              multiple
              maxFiles={1}
              existing={existingPreviews.estadoCuenta}
              onFilesChange={(f) =>
                setSelectedFiles((p) => ({ ...p, estadoCuenta: f }))
              }
            />
          </section>

          {/* Datos de contacto */}
          <section>
            <h2 className="mb-4 text-lg font-medium">Datos de contacto</h2>

            <div className="grid grid-cols-1 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Correo electrónico <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  className={inputClass}
                  placeholder="correo@dominio.com"
                  value={form.correo}
                  onChange={(e) => setForm({ ...form, correo: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Link red social
                </label>
                <input
                  type="url"
                  className={inputClass}
                  placeholder="https://instagram.com/tu_negocio"
                  value={form.red}
                  onChange={(e) => setForm({ ...form, red: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Nombre Apellido"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Teléfono <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  className={inputClass}
                  placeholder="10 dígitos"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Número de terminales <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  placeholder="Ej. 3"
                  value={form.terminales}
                  onChange={(e) => setForm({ ...form, terminales: e.target.value })}
                  required
                />
              </div>
            </div>
          </section>

          <div className="flex items-center justify-end gap-3">
            <button
              type="reset"
              className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Limpiar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Siguiente
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <h2 className="mb-4 text-lg font-medium">Confirmación de datos</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <strong>Correo:</strong> {form.correo}
            </li>
            <li>
              <strong>Red:</strong> {form.red || "N/A"}
            </li>
            <li>
              <strong>Nombre:</strong> {form.nombre}
            </li>
            <li>
              <strong>Teléfono:</strong> {form.telefono}
            </li>
            <li>
              <strong>Terminales:</strong> {form.terminales}
            </li>
          </ul>
          <label className="mt-6 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
            />
            <span>Acepto los términos y condiciones</span>
          </label>
          <div className="mt-6 flex justify-end gap-3">
            <button
              className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
              onClick={() => setStep(1)}
            >
              Atrás
            </button>
            <button
              className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-800"
              onClick={handleConfirm}
            >
              Confirmar
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-20 text-center">
          <p className="text-lg font-medium">
            Tu solicitud se encuentra en estatus de validación
          </p>
          <button
            className="mt-4 rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
            onClick={() => {
              setSelectedFiles(emptySelected);
              setExistingPreviews(emptyPreview);
              preloadExistingFiles();
              setStep(4); // pasa a editar
            }}
          >
            Modificar datos
          </button>
        </div>
      )}

      {/* STEP 4 – Editar */}
      {step === 4 && (
        <div className="space-y-10">
          <section>
            <h2 className="mb-4 text-lg font-medium">Editar documentación</h2>
            <p className="mb-3 text-sm text-gray-600">
              Visualiza tus archivos actuales (marcados como “Actual”) y carga nuevos para reemplazar o agregar fotos.
            </p>

            <FileInput
              label="INE Frente (vigente)"
              accept="image/*,application/pdf"
              maxFiles={1}
              existing={existingPreviews.ineFrente}
              onFilesChange={(f) =>
                setSelectedFiles((p) => ({ ...p, ineFrente: f }))
              }
            />

            <FileInput
              label="INE Reverso"
              accept="image/*,application/pdf"
              maxFiles={1}
              existing={existingPreviews.ineReverso}
              onFilesChange={(f) =>
                setSelectedFiles((p) => ({ ...p, ineReverso: f }))
              }
            />

            <FileInput
              label="Comprobante de domicilio"
              accept="image/*,application/pdf"
              maxFiles={1}
              existing={existingPreviews.comprobanteDomicilio}
              onFilesChange={(f) =>
                setSelectedFiles((p) => ({
                  ...p,
                  comprobanteDomicilio: f,
                }))
              }
            />

            <FileInput
              label="Constancia de situación fiscal"
              accept="application/pdf,image/*"
              maxFiles={1}
              existing={existingPreviews.constanciaFiscal}
              onFilesChange={(f) =>
                setSelectedFiles((p) => ({ ...p, constanciaFiscal: f }))
              }
            />

            <FileInput
              label="Fotos interior del negocio"
              description="Puedes agregar 0, 1 o 2 nuevas fotos."
              accept="image/*"
              multiple
              exactFiles={2}
              existing={existingPreviews.fotosInterior}
              onFilesChange={(f) =>
                setSelectedFiles((p) => ({ ...p, fotosInterior: f }))
              }
               onRemoveExisting={(idx) => {
                const url = existingPreviews.fotosInterior[idx].url;
                setExistingPreviews((p) => ({
                  ...p,
                  fotosInterior: p.fotosInterior.filter((_, i) => i !== idx),
                }));
                setSolicitudData((p) =>
                  p
                    ? {
                        ...p,
                        archivos: p.archivos?.filter(
                          (a: any) =>
                            !(a.tipo === "FOTOS_INTERIOR" && a.url === url)
                        ),
                      }
                    : p
                );
              }}
            />

            <FileInput
              label="Fotos exterior del negocio"
              description="Puedes agregar 0, 1 o 2 nuevas fotos."
              accept="image/*"
              multiple
              exactFiles={2}
              existing={existingPreviews.fotosExterior}
              onFilesChange={(f) =>
                setSelectedFiles((p) => ({ ...p, fotosExterior: f }))
              }
              onRemoveExisting={(idx) => {
                const url = existingPreviews.fotosExterior[idx].url;
                setExistingPreviews((p) => ({
                  ...p,
                  fotosExterior: p.fotosExterior.filter((_, i) => i !== idx),
                }));
                setSolicitudData((p) =>
                  p
                    ? {
                        ...p,
                        archivos: p.archivos?.filter(
                          (a: any) =>
                            !(a.tipo === "FOTOS_EXTERIOR" && a.url === url)
                        ),
                      }
                    : p
                );
              }}
            />

            <FileInput
              label="Estado de cuenta"
              accept="application/pdf,image/*"
              maxFiles={1}
              existing={existingPreviews.estadoCuenta}
              onFilesChange={(f) =>
                setSelectedFiles((p) => ({ ...p, estadoCuenta: f }))
              }
            />
          </section>

          <section>
            <h2 className="mb-4 text-lg font-medium">Editar datos de contacto</h2>
            <div className="grid grid-cols-1 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  className={inputClass}
                  value={form.correo}
                  onChange={(e) => setForm({ ...form, correo: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Link red social
                </label>
                <input
                  type="url"
                  className={inputClass}
                  value={form.red}
                  onChange={(e) => setForm({ ...form, red: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nombre completo
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Teléfono
                </label>
                <input
                  type="tel"
                  className={inputClass}
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Número de terminales
                </label>
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={form.terminales}
                  onChange={(e) => setForm({ ...form, terminales: e.target.value })}
                />
              </div>
            </div>
          </section>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleCancelEdits}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveEdits}
              className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Guardar
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
