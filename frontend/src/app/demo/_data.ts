export const DEMO_LICITACION = {
  numero: "IMSS-00-GYR-LAOS-001/2025",
  titulo: "Servicio de Seguridad Intramuros — 18 UMAE Región Centro-Sur",
  dependencia: "Instituto Mexicano del Seguro Social (IMSS)",
  monto: 124_500_000,
  apertura: "03 de junio de 2025",
  nivel: "oro" as const,
  score: 92,
  ptw_agresivo: 99_600_000,
  ptw_optimo: 109_560_000,
  ptw_conservador: 118_275_000,
  roi_segundos: 180,
  roi_ahorro: 25_200,
}

export const DEMO_RADAR = [
  {
    numero: "IMSS-00-GYR-LAOS-001/2025",
    titulo: "Servicio de Seguridad Intramuros — 18 UMAE Región Centro-Sur",
    dependencia: "IMSS",
    monto: 124_500_000,
    apertura: "03 jun 2025",
    match: true,
  },
  {
    numero: "SEDENA-OADPRS-LAO-011/2025",
    titulo: "Vigilancia y Rondines — Instalaciones Militares Zona Centro",
    dependencia: "SEDENA",
    monto: 89_200_000,
    apertura: "18 jun 2025",
    match: true,
  },
  {
    numero: "CAPUFE-OA-LAOS-007/2025",
    titulo: "Seguridad Perimetral — 12 Plazas de Cobro Autopistas del Centro",
    dependencia: "CAPUFE",
    monto: 67_800_000,
    apertura: "25 jun 2025",
    match: true,
  },
  {
    numero: "ISSSTE-DGA-LAOS-022/2025",
    titulo: "Servicio de Limpieza — 45 Clínicas Zona Norte",
    dependencia: "ISSSTE",
    monto: 34_000_000,
    apertura: "10 jul 2025",
    match: false,
    razon: "Sin match ADN — fuera de tu sector",
  },
  {
    numero: "CAPUFE-OA-LAOS-009/2025",
    titulo: "Mantenimiento Vial — Autopistas del Pacífico",
    dependencia: "CAPUFE",
    monto: 18_500_000,
    apertura: "15 jul 2025",
    match: false,
    razon: "Sin match ADN — rango fuera de techo",
  },
]

export const DEMO_LOADER_STEPS = [
  { label: "Leyendo bases de licitación (PDF, 248 páginas)…", dur: 1400 },
  { label: "Extrayendo requisitos técnicos, legales y financieros…", dur: 1200 },
  { label: "Construyendo matrices Humana · Materiales · Financiera…", dur: 1600 },
  { label: "Consultando 29 adjudicaciones históricas del IMSS…", dur: 1200 },
  { label: "Calculando escenarios Price to Win…", dur: 1000 },
  { label: "Evaluando nivel de complejidad: Bronce · Plata · Oro…", dur: 800 },
]

export const DEMO_MATRICES = {
  humana: ["450 elementos · 3 turnos", "REPSE vigente mínimo 12 meses", "ISO 9001 en reclutamiento"],
  materiales: ["Radios digitales encriptados", "Uniformes distintivos IMSS", "Vehículos de patrullaje"],
  financiera: ["Capital contable $18.7M mínimo", "Estados financieros 3 años", "Fianza 30% del monto"],
}

export const DEMO_RED_FLAGS = [
  { nivel: "alto" as const, texto: "REPSE vigente con antigüedad mínima 12 meses — verificar fecha de emisión" },
  { nivel: "alto" as const, texto: "ISO 9001:2015 debe cubrir específicamente reclutamiento de personal de seguridad" },
  { nivel: "medio" as const, texto: "Opinión positiva INFONAVIT aplica también a subcontratistas" },
]

export const DEMO_COMPETIDORES = [
  { nombre: "GSI – Grupo Seguridad Integral", contratos: 14, monto: "$118.4M", debilidad: "Precio alto · rotación elevada", bar: 85 },
  { nombre: "Securitas México", contratos: 9, monto: "$115.2M", debilidad: "Respuesta lenta en zonas rurales", bar: 70 },
  { nombre: "Pryse México", contratos: 6, monto: "$109.8M", debilidad: "Incumplimientos CDMX 2022", bar: 55 },
]

export const DEMO_DOCS = [
  { id: "acta", label: "Acta Constitutiva con poder notarial", estado: "ok" as const, nota: "Cumple requisito 3.1" },
  { id: "repse", label: "Constancia REPSE vigente (STPS)", estado: "ok" as const, nota: "Vigencia confirmada 18 meses" },
  { id: "iso", label: "Certificación ISO 9001:2015", estado: "ok" as const, nota: "Cubre reclutamiento de seguridad" },
  { id: "infonavit", label: "Opinión positiva INFONAVIT", estado: "flag" as const, nota: "No cubre subcontratistas — punto 4.2 lo exige" },
  { id: "banco", label: "Estado de cuenta bancario — últimos 3 meses", estado: "falta" as const, nota: "Capital mínimo $18.7M — punto 6.8" },
  { id: "fianza", label: "Fianza de sostenimiento — 5% del monto base", estado: "falta" as const, nota: "Emitida por institución autorizada SHCP · Punto 5.3" },
]

export const DEMO_ANEXO_REQUISITOS = [
  {
    numero: "3.1",
    texto: "El licitante deberá acreditar REPSE vigente con antigüedad mínima de 12 meses a la fecha de apertura de proposiciones, expedido por la STPS.",
    riesgo: "alto" as const,
    evidencia: "Constancia REPSE con fecha de emisión y folio STPS",
    cumple: true as const,
    nota: "Constancia vigente — emitida hace 18 meses",
  },
  {
    numero: "3.2",
    texto: "Certificación ISO 9001:2015 vigente que cubra específicamente los procesos de reclutamiento, selección y capacitación de personal de seguridad privada.",
    riesgo: "alto" as const,
    evidencia: "Certificado ISO con alcance en reclutamiento de seguridad",
    cumple: true as const,
    nota: "Cubre reclutamiento — verificar alcance exacto del certificado",
  },
  {
    numero: "4.2",
    texto: "Opinión de cumplimiento de obligaciones fiscales positiva ante el SAT artículo 32-D. Aplica también a subcontratistas directos.",
    riesgo: "alto" as const,
    evidencia: "Opinión SAT 32-D vigente — incluir subcontratistas",
    cumple: false as const,
    nota: "Falta opinión de subcontratista Servicios Auxiliares SA de CV",
  },
  {
    numero: "5.3",
    texto: "Fianza de sostenimiento del 5% del monto máximo de la propuesta económica, expedida por institución afianzadora autorizada por la SHCP.",
    riesgo: "medio" as const,
    evidencia: "Póliza de fianza de sostenimiento emitida por institución SHCP",
    cumple: null,
    nota: "",
  },
  {
    numero: "6.8",
    texto: "Acreditar capital contable mínimo de $18,700,000 MXN mediante estados financieros dictaminados por contador público certificado, con fecha no mayor a 12 meses.",
    riesgo: "medio" as const,
    evidencia: "Estados financieros dictaminados — capital contable ≥ $18.7M",
    cumple: null,
    nota: "",
  },
]

export const DISCLAIMER_CORTO =
  "Herramienta de apoyo estratégico. La presentación final es responsabilidad del participante."

export const DISCLAIMER_COMPLETO =
  "Este expediente es una guía preparada con inteligencia artificial como herramienta de apoyo. " +
  "LICIT-IA no garantiza adjudicación ni se responsabiliza por el resultado del proceso licitatorio. " +
  "El contenido debe ser revisado y validado por el área jurídica y directiva de su empresa antes de " +
  "presentarse ante la dependencia. La responsabilidad de la presentación recae exclusivamente en el participante."

export function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n)
}
