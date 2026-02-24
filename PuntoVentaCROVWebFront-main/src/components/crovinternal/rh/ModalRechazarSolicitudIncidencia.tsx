
import { useState, useEffect } from "react";
import axios, {AxiosError} from "axios";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: number | null; 
  apiUrl: string | undefined;
  authHeaders: any;
  onSuccess: () => void; 
}

export function ModalRechazarSolicitudIncidencia({
  open,
  onOpenChange,
  requestId,
  apiUrl,
  authHeaders,
  onSuccess,
}: Props) {
  const [motivo, setMotivo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setMotivo("");
      setIsSubmitting(false);
    }
  }, [open]);

  const handleConfirmarRechazo = async () => {
    if (!requestId || !apiUrl) return;

    setIsSubmitting(true);
    try {
      await axios.patch(
        `${apiUrl}/crovinternal/solicitudes-incidencia/${requestId}/estado`,
        {
          accion: "RECHAZADO",
          motivo: motivo ?? null, 
        },
        { headers: authHeaders }
      );

      toast.success("Solicitud rechazada correctamente");
      onSuccess(); 
      onOpenChange(false); 
    } catch (error: any) {
      console.error("Error:", error);
            const axiosError = error as AxiosError<{message?: string;}>;
      
            const status = axiosError.response?.status;
            const data = axiosError.response?.data;
            const message = data?.message || "Ocurrió un error al aprobar la solicitud.";
      
            if (status === 400 || status === 404) {
              toast.error(message); 
              onSuccess(); // fetch de las solicitudes en componente padre
              onOpenChange(false);  
              return;
            }
      
            toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle >
            Rechazar solicitud
          </DialogTitle>
          <DialogDescription>
            Esta acción es irreversible. Por favor, indique el motivo del rechazo (opcional) para notificar al empleado.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
             <label
                className="text-sm font-medium text-slate-700"
                htmlFor="motivo-rechazo"
              >
                Motivo del rechazo
              </label>
            <Textarea
              id="motivo-rechazo"
              placeholder="Ej. Las fechas solicitadas coinciden con un evento crítico..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="min-h-[100px] resize-none "
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirmarRechazo}
            disabled={isSubmitting}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Rechazo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}