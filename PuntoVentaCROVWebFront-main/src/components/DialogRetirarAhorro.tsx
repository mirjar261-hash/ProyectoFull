"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { ArrowDownCircle } from "lucide-react";
import { toast } from "sonner";

type RetirarAhorroForm = {
  empleado: number | "";
  monto: number | "";
};

type Empleado = {
  id: number;
  nombre_completo: string;
  totalAhorro: number;
};

type DialogRetirarAhorroProps = {
  onSuccess: () => void;
}

export default function DialogRetirarAhorro({onSuccess} : DialogRetirarAhorroProps) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("internalToken")
      : null;

  const authHeaders = useMemo(() => getInternalAuthHeaders(token), [token]);

  const [openDialog, setOpenDialog] = useState(false);
  const [openComboboxEmpleados, setOpenComboboxEmpleados] = useState(false);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loadingFetchEmpleados, setLoadingFetchEmpleados] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState<RetirarAhorroForm>({
    empleado: "",
    monto: "",
  });

  function updateForm<K extends keyof RetirarAhorroForm>(
    key: K,
    value: RetirarAhorroForm[K],
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  const fetchEmpleados = async () => {
    setLoadingFetchEmpleados(true);
    try {
      const res = await axios.get(
        `${apiUrl}/crovinternal/empleados-crov-retiro-ahorros`,
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      montoARetirar: form.monto,
    };
    setIsSubmitting(true);
    try {
      await axios.post(
        `${apiUrl}/crovinternal/historial-ahorros/${form.empleado}/retirar-ahorro`,
        payload,
        { headers: authHeaders },
      );
      setOpenDialog(false);
      resetearModal();
      onSuccess();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const mensaje =
          error.response?.data?.message ??
          "Ocurrió un error al realizar el retiro";

        toast.error(mensaje);
      } else {
        toast.error("Error inesperado");
      }
    } finally {
        setIsSubmitting(false);
    }
  };

  const empleadoSeleccionado = useMemo(() => {
    return empleados.find((e) => e.id === form.empleado);
  }, [empleados, form.empleado]);

  const resetearModal = () => {
    setForm({
      empleado: "",
      monto: "",
    });
    setOpenComboboxEmpleados(false);
  };

  useEffect(() => {
    if (!openDialog) {
      resetearModal();
      return;
    }
    fetchEmpleados();
  }, [openDialog]);

  return (
    <Dialog open={openDialog} onOpenChange={setOpenDialog}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          <ArrowDownCircle className="mr-2 h-4 w-4" />
          Retirar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Retirar ahorro</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Empleado</label>
            <Popover
              open={openComboboxEmpleados}
              onOpenChange={setOpenComboboxEmpleados}
              modal
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between bg-white font-normal"
                  disabled={loadingFetchEmpleados || empleados.length === 0}
                >
                  {loadingFetchEmpleados
                    ? "Cargando empleados..."
                    : empleados.length === 0
                      ? "No hay empleados disponibles"
                      : form.empleado
                        ? empleados.find((e) => e.id === form.empleado)
                            ?.nombre_completo
                        : "Seleccione un empleado"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-full p-0 bg-white" align="start">
                <Command>
                  <CommandInput
                    placeholder={
                      loadingFetchEmpleados
                        ? "Cargando empleados..."
                        : "Buscar empleado"
                    }
                    disabled={loadingFetchEmpleados || empleados.length === 0}
                  />

                  <CommandList >
                    {/* Cargando */}
                    {loadingFetchEmpleados && (
                      <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cargando empleados...
                      </div>
                    )}

                    {/* Sin empleados */}
                    {!loadingFetchEmpleados && empleados.length === 0 && (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        No hay empleados disponibles
                      </div>
                    )}

                    {/* Lista normal */}
                    {!loadingFetchEmpleados && empleados.length > 0 && (
                      <>
                        <CommandEmpty>No se encontró el empleado</CommandEmpty>
                        <CommandGroup>
                          {empleados.map((emp) => (
                            <CommandItem
                              key={emp.id}
                              value={emp.nombre_completo}
                              onSelect={() => {
                                updateForm("empleado", emp.id);
                                updateForm("monto", emp.totalAhorro);
                                setOpenComboboxEmpleados(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  form.empleado === emp.id
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              {emp.nombre_completo}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Monto</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                $
              </span>
              <Input
                step="0.001"
                min={0.001}
                max={empleadoSeleccionado?.totalAhorro}
                className="pl-7"
                type="number"
                value={form.monto}
                disabled={!form.empleado}
                onChange={(e) => {
                  if (!empleadoSeleccionado) return;

                  const valor = e.target.value;

                  if (valor === "") {
                    updateForm("monto", "");
                    return;
                  }

                  const monto = Number(valor);
                  if (Number.isNaN(monto)) return;

                  if (monto < 0) return;

                  if (monto > empleadoSeleccionado.totalAhorro) {
                    updateForm("monto", empleadoSeleccionado.totalAhorro);
                    return;
                  }

                  updateForm("monto", monto);
                }}
              />
              {empleadoSeleccionado &&
                form.monto !== "" &&
                form.monto > empleadoSeleccionado.totalAhorro && (
                  <p className="text-xs text-red-500">
                    El monto no puede ser mayor al ahorro total del empleado ($
                    {empleadoSeleccionado.totalAhorro})
                  </p>
                )}
            </div>
          </div>
          <DialogFooter className="pt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenDialog(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={isSubmitting || !form.empleado || form.monto === ""}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                "Retirar"
                )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
