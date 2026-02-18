import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  getInitials,
  getContrastColor,
  catalogoColoresPerfil,
} from "@/lib/avatar";

interface EmpleadoCrov {
    nombre_completo: string;
  color_perfil: string | null;
}
interface Props {
  empleado: EmpleadoCrov;
  className?: string;
  initialsSize?: string;
}

export default function AvatarEmpleado({
  empleado,
  className = "",
  initialsSize = "text-sm",
}: Props) {

  const textColor = getContrastColor(empleado.color_perfil ?? catalogoColoresPerfil[0]);

  return (
    <Avatar className={className}>
      <AvatarFallback
        className={`font-semibold ${initialsSize}`}
        style={{
          backgroundColor: empleado.color_perfil ?? catalogoColoresPerfil[0],
          color: textColor,
        }}
      >
        {getInitials(empleado.nombre_completo)}
      </AvatarFallback>
    </Avatar>
  );
}