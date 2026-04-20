"use client"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"

// ─── Comparison data ─────────────────────────────────────────────────────────

const COMPARACION = [
  {
    feature: "Detecta si puedes ganar (no solo si existe)",
    licit: true as const, buscadores: false as const, consultoras: "parcial" as const,
  },
  {
    feature: "Lee y analiza los PDFs de bases completas",
    licit: true as const, buscadores: false as const, consultoras: true as const,
  },
  {
    feature: "Identifica \"candados\" (requisitos trampa)",
    licit: true as const, buscadores: false as const, consultoras: "parcial" as const,
  },
  {
    feature: "Cruza bases contra tu ADN corporativo",
    licit: true as const, buscadores: false as const, consultoras: false as const,
  },
  {
    feature: "Price to Win con historial de competidores",
    licit: true as const, buscadores: false as const, consultoras: false as const,
  },
  {
    feature: "Resultado en minutos (no días)",
    licit: true as const, buscadores: "alerta" as const, consultoras: false as const,
  },
  {
    feature: "Genera el expediente completo automáticamente",
    licit: true as const, buscadores: false as const, consultoras: false as const,
  },
  {
    feature: "Memoria histórica de 10,000+ licitaciones",
    licit: true as const, buscadores: "parcial" as const, consultoras: false as const,
  },
]

const DIFERENCIADORES = [
  {
    icon: "🔍",
    titulo: "Auditoría de Candados",
    tagline: "La competencia te da el PDF. Nosotros lo interrogamos.",
    detalle:
      "LICIT-IA busca en segundos los requisitos técnicos \"sembrados\" en la página 114 que están diseñados para descalificarte y beneficiar a tu rival. Lo que un abogado junior tarda 4 días en detectar, nosotros lo marcamos en 45 segundos.",
    stat: "45 seg",
    stat_label: "vs 4 días de revisión manual",
    color: "from-blue-500/20 to-blue-600/5 border-blue-500/30",
    icon_bg: "bg-blue-500/20 text-blue-400",
  },
  {
    icon: "🧬",
    titulo: "ADN Corporativo",
    tagline: "La competencia no sabe quién eres. LICIT-IA vive dentro de tu empresa.",
    detalle:
      "Cruzamos cada base de licitación contra tu capacidad real: REPSE, estados de fuerza, liquidez, contratos previos. No solo te decimos que existe la licitación — te decimos si tu empresa está lista para ganarla hoy, o qué necesitas antes de participar.",
    stat: "100%",
    stat_label: "análisis personalizado por empresa",
    color: "from-purple-500/20 to-purple-600/5 border-purple-500/30",
    icon_bg: "bg-purple-500/20 text-purple-400",
  },
  {
    icon: "🎯",
    titulo: "Price to Win",
    tagline: "No adivines tu margen. Usa teoría de juegos.",
    detalle:
      "Modelamos el comportamiento histórico de precios de tus rivales específicos — GSI, Securitas, Pryse. LICIT-IA te da el punto exacto de oferta para ganar la partida por centavos sin sacrificar tu utilidad. Estrategia de mañana, no Excel de ayer.",
    stat: "3 escenarios",
    stat_label: "conservador · óptimo · agresivo",
    color: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/30",
    icon_bg: "bg-emerald-500/20 text-emerald-400",
  },
  {
    icon: "📋",
    titulo: "Copiloto de Expediente",
    tagline: "Requisito por requisito. Sin que se te escape ninguno.",
    detalle:
      "Extraemos cada punto numerado del Anexo Técnico tal como aparece en las bases —  3.1, IV.2.a, punto 6.8 — y te presentamos una revisión punto por punto: ¿Cumples? ¿No cumples? ¿Tienes la evidencia? Cuando terminas, descargas tu expediente completo con tu revisión integrada.",
    stat: "30+",
    stat_label: "requisitos extraídos automáticamente",
    color: "from-orange-500/20 to-orange-600/5 border-orange-500/30",
    icon_bg: "bg-orange-500/20 text-orange-400",
  },
]

const COMPETIDORES = [
  {
    nombre: "Buscadores de palabras clave",
    ejemplos: "Licitaciones.info · Tenders.mx · MasLicitaciones",
    costo: "$2k–$5k / mes",
    promesa: "Alertas por email si aparece tu palabra clave",
    falla: "No leen los PDFs. Te avisan que existe la licitación, pero no que no puedes ganarla. Haces gastar 3 días a tu equipo legal para descubrir al final que pedían una fianza que no tienes.",
    icon: "📧",
  },
  {
    nombre: "Consultoras y despachos",
    ejemplos: "Revisión manual · Abogados junior · Pauta por hora",
    costo: "$50k–$150k / proyecto",
    promesa: "Revisión humana de las bases de licitación",
    falla: "Son lentos (3–5 días) y el error humano es altísimo. Sin memoria histórica de precios de competidores a menos que sea de sus propios clientes. Sin garantía tecnológica.",
    icon: "⚖️",
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Check({ ok }: { ok: boolean | "parcial" | "alerta" }) {
  if (ok === true) return <span className="text-emerald-400 font-bold text-base">✓</span>
  if (ok === "parcial") return <span className="text-yellow-400 text-xs font-medium">parcial</span>
  if (ok === "alerta") return <span className="text-yellow-400 text-xs font-medium">solo alerta</span>
  return <span className="text-gray-600 text-base">✗</span>
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true) },
      { threshold }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useInView()
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

// ─── Sections ────────────────────────────────────────────────────────────────

function NavBar() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", h)
    return () => window.removeEventListener("scroll", h)
  }, [])

  return (
    <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-gray-950/95 backdrop-blur-md border-b border-gray-800/80 shadow-xl" : ""}`}>
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-black text-xl tracking-tight text-white">LICIT<span className="text-blue-400">-IA</span></span>
          <span className="hidden sm:block text-xs text-gray-600 ml-1">by Inteligencia en Licitaciones S.A. de C.V.</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/demo"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <span>⚡</span> Ver demo
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Iniciar sesión →
          </Link>
        </div>
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-blue-300 text-sm font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          Inteligencia artificial para licitaciones públicas en México
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
          La competencia te dice<br />
          <span className="text-gray-500">que existe la licitación.</span>
          <br />
          <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            LICIT-IA te dice si puedes ganarla.
          </span>
        </h1>

        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          En 3 minutos leemos las bases completas en PDF, extraemos cada requisito numerado del Anexo Técnico, detectamos los candados que descalifican, calculamos tu Price to Win y generamos el expediente listo para revisar punto por punto.
          <span className="text-white font-medium"> Sin abogados. Sin Excel. Sin adivinar.</span>
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/demo"
            className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 text-base"
          >
            <span className="text-xl">⚡</span>
            <span>Ver demo en vivo</span>
            <span className="text-blue-200 group-hover:translate-x-1 transition-transform">→</span>
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white font-semibold px-8 py-4 rounded-xl transition-colors text-base"
          >
            Solicitar acceso
          </Link>
        </div>

        {/* Proof bar */}
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-center">
          {[
            { stat: "3 min", label: "Análisis completo de bases" },
            { stat: "30+", label: "Requisitos del Anexo extraídos" },
            { stat: "3", label: "Escenarios Price to Win" },
            { stat: "100%", label: "Análisis personalizado por empresa" },
          ].map((s) => (
            <div key={s.stat} className="flex flex-col">
              <span className="text-2xl font-black text-white">{s.stat}</span>
              <span className="text-xs text-gray-500 mt-0.5">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ProblemaSection() {
  return (
    <section className="py-24 px-6 border-t border-gray-800">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <div className="text-center mb-16">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">El problema del mercado</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              Tu competencia actual está obsoleta.
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Dos opciones en el mercado. Ninguna te dice lo que realmente necesitas saber.
            </p>
          </div>
        </FadeIn>

        <div className="grid sm:grid-cols-2 gap-6 mb-12">
          {COMPETIDORES.map((c, i) => (
            <FadeIn key={c.nombre} delay={i * 150}>
              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 h-full">
                <div className="flex items-start gap-4 mb-4">
                  <div className="text-3xl">{c.icon}</div>
                  <div>
                    <div className="text-white font-bold text-lg">{c.nombre}</div>
                    <div className="text-gray-600 text-xs mt-0.5">{c.ejemplos}</div>
                    <div className="inline-block bg-gray-800 text-gray-400 text-xs rounded px-2 py-0.5 mt-2">{c.costo}</div>
                  </div>
                </div>
                <div className="mb-3">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Lo que prometen</span>
                  <p className="text-gray-300 text-sm mt-1">{c.promesa}</p>
                </div>
                <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-4">
                  <span className="text-xs text-red-400 font-semibold uppercase tracking-wider">Su falla fatal</span>
                  <p className="text-gray-300 text-sm mt-1.5 leading-relaxed">{c.falla}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn>
          <div className="text-center bg-gray-900/40 border border-gray-800 rounded-2xl p-8">
            <p className="text-gray-400 text-lg leading-relaxed max-w-3xl mx-auto">
              Las plataformas baratas son <span className="text-white font-semibold">bibliotecas digitales</span>. Las consultoras son <span className="text-white font-semibold">lentas y caras</span>.
              Ninguna te dice si <span className="text-white font-semibold">tú específicamente</span> puedes ganar esa licitación hoy.
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

function DiferenciadoresSection() {
  return (
    <section className="py-24 px-6 border-t border-gray-800">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <div className="text-center mb-16">
            <p className="text-xs text-blue-400 uppercase tracking-widest mb-3">Por qué LICIT-IA gana</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              Tres ventajas que no tienen tus rivales.
            </h2>
          </div>
        </FadeIn>

        <div className="space-y-6">
          {DIFERENCIADORES.map((d, i) => (
            <FadeIn key={d.titulo} delay={i * 120}>
              <div className={`relative bg-gradient-to-br ${d.color} border rounded-2xl p-8`}>
                <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                  <div className={`w-14 h-14 rounded-2xl ${d.icon_bg} flex items-center justify-center text-2xl flex-shrink-0`}>
                    {d.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-start gap-3 mb-2">
                      <h3 className="text-xl font-black text-white">{d.titulo}</h3>
                      <div className="flex items-baseline gap-1.5 bg-gray-950/60 rounded-lg px-3 py-1">
                        <span className="text-white font-black text-lg">{d.stat}</span>
                        <span className="text-gray-500 text-xs">{d.stat_label}</span>
                      </div>
                    </div>
                    <p className="text-gray-300 font-medium text-sm mb-3 italic">"{d.tagline}"</p>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">{d.detalle}</p>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

function ComparacionSection() {
  return (
    <section className="py-24 px-6 border-t border-gray-800">
      <div className="max-w-5xl mx-auto">
        <FadeIn>
          <div className="text-center mb-12">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Comparativa directa</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Sin letra pequeña.</h2>
            <p className="text-gray-400 max-w-lg mx-auto text-sm">
              Lo que realmente importa para ganar una licitación pública en México.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={100}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-6 py-4 text-gray-500 font-medium text-xs uppercase tracking-wide w-1/2">Capacidad</th>
                  <th className="px-4 py-4 text-center">
                    <div className="font-black text-white text-sm">LICIT<span className="text-blue-400">-IA</span></div>
                  </th>
                  <th className="px-4 py-4 text-center hidden sm:table-cell">
                    <div className="font-medium text-gray-500 text-xs">Buscadores</div>
                  </th>
                  <th className="px-4 py-4 text-center hidden md:table-cell">
                    <div className="font-medium text-gray-500 text-xs">Consultoras</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARACION.map((row, i) => (
                  <tr key={i} className={`border-b border-gray-800/50 last:border-0 ${i % 2 === 0 ? "" : "bg-gray-900/30"}`}>
                    <td className="px-6 py-3.5 text-gray-300 text-sm">{row.feature}</td>
                    <td className="px-4 py-3.5 text-center bg-blue-500/5">
                      <Check ok={row.licit} />
                    </td>
                    <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                      <Check ok={row.buscadores} />
                    </td>
                    <td className="px-4 py-3.5 text-center hidden md:table-cell">
                      <Check ok={row.consultoras} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

function DemoSection() {
  return (
    <section className="py-24 px-6 border-t border-gray-800">
      <div className="max-w-4xl mx-auto">
        <FadeIn>
          <div className="relative bg-gradient-to-br from-blue-900/30 to-gray-900 border border-blue-500/20 rounded-3xl p-10 sm:p-16 text-center overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f608_1px,transparent_1px),linear-gradient(to_bottom,#3b82f608_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />
            <div className="relative">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-blue-500/20 border border-blue-500/30 text-4xl mb-6">⚡</div>
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
                Míralo funcionar ahora.
              </h2>
              <p className="text-gray-400 max-w-lg mx-auto mb-8 leading-relaxed">
                Demo en vivo: licitación IMSS de $124.5M en servicios de seguridad. Sin registro, sin tarjeta. Ve exactamente lo que tu empresa vería el día 1.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/demo"
                  className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-bold px-10 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/40 hover:shadow-blue-500/50 text-lg"
                >
                  <span>⚡</span>
                  <span>Iniciar demo</span>
                  <span className="text-blue-200 group-hover:translate-x-1 transition-transform">→</span>
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors font-medium py-4 px-6 text-sm"
                >
                  Ya tengo cuenta → entrar al sistema
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-gray-800 py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="font-black text-white">LICIT<span className="text-blue-400">-IA</span></span>
          <p className="text-gray-600 text-xs mt-1">© 2024 · Inteligencia artificial para licitaciones públicas en México</p>
        </div>
        <div className="flex items-center gap-6 text-xs text-gray-600">
          <Link href="/demo" className="hover:text-gray-400 transition-colors">Demo</Link>
          <Link href="/login" className="hover:text-gray-400 transition-colors">Iniciar sesión</Link>
          <span>contacto@licit-ia.mx</span>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="bg-gray-950 text-white min-h-screen">
      <NavBar />
      <Hero />
      <ProblemaSection />
      <DiferenciadoresSection />
      <ComparacionSection />
      <DemoSection />
      <Footer />
    </div>
  )
}
