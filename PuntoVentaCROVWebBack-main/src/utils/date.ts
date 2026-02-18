// utils/date.ts

// Detecta si es "YYYY-MM-DD"
const isDateOnly = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
//Funcion UTC general para los reportes
export const toUTC = (date?: string | number | Date): Date => {
  const d = date ? new Date(date) : new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000);
};
//Funcion UTC para las promociones
export function toUTCStart(input: string | Date): string {
  if (!input) throw new Error('Invalid date');

  if (typeof input === 'string' && isDateOnly(input)) {
    return `${input}T00:00:00.000Z`;
  }

  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) throw new Error('Invalid date');
  return d.toISOString(); // si ya trae hora la respeta
}

export function toUTCEnd(input: string | Date): string {
  if (!input) throw new Error('Invalid date');

  if (typeof input === 'string' && isDateOnly(input)) {
    return `${input}T23:59:59.999Z`;
  }

  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) throw new Error('Invalid date');
  return d.toISOString(); // si ya trae hora la respeta
}

export const calcularDiasHabiles = (inicio: Date, fin: Date): number => {
  let count = 0;
  const curDate = new Date(inicio.getTime());
  while (curDate <= fin) {
    const dayOfWeek = curDate.getDay();
    // 0 = Domingo, 6 = Sábado. Contamos solo si es 1-5 (Lunes-Viernes)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }
  return count;
};

// formatea fechas a espanish, tipo "10 Ene 2026"
export const formatearFechaEsp = (fecha: Date): string => {
  const partes = new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC' // Importante para que no reste días por zona horaria
  }).formatToParts(fecha);

  const dia = partes.find(p => p.type === 'day')?.value;
  const mes = partes.find(p => p.type === 'month')?.value;
  const anio = partes.find(p => p.type === 'year')?.value;
  
  const mesCap = mes ? mes.charAt(0).toUpperCase() + mes.slice(1) : '';

  return `${dia} ${mesCap} ${anio}`;
};