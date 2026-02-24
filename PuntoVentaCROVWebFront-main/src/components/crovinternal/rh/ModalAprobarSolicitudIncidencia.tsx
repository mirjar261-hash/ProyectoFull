import { useState } from "react";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: number | null;
  apiUrl: string | undefined;
  authHeaders: any;
  onSuccess: () => void;
}

export function ModalAprobarSolicitudIncidencia({
  open,
  onOpenChange,
  requestId,
  apiUrl,
  authHeaders,
  onSuccess,
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirmarAprobacion = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!requestId || !apiUrl) return;

    setIsSubmitting(true);
    try {
      await axios.patch(
        `${apiUrl}/crovinternal/solicitudes-incidencia/${requestId}/estado`,
        { accion: "APROBADO" },
        { headers: authHeaders },
      );

      toast.success("Solicitud aprobada correctamente");
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-white">
        <AlertDialogHeader>
          <AlertDialogTitle>¿Aprobar solicitud?</AlertDialogTitle>
          <AlertDialogDescription>
            Está a punto de aprobar esta solicitud. Esta acción notificará al
            empleado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={handleConfirmarAprobacion}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Aprobación
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
