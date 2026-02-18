"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { getInternalAuthHeaders } from "@/lib/internalAuth";

interface Empleado {
  id: number;
  nombre_completo: string;
  puesto: string;
  monto_ahorro: number;
}

interface AhorroEmpleado {
  id: number;
  monto: number;
  fecha: string; // ISO string
  empleado: {
    id: number;
    nombre_completo: string;
  };
}

interface AhorroForm {
  id: number | null;
  monto: number | "";
  fecha: string;
  empleadoId: number | null;
}

const defaultAhorroForm: AhorroForm = {
  id: null,
  monto: "",
  fecha: "",
  empleadoId: null,
};

type DialogAddOrEditSavingsProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  historialAhorroEditingId?: number | null;
  onSuccess: () => void;
  onError: (message: string) => void;
};

const isoToDateInput = (isoDate: string): string => {
  return isoDate.split("T")[0];
};

export default function DialogAddOrEditSavings({
  open,
  setOpen,
  historialAhorroEditingId = null,
  onSuccess,
  onError,
}: DialogAddOrEditSavingsProps) {
  const isEditing = historialAhorroEditingId !== null;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("internalToken")
      : null;

  const authHeaders = useMemo(() => getInternalAuthHeaders(token), [token]);

  const [openCombobox, setOpenCombobox] = useState(false);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [ahorroForm, setAhorroForm] = useState<AhorroForm>(defaultAhorroForm);

  const [loadingFetchEmpleados, setLoadingFetchEmpleados] = useState(false);
  const [loadingFetchAhorroEditing, setLoadingFetchAhorroEditing] =
    useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false); // Estado para el botón de guardar

  const fetchAhorroAEditar = async () => {
    if (!historialAhorroEditingId) return;

    setLoadingFetchAhorroEditing(true);

    try {
      const res = await axios.get<AhorroEmpleado>(
        `${apiUrl}/crovinternal/historial-ahorros/${historialAhorroEditingId}`,
        { headers: authHeaders },
      );

      const ahorro = res.data;

      setAhorroForm({
        id: ahorro.id,
        monto: ahorro.monto,
        fecha: isoToDateInput(ahorro.fecha),
        empleadoId: ahorro.empleado.id,
      });
    } catch (error) {
      console.error("Error al obtener el ahorro a editar", error);
      setAhorroForm(defaultAhorroForm);
    } finally {
      setLoadingFetchAhorroEditing(false);
    }
  };

  const fetchEmpleados = async () => {
    setLoadingFetchEmpleados(true);
    try {
      const res = await axios.get(
        `${apiUrl}/crovinternal/empleados-crov-activos-no-residentes`,
        {
          headers: authHeaders,
        },
      );

      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.items)
          ? res.data.items
          : [];
      setEmpleados(data);
    } catch (error) {
      console.error("Error al obtener empleados CROV", error);
      setEmpleados([]);
    } finally {
      setLoadingFetchEmpleados(false);
    }
  };

  const handleClose = (openValue: boolean) => {
    setOpen(openValue);

    if (!openValue) {
      setAhorroForm(defaultAhorroForm);
      setEmpleados([]);
      setOpenCombobox(false);
    }
  };

  const updateFormField = <Key extends keyof AhorroForm>(
    key: Key,
    value: AhorroForm[Key],
  ) => {
    setAhorroForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (!apiUrl || !authHeaders) return;

      const isEdit = isEditing && ahorroForm.id;

      const url = isEdit
        ? `${apiUrl}/crovinternal/historial-ahorros/${ahorroForm.id}`
        : `${apiUrl}/crovinternal/historial-ahorros`;

      const payload = isEdit
        ? {
            monto: ahorroForm.monto,
            fecha: new Date(ahorroForm.fecha).toISOString(),
          }
        : {
            ...ahorroForm,
            fecha: new Date(ahorroForm.fecha).toISOString(),
          };

      if (isEdit) {
        // endpoint para editar
        await axios.patch(url, payload, { headers: authHeaders });
      } else {
        // endpoin para crear nuevo
        await axios.post(url, payload, { headers: authHeaders });
      }

      onSuccess?.();
    } catch (error) {
      console.error("Error al guardar/editar ahorro", error);

      let message = `Ocurrió un error al ${isEditing ? "editar" : "guardar"} el ahorro`;

      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || error.message || message;
      }

      onError?.(message);
    } finally {
      setIsSubmitting(false);
      setOpen(false);
      setAhorroForm(defaultAhorroForm);
      setEmpleados([]);
    }
  };

  useEffect(() => {
    if (!open) return;
    fetchEmpleados();

    if (historialAhorroEditingId !== null) {
      fetchAhorroAEditar();
    } else {
      setAhorroForm(defaultAhorroForm);
    }
  }, [open, historialAhorroEditingId]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar ahorro" : "Agregar ahorro"}
          </DialogTitle>
        </DialogHeader>
        {isEditing && loadingFetchAhorroEditing ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Empleado */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">Empleado</label>

              <Popover open={openCombobox} onOpenChange={setOpenCombobox} modal>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between bg-white font-normal"
                    disabled={isEditing}
                  >
                    {loadingFetchEmpleados
                      ? "Cargando empleados..."
                      : empleados.length === 0
                        ? "No hay empleados disponibles"
                        : ahorroForm.empleadoId
                          ? empleados.find(
                              (e) => e.id === ahorroForm.empleadoId,
                            )?.nombre_completo
                          : "Seleccione un empleado"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-full p-0 bg-white" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar empleado" />
                    <CommandList>
                      <CommandEmpty>No se encontró el empleado.</CommandEmpty>
                      <CommandGroup>
                        {empleados.map((emp) => (
                          <CommandItem
                            key={emp.id}
                            value={emp.nombre_completo}
                            onSelect={() => {
                              updateFormField("empleadoId", emp.id);
                              if (!isEditing) {
                                updateFormField(
                                  "monto",
                                  emp.monto_ahorro ?? "",
                                );
                              }
                              setOpenCombobox(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                ahorroForm.empleadoId === emp.id
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            {emp.nombre_completo}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Monto */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">Monto</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                  $
                </span>
                <Input
                  step="0.001"
                  min={0.001}
                  className="pl-7"
                  type="number"
                  value={ahorroForm.monto}
                  onChange={(e) => {
                    const valor = e.target.value;

                    if (valor === "") {
                      updateFormField("monto", "");
                      return;
                    }

                    const regex = /^\d*(\.\d{0,3})?$/;
                    if (regex.test(valor)) {
                      updateFormField("monto", parseFloat(valor));
                    }
                  }}
                  disabled={!ahorroForm.empleadoId}
                />
              </div>
            </div>

            {/* Fecha */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">Fecha</label>
              <Input
                type="date"
                value={ahorroForm.fecha}
                onChange={(e) => updateFormField("fecha", e.target.value)}
                disabled={!ahorroForm.monto}
              />
            </div>

            <DialogFooter className="pt-4 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={
                  isSubmitting ||
                  !ahorroForm.empleadoId ||
                  ahorroForm.monto === "" ||
                  !ahorroForm.fecha
                }
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {isEditing ? "Guardar cambios" : "Guardar ahorro"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
