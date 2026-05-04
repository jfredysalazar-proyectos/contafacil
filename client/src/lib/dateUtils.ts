/**
 * Utilidades de fecha y hora con soporte de zona horaria (IANA).
 * Todas las funciones reciben un timezone IANA (ej: "America/Bogota").
 * Si no se proporciona, se usa "America/Bogota" como valor por defecto.
 */

export const DEFAULT_TIMEZONE = "America/Bogota";

// ─────────────────────────────────────────────────────────────
// Catálogo de países de América Latina + España + EE.UU.
// ─────────────────────────────────────────────────────────────
export interface TimezoneOption {
  country: string;
  city: string;
  timezone: string;
  offset: string; // Etiqueta visual (puede variar con horario de verano)
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  // América del Sur
  { country: "Colombia",          city: "Bogotá",           timezone: "America/Bogota",                    offset: "UTC-5" },
  { country: "Venezuela",         city: "Caracas",          timezone: "America/Caracas",                   offset: "UTC-4" },
  { country: "Ecuador",           city: "Quito",            timezone: "America/Guayaquil",                 offset: "UTC-5" },
  { country: "Perú",              city: "Lima",             timezone: "America/Lima",                      offset: "UTC-5" },
  { country: "Bolivia",           city: "La Paz",           timezone: "America/La_Paz",                    offset: "UTC-4" },
  { country: "Chile",             city: "Santiago",         timezone: "America/Santiago",                  offset: "UTC-4/-3" },
  { country: "Argentina",         city: "Buenos Aires",     timezone: "America/Argentina/Buenos_Aires",    offset: "UTC-3" },
  { country: "Uruguay",           city: "Montevideo",       timezone: "America/Montevideo",                offset: "UTC-3" },
  { country: "Paraguay",          city: "Asunción",         timezone: "America/Asuncion",                  offset: "UTC-4/-3" },
  { country: "Brasil",            city: "Brasilia",         timezone: "America/Sao_Paulo",                 offset: "UTC-3" },
  { country: "Brasil",            city: "Manaos",           timezone: "America/Manaus",                    offset: "UTC-4" },
  { country: "Guyana",            city: "Georgetown",       timezone: "America/Guyana",                    offset: "UTC-4" },
  { country: "Surinam",           city: "Paramaribo",       timezone: "America/Paramaribo",                offset: "UTC-3" },
  // América Central y Caribe
  { country: "Panamá",            city: "Ciudad de Panamá", timezone: "America/Panama",                    offset: "UTC-5" },
  { country: "Costa Rica",        city: "San José",         timezone: "America/Costa_Rica",                offset: "UTC-6" },
  { country: "Nicaragua",         city: "Managua",          timezone: "America/Managua",                   offset: "UTC-6" },
  { country: "Honduras",          city: "Tegucigalpa",      timezone: "America/Tegucigalpa",               offset: "UTC-6" },
  { country: "El Salvador",       city: "San Salvador",     timezone: "America/El_Salvador",               offset: "UTC-6" },
  { country: "Guatemala",         city: "Ciudad de Guatemala", timezone: "America/Guatemala",              offset: "UTC-6" },
  { country: "Belice",            city: "Belmopán",         timezone: "America/Belize",                    offset: "UTC-6" },
  { country: "Cuba",              city: "La Habana",        timezone: "America/Havana",                    offset: "UTC-5/-4" },
  { country: "República Dominicana", city: "Santo Domingo", timezone: "America/Santo_Domingo",             offset: "UTC-4" },
  { country: "Puerto Rico",       city: "San Juan",         timezone: "America/Puerto_Rico",               offset: "UTC-4" },
  { country: "Jamaica",           city: "Kingston",         timezone: "America/Jamaica",                   offset: "UTC-5" },
  { country: "Haití",             city: "Puerto Príncipe",  timezone: "America/Port-au-Prince",            offset: "UTC-5/-4" },
  // México
  { country: "México",            city: "Ciudad de México", timezone: "America/Mexico_City",               offset: "UTC-6/-5" },
  { country: "México",            city: "Cancún",           timezone: "America/Cancun",                    offset: "UTC-5" },
  { country: "México",            city: "Monterrey",        timezone: "America/Monterrey",                 offset: "UTC-6/-5" },
  { country: "México",            city: "Hermosillo",       timezone: "America/Hermosillo",                offset: "UTC-7" },
  { country: "México",            city: "Tijuana",          timezone: "America/Tijuana",                   offset: "UTC-8/-7" },
  // Estados Unidos
  { country: "Estados Unidos",    city: "Nueva York",       timezone: "America/New_York",                  offset: "UTC-5/-4" },
  { country: "Estados Unidos",    city: "Chicago",          timezone: "America/Chicago",                   offset: "UTC-6/-5" },
  { country: "Estados Unidos",    city: "Denver",           timezone: "America/Denver",                    offset: "UTC-7/-6" },
  { country: "Estados Unidos",    city: "Los Ángeles",      timezone: "America/Los_Angeles",               offset: "UTC-8/-7" },
  { country: "Estados Unidos",    city: "Phoenix",          timezone: "America/Phoenix",                   offset: "UTC-7" },
  { country: "Estados Unidos",    city: "Anchorage",        timezone: "America/Anchorage",                 offset: "UTC-9/-8" },
  { country: "Estados Unidos",    city: "Honolulu",         timezone: "Pacific/Honolulu",                  offset: "UTC-10" },
  // Canadá
  { country: "Canadá",            city: "Toronto",          timezone: "America/Toronto",                   offset: "UTC-5/-4" },
  { country: "Canadá",            city: "Vancouver",        timezone: "America/Vancouver",                 offset: "UTC-8/-7" },
  // España
  { country: "España",            city: "Madrid",           timezone: "Europe/Madrid",                     offset: "UTC+1/+2" },
  { country: "España",            city: "Canarias",         timezone: "Atlantic/Canary",                   offset: "UTC+0/+1" },
  // Portugal
  { country: "Portugal",          city: "Lisboa",           timezone: "Europe/Lisbon",                     offset: "UTC+0/+1" },
];

// ─────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────

/**
 * Formatea una fecha mostrando solo día/mes/año en la zona horaria del usuario.
 * Equivalente a toLocaleDateString("es-CO") pero con timezone correcto.
 */
export function formatDate(date: Date | string | null | undefined, timezone: string = DEFAULT_TIMEZONE): string {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("es-CO", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(date));
  } catch {
    return new Date(date).toLocaleDateString("es-CO");
  }
}

/**
 * Formatea una fecha mostrando día/mes/año y hora:minutos en la zona horaria del usuario.
 */
export function formatDateTime(date: Date | string | null | undefined, timezone: string = DEFAULT_TIMEZONE): string {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("es-CO", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  } catch {
    return new Date(date).toLocaleString("es-CO");
  }
}

/**
 * Formatea una fecha con nombre del mes largo en la zona horaria del usuario.
 * Ej: "15 de enero de 2025"
 */
export function formatDateLong(date: Date | string | null | undefined, timezone: string = DEFAULT_TIMEZONE): string {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("es-CO", {
      timeZone: timezone,
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  } catch {
    return new Date(date).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
  }
}

/**
 * Devuelve la fecha actual en formato yyyy-MM-dd según la zona horaria del usuario.
 * Útil para inicializar inputs type="date".
 */
export function todayInTimezone(timezone: string = DEFAULT_TIMEZONE): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const y = parts.find(p => p.type === "year")?.value ?? "";
    const m = parts.find(p => p.type === "month")?.value ?? "";
    const d = parts.find(p => p.type === "day")?.value ?? "";
    return `${y}-${m}-${d}`;
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

/**
 * Convierte un string yyyy-MM-dd (de un input type="date") a un objeto Date
 * interpretado como medianoche en la zona horaria del usuario.
 * Evita el desfase de un día que ocurre con new Date("yyyy-MM-dd") (que asume UTC).
 */
export function parseDateInput(dateStr: string, timezone: string = DEFAULT_TIMEZONE): Date {
  if (!dateStr) return new Date();
  try {
    // Construir la fecha como medianoche en el timezone del usuario
    const [year, month, day] = dateStr.split("-").map(Number);
    // Usar Temporal-like approach via toLocaleString trick
    const tempDate = new Date(`${dateStr}T12:00:00`); // mediodía UTC para evitar ambigüedades
    // Ajustar al timezone correcto
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    // Verificar que la fecha formateada coincide con lo pedido
    const formatted = formatter.format(tempDate);
    const [fy, fm, fd] = formatted.split("-").map(Number);
    if (fy === year && fm === month && fd === day) {
      return tempDate;
    }
    // Fallback: construir directamente
    return new Date(year, month - 1, day, 12, 0, 0);
  } catch {
    return new Date(dateStr);
  }
}

/**
 * Devuelve la etiqueta de visualización de una zona horaria.
 * Ej: "Colombia — Bogotá (UTC-5)"
 */
export function getTimezoneLabel(timezone: string): string {
  const option = TIMEZONE_OPTIONS.find(o => o.timezone === timezone);
  if (option) {
    return `${option.country} — ${option.city} (${option.offset})`;
  }
  return timezone;
}
