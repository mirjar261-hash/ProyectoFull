"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DemoRequestForm {
  fullName: string;
  phone: string;
  email: string;
  date: string;
  time: string;
}

const initialState: DemoRequestForm = {
  fullName: "",
  phone: "",
  email: "",
  date: "",
  time: "",
};

interface DemoRequestDialogProps {
  triggerLabel?: string;
  triggerClassName?: string;
}

export default function DemoRequestDialog({
  triggerLabel = "Agendar demostración",
  triggerClassName,
}: DemoRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DemoRequestForm>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof DemoRequestForm) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.fullName || !form.phone || !form.email || !form.date || !form.time) {
      toast.error("Por favor completa todos los campos para agendar tu demostración.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = data?.error ?? "Ocurrió un error al enviar tu solicitud. Inténtalo de nuevo más tarde.";
        throw new Error(message);
      }

      toast.success(
        "¡Listo! Tu demostración fue agendada. Un asesor de ventas se comunicará para confirmar la cita."
      );
      setForm(initialState);
      setOpen(false);
    } catch (error) {
      console.error("Error al solicitar demostración", error);
      toast.error(
        error instanceof Error ? error.message : "No se pudo enviar la solicitud. Intenta más tarde."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition",
            triggerClassName ?? "bg-orange-500 text-white hover:bg-orange-400",
          )}
        >
          {triggerLabel}
          <ArrowRight className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Agenda tu demostración</DialogTitle>
          <DialogDescription>
            Completa el formulario y uno de nuestros asesores se pondrá en contacto contigo para confirmar los detalles.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="fullName">
              Nombre completo
            </label>
            <Input
              id="fullName"
              value={form.fullName}
              onChange={handleChange("fullName")}
              placeholder="Ingresa tu nombre completo"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="phone">
              Teléfono
            </label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange("phone")}
              placeholder="Ingresa tu número de contacto"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="email">
              Correo electrónico
            </label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={handleChange("email")}
              placeholder="correo@ejemplo.com"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="date">
                Fecha de agenda
              </label>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={handleChange("date")}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="time">
                Horario
              </label>
              <Input
                id="time"
                type="time"
                value={form.time}
                onChange={handleChange("time")}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              className="w-full bg-orange-500 text-white hover:bg-orange-400"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
