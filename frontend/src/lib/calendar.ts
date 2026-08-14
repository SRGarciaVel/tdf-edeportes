export interface CalendarCell {
  date: Date;
  isCurrentMonth: boolean;
  key: string; // YYYY-MM-DD, para agrupar eventos y como React key
}

/** Clave YYYY-MM-DD en horario LOCAL (no UTC — evita que un evento de las
 * 23:00 se muestre "un día antes" para alguien en huso horario negativo). */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Todas las claves YYYY-MM-DD que cubre un evento, de start_at a end_at
 * inclusive (por día calendario local, sin importar la hora exacta). Si no
 * hay end_at, devuelve solo el día de inicio — mismo comportamiento que
 * antes para eventos de un día. */
export function eventDateKeys(startIso: string, endIso: string | null): string[] {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : start;

  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  const keys: string[] = [];
  // tope de seguridad: nunca iterar más de un año, para no colgar el
  // navegador si algún evento llega con end_at mal cargado muy lejos
  for (let i = 0; cursor <= endDay && i < 366; i++) {
    keys.push(dateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

/** Grilla de 42 celdas (6 semanas x 7 días, domingo a sábado) que cubre el
 * mes completo, con los días de relleno de los meses adyacentes. */
export function getMonthGrid(year: number, month: number): CalendarCell[] {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay(); // 0 = domingo
  const gridStart = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    return {
      date,
      isCurrentMonth: date.getMonth() === month,
      key: dateKey(date),
    };
  });
}

export const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const WEEKDAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
