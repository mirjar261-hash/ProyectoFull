export const formatFecha = (fecha: string) => {
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return fecha
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  return d.toLocaleString('sv-SE', { timeZone })
}
