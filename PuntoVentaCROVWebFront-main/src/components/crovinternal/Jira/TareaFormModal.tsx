'use client';

import { memo, useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, RotateCcw, Bug, ClipboardList, BookOpen, LifeBuoy, ChevronUp, Minus, ChevronDown } from 'lucide-react';
import TaskDescTextEditor from '@/components/crovinternal/Jira/TaskDescTextEditor/TaskDescTextEditor';
import { toast } from 'sonner';
import { getDeletedFiles } from '@/lib/utils';

interface TareaCrov {
  id: number;
  titulo: string;
  descripcion: string;
  id_sistemas_crov: number;
  id_empleados_crov: number;
  prioridad: 'baja' | 'media' | 'alta';
  estatus: 'Por hacer' | 'En curso' | 'Implementacion lista' | 'Pruebas' | 'Listo';
  reabierto: number;
  activo: number;
  fecha_registro: string;
  fecha_vencimiento: string | null;
  tipo: 'Tarea' | 'Error' | 'Soporte' | 'Historia';
  complejidad: number;
  id_sprint: number | null;
  storyPoints: number;
}

interface SistemaCrov {
  id: number;
  nombre: string;
}

interface EmpleadoCrov {
  id: number;
  nombre_completo: string;
  activo: number;
  color_perfil: string | null;
}

interface SprintOption {
  value: string;
  label: string;
}

interface TareaFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tareaToEdit?: TareaCrov | null;
  onSuccess: () => void;
  customTitle?: string;
  showResetButton?: boolean;
  // Datos precargados del padre
  sistemas: SistemaCrov[];
  empleados: EmpleadoCrov[];
  sprintOptions: SprintOption[];
  // Config para las peticiones
  apiUrl: string;
  authHeaders: Record<string, string> | undefined;
}




const defaultTarea: Omit<TareaCrov, 'id' | 'fecha_registro' | 'storyPoints'> = {
  titulo: '',
  descripcion: '',
  id_sistemas_crov: 0,
  id_empleados_crov: 0,
  prioridad: 'baja',
  estatus: 'Por hacer',
  reabierto: 0,
  activo: 1,
  fecha_vencimiento: '',
  tipo: 'Tarea',
  complejidad: 1,
  id_sprint: null,
};

const tareaTipoConfig: Record<
  TareaCrov['tipo'],
  { badgeClass: string; icon: typeof ClipboardList }
> = {
  Tarea: { badgeClass: 'border-blue-200 bg-blue-50 text-blue-700', icon: ClipboardList },
  Error: { badgeClass: 'border-red-200 bg-red-50 text-red-700', icon: Bug },
  Soporte: { badgeClass: 'border-purple-200 bg-purple-50 text-purple-700', icon: LifeBuoy },
  Historia: { badgeClass: 'border-amber-200 bg-amber-50 text-amber-700', icon: BookOpen },
};

function TareaTipoBadge({ tipo }: { tipo: TareaCrov['tipo'] }) {
  const config = tareaTipoConfig[tipo] ?? tareaTipoConfig.Tarea;
  const Icon = config.icon;

  return (
    <Badge className={`gap-1 ${config.badgeClass}`} variant="outline">
      <Icon className="h-4 w-4" />
      {tipo}
    </Badge>
  );
}

const TareaFormModal = memo(({ 
  open,
  onOpenChange,
  tareaToEdit, 
  onSuccess,
  customTitle,
  showResetButton = true,
  sistemas,
  empleados,
  sprintOptions,
  apiUrl,
  authHeaders,
}: TareaFormModalProps) => {
  const [saving, setSaving] = useState(false);
  const [tareaForm, setTareaForm] = useState(defaultTarea);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const tareaPendingImagesRef = useRef<Map<string, File>>(new Map());
  const tareaOriginalDescripcionRef = useRef<string>("");

  // estados para la barra de progreso
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const tareasEndpoint = `${apiUrl}/crovinternal/tareas-crov`;

  // Cargar datos de tarea a editar cuando se abre el modal o cambia tareaToEdit
  useEffect(() => {
    if (open && tareaToEdit) {
      setTareaForm({
        titulo: tareaToEdit.titulo,
        descripcion: tareaToEdit.descripcion,
        id_sistemas_crov: tareaToEdit.id_sistemas_crov,
        id_empleados_crov: tareaToEdit.id_empleados_crov,
        prioridad: tareaToEdit.prioridad,
        estatus: tareaToEdit.estatus,
        reabierto: tareaToEdit.reabierto,
        activo: tareaToEdit.activo,
        fecha_vencimiento: tareaToEdit.fecha_vencimiento 
            ? new Date(tareaToEdit.fecha_vencimiento).toISOString().split('T')[0] 
            : '',
        tipo: tareaToEdit.tipo,
        complejidad: tareaToEdit.complejidad,
        id_sprint: tareaToEdit.id_sprint,
      });
      tareaOriginalDescripcionRef.current = tareaToEdit.descripcion || "";
    } else if (open && !tareaToEdit) {
      setTareaForm(defaultTarea);
      tareaOriginalDescripcionRef.current = "";
    }
  }, [open, tareaToEdit]);

const uploadPendingFilesAndReplaceHtml = async (html: string): Promise<string> => {
  let updatedHtml = html;
  const filesToUpload = Array.from(tareaPendingImagesRef.current.entries());

  if (filesToUpload.length === 0) return updatedHtml; // si no hay archivos en memoria, se termina instantaneamente
  
  setIsUploading(true);
  setUploadProgress(0);
  const progressMap: Record<string, number> = {};

  const uploads = Array.from(tareaPendingImagesRef.current.entries()).map(
    async ([blobUrl, file]) => {
      try {
        const { data } = await axios.post(
          `${apiUrl}/getPresignedUploadUrlImgForNewJiraTasks`,
          { fileType: file.type },
          { headers: authHeaders }
        );

        await axios.put(data.uploadUrl, file, {
          headers: { "Content-Type": file.type },
          onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                // Cálculo de progreso en tiempo real
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                progressMap[blobUrl] = percentCompleted;

                const totalPercentages = Object.values(progressMap).reduce((a, b) => a + b, 0);
                const averageProgress = Math.round(totalPercentages / filesToUpload.length);
                
                setUploadProgress(averageProgress);
              }
            }
        });

        return { blobUrl, publicUrl: data.publicUrl, success: true };
      } catch (error) {
        console.error(`Error uploading image ${blobUrl}:`, error);
        return { blobUrl, publicUrl: blobUrl, success: false }; // Mantener la URL blob si falla
      }
    }
  );

  const results = await Promise.all(uploads);
  setIsUploading(false);

  // Solo reemplazar las imágenes que se subieron exitosamente
  results.forEach(({ blobUrl, publicUrl, success }) => {
    if (success) {
      updatedHtml = updatedHtml.replaceAll(blobUrl, publicUrl);
    }
  });

  // mostrar si no se pudieron subir imagenes
  const failedUploads = results.filter(r => !r.success);
  if (failedUploads.length > 0) {
    console.warn(`${failedUploads.length} archivo(s) no se pudieron subir`);
    toast.warning(`${failedUploads.length} archivos(s) no se pudieron subir, intente nuevamente.`);
  }

  return updatedHtml;
};

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    let newErrors: Record<string, string> = {};

    if (!tareaForm.titulo?.trim())
      newErrors.titulo = "El título es obligatorio";

    if (!tareaForm.id_sistemas_crov)
      newErrors.id_sistemas_crov = "Selecciona un sistema";

    if (!tareaForm.id_empleados_crov)
      newErrors.id_empleados_crov = "Selecciona un empleado";

    if (!tareaForm.fecha_vencimiento)
      newErrors.fecha_vencimiento = "La fecha es obligatoria";

    if (!tareaForm.descripcion?.trim())
      newErrors.descripcion = "La descripción es obligatoria";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error("Completa los campos obligatorios");
      return;
    }

    setSaving(true);
    
    try {
      const finalDescription = await uploadPendingFilesAndReplaceHtml(
        tareaForm.descripcion || ""
      );

      const deletedImages = getDeletedFiles(
        tareaOriginalDescripcionRef.current,
        finalDescription
      );

      const payload = {
        ...tareaForm,
        descripcion: finalDescription,
        deletedImagesDescripcion: deletedImages,
        id_sistemas_crov: Number(tareaForm.id_sistemas_crov),
        id_empleados_crov: Number(tareaForm.id_empleados_crov),
        complejidad: Number(tareaForm.complejidad),
        fecha_vencimiento: tareaForm.fecha_vencimiento || null,
      };

      if (tareaToEdit) {
        await axios.put(`${tareasEndpoint}/${tareaToEdit.id}`, payload, {
          headers: authHeaders,
        });
        toast.success('Tarea actualizada correctamente');
      } else {
        await axios.post(tareasEndpoint, payload, { headers: authHeaders });
        toast.success('Tarea creada correctamente');
      }

      tareaPendingImagesRef.current.clear();
      handleClose();
      onSuccess();
    } catch (error) {
      console.error('Error al guardar tarea', error);
      toast.error('Error al guardar la tarea');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setTareaForm(defaultTarea);
    tareaOriginalDescripcionRef.current = "";
  };

  const handleClose = () => {
    tareaPendingImagesRef.current.forEach((_, blobUrl) => {
      URL.revokeObjectURL(blobUrl);
    });
    tareaPendingImagesRef.current.clear();
    handleReset();
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      handleClose();
    } else {
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {customTitle || (tareaToEdit ? 'Editar tarea' : 'Crear tarea')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          {/* Título */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Título</label>
            <Input
            value={tareaForm.titulo}
              onChange={(e) => {
                setTareaForm((prev) => ({ ...prev, titulo: e.target.value }));

            // 🔥 limpia el error cuando empiece a escribir
            if (errors.titulo) {
              setErrors((prev) => {
              const { titulo, ...rest } = prev;
              return rest;
              });
            }
            }}
          className={errors.titulo ? "border-red-500 focus-visible:ring-red-500" : ""}
          />

            {errors.titulo && (
              <p className="text-red-500 text-xs">
                {errors.titulo}
            </p>
            )}
          </div>

         {/* Sistema */}
<div className="space-y-2">
  <label className="text-sm font-medium">Sistema</label>

  <Select
    value={tareaForm.id_sistemas_crov ? String(tareaForm.id_sistemas_crov) : ''}
    onValueChange={(value) => {
      setTareaForm((prev) => ({
        ...prev,
        id_sistemas_crov: Number(value),
      }));

      // 🔥 Limpia error cuando seleccionan algo
      if (errors.id_sistemas_crov) {
        setErrors((prev) => {
          const { id_sistemas_crov, ...rest } = prev;
          return rest;
        });
      }
    }}
  >
    <SelectTrigger
      className={
        errors.id_sistemas_crov
          ? "border-red-500 focus:ring-red-500"
          : ""
      }
    >
      <SelectValue placeholder="Selecciona un sistema" />
    </SelectTrigger>

    <SelectContent className="bg-white">
      {sistemas.map((sistema) => (
        <SelectItem key={sistema.id} value={String(sistema.id)}>
          {sistema.nombre}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>

  {errors.id_sistemas_crov && (
    <p className="text-red-500 text-xs">
      {errors.id_sistemas_crov}
    </p>
  )}
</div>


          {/* Empleado responsable */}
          <div className="space-y-2">
  <label className="text-sm font-medium">
    Empleado responsable
  </label>

  <Select
    value={
      tareaForm.id_empleados_crov
        ? String(tareaForm.id_empleados_crov)
        : ""
    }
    onValueChange={(value) => {
      setTareaForm((prev) => ({
        ...prev,
        id_empleados_crov: Number(value),
      }));

      // 🔥 Limpia error cuando seleccionan
      if (errors.id_empleados_crov) {
        setErrors((prev) => {
          const { id_empleados_crov, ...rest } = prev;
          return rest;
        });
      }
    }}
  >
    <SelectTrigger
      className={
        errors.id_empleados_crov
          ? "border-red-500 focus:ring-red-500"
          : ""
      }
    >
      <SelectValue placeholder="Selecciona un empleado" />
    </SelectTrigger>

    <SelectContent className="bg-white max-h-48 overflow-y-auto">
      {empleados
        .filter((empleado) => empleado.activo)
        .map((empleado) => (
          <SelectItem key={empleado.id} value={String(empleado.id)}>
            {empleado.nombre_completo}
          </SelectItem>
        ))}
    </SelectContent>
  </Select>

  {errors.id_empleados_crov && (
    <p className="text-red-500 text-xs">
      {errors.id_empleados_crov}
    </p>
  )}
</div>


          {/* Prioridad */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Prioridad</label>
            <Select
              value={tareaForm.prioridad}
              onValueChange={(value) =>
                setTareaForm((prev) => ({ ...prev, prioridad: value as TareaCrov['prioridad'] }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white p-1">
                <SelectItem value="alta" className="my-1 cursor-pointer">
                  <div className="flex items-center gap-2 justify-between w-full px-3 py-1 rounded-full border border-red-200 bg-red-50 text-red-700 text-xs font-medium">
                    Alta <ChevronUp className="w-3 h-3" />
                  </div>
                </SelectItem>
                <SelectItem value="media" className="my-1 cursor-pointer">
                  <div className="flex items-center gap-2 justify-between w-full px-3 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-xs font-medium">
                    Media <Minus className="w-3 h-3" />
                  </div>
                </SelectItem>
                <SelectItem value="baja" className="my-1 cursor-pointer">
                  <div className="flex items-center gap-2 justify-between w-full px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium">
                    Baja <ChevronDown className="w-3 h-3" />
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Estatus */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Estatus</label>
            <Select
              value={tareaForm.estatus}
              onValueChange={(value) =>
                setTareaForm((prev) => ({ ...prev, estatus: value as TareaCrov['estatus'] }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="Por hacer">Por hacer</SelectItem>
                <SelectItem value="En curso">En curso</SelectItem>
                <SelectItem value="Implementacion lista">Implementacion lista</SelectItem>
                <SelectItem value="Pruebas">Pruebas</SelectItem>
                <SelectItem value="Listo">Listo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo</label>
            <Select
              value={tareaForm.tipo}
              onValueChange={(value) =>
                setTareaForm((prev) => ({ ...prev, tipo: value as TareaCrov['tipo'] }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {Object.keys(tareaTipoConfig).map((value) => (
                  <SelectItem key={value} value={value}>
                    <TareaTipoBadge tipo={value as TareaCrov['tipo']} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Complejidad */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Complejidad</label>
            <Input
              type="number"
              min={1}
              value={tareaForm.complejidad}
              onChange={(e) =>
                setTareaForm((prev) => ({ ...prev, complejidad: Number(e.target.value) }))
              }
            />
          </div>

          {/* Fecha de vencimiento */}
          <div className="space-y-2">
  <label className="text-sm font-medium">
    Fecha de vencimiento
  </label>

  <Input
    type="date"
    value={tareaForm.fecha_vencimiento || ""}
    onChange={(e) => {
      setTareaForm((prev) => ({
        ...prev,
        fecha_vencimiento: e.target.value,
      }));

      // 🔥 Limpia error cuando seleccionan fecha
      if (errors.fecha_vencimiento) {
        setErrors((prev) => {
          const { fecha_vencimiento, ...rest } = prev;
          return rest;
        });
      }
    }}
    className={
      errors.fecha_vencimiento
        ? "border-red-500 focus-visible:ring-red-500"
        : ""
    }
  />

  {errors.fecha_vencimiento && (
    <p className="text-red-500 text-xs">
      {errors.fecha_vencimiento}
    </p>
  )}
</div>


          {/* Sprint */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Sprint</label>
            <Select
              value={tareaForm.id_sprint ? String(tareaForm.id_sprint) : 'none'}
              onValueChange={(value) =>
                setTareaForm((prev) => ({ ...prev, id_sprint: value === 'none' ? null : Number(value) }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin sprint" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="none">Sin sprint</SelectItem>
                {sprintOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Descripción */}
          <div className="space-y-2 md:col-span-2">
  <label className="text-sm font-medium">Descripción</label>

  <div
    className={
      errors.descripcion
        ? "border border-red-500 rounded-md"
        : ""
    }
  >
    <TaskDescTextEditor
      value={tareaForm.descripcion || ""}
      onChange={(html) => {
        setTareaForm((prev) => ({
          ...prev,
          descripcion: html,
        }));

        // 🔥 Limpia error cuando escriben
        if (errors.descripcion) {
          setErrors((prev) => {
            const { descripcion, ...rest } = prev;
            return rest;
          });
        }
      }}
      onImagesChange={(images) => {
        tareaPendingImagesRef.current = new Map(images);
      }}
    />
  </div>

  {errors.descripcion && (
    <p className="text-red-500 text-xs">
      {errors.descripcion}
    </p>
  )}
</div>


          {/* Switches */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Switch
                checked={Boolean(tareaForm.reabierto)}
                onCheckedChange={(checked) =>
                  setTareaForm((prev) => ({ ...prev, reabierto: checked ? 1 : 0 }))
                }
              />
              Reabierto
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <Switch
                checked={Boolean(tareaForm.activo)}
                onCheckedChange={(checked) =>
                  setTareaForm((prev) => ({ ...prev, activo: checked ? 1 : 0 }))
                }
              />
              Activo
            </label>
          </div>

          <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
              {/* Barra de progreso de subida de archivos */}
              {isUploading && (
                <div className="w-full sm:w-64">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    Subiendo archivos... {uploadProgress}%
                  </p>
                </div>
              )}
          </div>

          {/* Botones */}
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={saving}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span className="ml-2">{tareaToEdit ? 'Actualizar' : 'Crear'} tarea</span>
            </Button>
            {showResetButton && (
              <Button type="button" variant="outline" onClick={handleReset} disabled={saving}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});

TareaFormModal.displayName = 'TareaFormModal';

export default TareaFormModal;