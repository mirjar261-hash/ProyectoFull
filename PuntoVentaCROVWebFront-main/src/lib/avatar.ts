
// el catalogo se usa en la pantalla del perfil, 
// son las opciones al momento de cambiar el color del avatar
export const catalogoColoresPerfil = [
  '#f97316', // Naranja (Opcion por defecto)
  '#ef4444', // Rojo
  '#eab308', // Amarillo
  '#22c55e', // Verde
  '#06b6d4', // Cyan
  '#3b82f6', // Azul
  '#8b5cf6', // Violeta
  '#ec4899', // Rosa
  '#64748b', // Gris
  '#000000', // Negro
];

// Genera iniciales (ej: "Juan Perez" -> "JP")
export const getInitials = (name: string) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Decide si el texto debe ser negro o blanco según el fondo
export const getContrastColor = (hexColor: string) => {
  // Convertir hex a RGB
  const r = parseInt(hexColor.substring(1, 3), 16);
  const g = parseInt(hexColor.substring(3, 5), 16);
  const b = parseInt(hexColor.substring(5, 7), 16);
  // Formula de luminosidad (YIQ)
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 128 ? 'black' : 'white';
};