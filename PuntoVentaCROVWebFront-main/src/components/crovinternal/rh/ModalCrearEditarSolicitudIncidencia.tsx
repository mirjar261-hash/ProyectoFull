"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight } from "lucide-react"; 
import { useState, useEffect, useMemo } from "react";
import axios, { AxiosError } from "axios";
import { getInternalAuthHeaders } from "@/lib/internalAuth";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";


export type SolicitudToEdit = {
  id: number;
  descripcion: string;
  raw_fecha_inicio: string; 
  raw_fecha_fin: string;
  raw_id_tipos_incidencia: number;
};

type TiposIncidencia = {
  id: number; 
  clave: string;
  nombre: string;
};

type CrearSolicitudIncidenciaForm = {
  id_tipos_incidencia: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  id_empleados_crov: string | null;
};

type Props = {
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  fetchSolicitudes: () => void;
  dataToEdit: SolicitudToEdit | null; 
};

export default function ModalCrearEditarSolicitudIncidencia({
  open,
  onOpenChange,
  fetchSolicitudes,
  dataToEdit,
}: Props) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("internalToken") : null;
  const authHeaders = useMemo(() => getInternalAuthHeaders(token), [token]);

  const [fetchTiposIncidenciaLoading, setFetchTiposIncidenciaLoading] = useState(false);
  const [listaTiposIncidencia, setListaTiposIncidencia] = useState<TiposIncidencia[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const DEFAULT_FORM: CrearSolicitudIncidenciaForm = {
    id_tipos_incidencia: "",
    descripcion: "",
    fecha_inicio: "",
    fecha_fin: "",
    id_empleados_crov: localStorage.getItem("internalUserId"),
  };

  const [form, setForm] = useState<CrearSolicitudIncidenciaForm>(DEFAULT_FORM);

  useEffect(() => {
    if (open) {
      if (dataToEdit) {
        setForm({
          id_tipos_incidencia: dataToEdit.raw_id_tipos_incidencia.toString(),
          descripcion: dataToEdit.descripcion,
          fecha_inicio: dataToEdit.raw_fecha_inicio.split("T")[0],
          fecha_fin: dataToEdit.raw_fecha_fin.split("T")[0],
          id_empleados_crov: localStorage.getItem("internalUserId"),
        });
      } else {
        setForm(DEFAULT_FORM);
      }
      setErrors({});
    }
  }, [open, dataToEdit]);

  function updateForm<K extends keyof CrearSolicitudIncidenciaForm>(
    key: K,
    value: CrearSolicitudIncidenciaForm[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);

      if (dataToEdit) {
        await axios.put(
          `${apiUrl}/crovinternal/solicitudes-incidencia/${dataToEdit.id}`,
          form, 
          { headers: authHeaders }
        );
        toast.success("Solicitud actualizada correctamente");
      } else {
        await axios.post(
          `${apiUrl}/crovinternal/solicitudes-incidencia`,
          form,
          { headers: authHeaders }
        );
        toast.success("Solicitud creada correctamente");
      }

      fetchSolicitudes(); 
      onOpenChange(false); 

    } catch (error) {
      console.error("Error:", error);
      const axiosError = error as AxiosError<{
        message?: string;
        detalle?: string;
        errors?: Record<string, string>;
      }>;
      
      const status = axiosError.response?.status;
      const data = axiosError.response?.data;
      const message = data?.message || "Ocurrió un error al procesar la solicitud.";

      if (data?.errors) {
        setErrors(data.errors);
        toast.error("Corrige los campos marcados en rojo.");
        return; 
      } 

      if (status === 400) {
         toast.error(message);
         return; 
      }

      if (status === 409 || status === 404) {
        toast.error(message); 
        fetchSolicitudes();  
        onOpenChange(false);  
        return;
      }

      toast.error(message);

    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    const fetchTiposIncidencia = async () => {
      setFetchTiposIncidenciaLoading(true);
      try {
        const res = await axios.get(`${apiUrl}/crovinternal/tipos-incidencia`, {
          headers: authHeaders,
        });
        setListaTiposIncidencia(res.data);
      } catch (error) {
        setListaTiposIncidencia([]);
      } finally {
        setFetchTiposIncidenciaLoading(false);
      }
    };
    fetchTiposIncidencia();
  }, [token, apiUrl, authHeaders]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {dataToEdit ? "Editar solicitud" : "Crear solicitud de incidencia"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Tipo incidencia</label>
            <Select
              value={form.id_tipos_incidencia}
              onValueChange={(val) => {
                updateForm("id_tipos_incidencia", val);
              }}
              disabled={
                fetchTiposIncidenciaLoading || listaTiposIncidencia.length === 0
              }
            >
              <SelectTrigger className="bg-white w-full">
                <SelectValue
                  placeholder={
                    fetchTiposIncidenciaLoading
                      ? "Cargando..."
                      : listaTiposIncidencia.length === 0
                        ? "No hay tipos de incidencia"
                        : `Seleccione un tipo`
                  }
                />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {listaTiposIncidencia.map((item) => (
                  <SelectItem key={item.id} value={item.id.toString()}>
                    {item.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.id_tipos_incidencia && (
              <p className="text-red-500 text-xs mt-1">
                {errors.id_tipos_incidencia}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Periodo afectado</label>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="grid w-full gap-1.5">
                <Input
                  type="date"
                  value={form.fecha_inicio}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateForm("fecha_inicio", val);
                    if (form.fecha_fin && form.fecha_fin < val) {
                      updateForm("fecha_fin", "");
                    }
                  }}
                />
                {errors.fecha_inicio && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.fecha_inicio}
                  </p>
                )}
              </div>

              <ArrowRight className="text-gray-400 w-4 h-4 rotate-90 sm:rotate-0 flex-shrink-0" />

              <div className="grid w-full gap-1.5">
                <Input
                  type="date"
                  value={form.fecha_fin}
                  min={form.fecha_inicio}
                  disabled={!form.fecha_inicio}
                  onChange={(e) => updateForm("fecha_fin", e.target.value)}
                />
                {errors.fecha_fin && (
                  <p className="text-red-500 text-xs mt-1">{errors.fecha_fin}</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Descripción</label>
            <Textarea
              placeholder="Describe brevemente el motivo..."
              value={form.descripcion}
              onChange={(e) => updateForm("descripcion", e.target.value)}
            />
          </div>

          <DialogFooter className="pt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                dataToEdit ? "Guardar cambios" : "Crear solicitud"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}