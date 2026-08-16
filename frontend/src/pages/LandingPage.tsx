import { useEffect, useRef, useState, type FC, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ScanLine, ShieldCheck, Eye, Zap, Layers, Activity, GitBranch, Mail,
  ArrowRight, ArrowUpRight, Cpu, Database, Server, Boxes,
  Stethoscope, GraduationCap, FlaskConical, ChevronDown, Check,
} from 'lucide-react';
import { Logo, LogoMark } from '../components/brand/Logo';

/* ── Reveal on scroll (progressive enhancement) ───────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    el.querySelectorAll('.reveal').forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);
  return ref;
}

/* ── Small primitives ─────────────────────────────────────────────────── */
const Eyebrow: FC<{ children: ReactNode; num?: string }> = ({ children, num }) => (
  <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-brand-cyan">
    {num && <span className="text-brand-gray">{num}</span>}
    <span className="w-6 h-px bg-brand-cyan/50" />
    {children}
  </span>
);

const SectionShell: FC<{ id: string; children: ReactNode; className?: string }> = ({ id, children, className = '' }) => (
  <section id={id} className={`w-full px-6 md:px-10 lg:px-16 py-20 md:py-28 ${className}`}>
    <div className="mx-auto max-w-6xl">{children}</div>
  </section>
);

/* ── Hero diagnostic viewer (signature element) ───────────────────────── */
const DiagnosticViewer: FC = () => (
  <div className="relative aspect-square w-full max-w-md mx-auto select-none">
    {/* Marco del visor */}
    <div className="absolute inset-0 rounded-2xl border border-brand-cyan/25 bg-primary/60 backdrop-blur-sm overflow-hidden reticle-grid">
      {/* Silueta de radiografía de tórax (sintética) */}
      <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full opacity-60">
        <g fill="none" stroke="#8ea9c9" strokeWidth="1.4" strokeLinecap="round">
          <path d="M100 34 v96" />
          <path d="M100 46 q-30 4 -44 30 M100 46 q30 4 44 30" />
          <path d="M100 62 q-34 8 -46 40 M100 62 q34 8 46 40" />
          <path d="M100 80 q-36 10 -44 46 M100 80 q36 10 44 46" />
          <path d="M100 98 q-34 12 -40 48 M100 98 q34 12 40 48" />
          <ellipse cx="66" cy="112" rx="30" ry="46" opacity="0.35" />
          <ellipse cx="134" cy="112" rx="30" ry="46" opacity="0.35" />
        </g>
      </svg>
      {/* Bloom de heatmap Grad-CAM sobre la zona "anómala" */}
      <div
        className="heat-bloom absolute rounded-full"
        style={{
          width: 84, height: 84, right: 34, top: 78,
          background: 'radial-gradient(circle, rgba(239,68,68,0.85) 0%, rgba(245,158,11,0.5) 45%, rgba(0,194,203,0) 72%)',
        }}
      />
      {/* Línea de escaneo */}
      <div className="hero-scan-line absolute left-0 top-0 h-8 w-full bg-gradient-to-b from-brand-cyan/25 to-transparent" />
      {/* Corchetes de retícula sobre la anomalía */}
      <div className="absolute" style={{ right: 44, top: 88 }}>
        <div className="relative w-16 h-16">
          <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-danger" />
          <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-danger" />
          <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-danger" />
          <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-danger" />
        </div>
      </div>
    </div>
    {/* Panel de lectura tipo consola */}
    <div className="absolute -bottom-5 -left-5 md:-left-8 bg-white dark:bg-primary-light rounded-xl border border-brand-gray/15 shadow-xl p-3.5 font-mono text-[10px] w-44">
      <div className="flex items-center justify-between text-brand-gray">
        <span>CLASE</span>
        <span className="text-danger font-bold">ANOMALÍA</span>
      </div>
      <div className="flex items-center justify-between text-brand-gray mt-1.5">
        <span>CONFIANZA</span>
        <span className="text-brand-deep dark:text-white font-bold">0.94</span>
      </div>
      <div className="flex items-center justify-between text-brand-gray mt-1.5">
        <span>LATENCIA</span>
        <span className="text-brand-deep dark:text-white font-bold">112 ms</span>
      </div>
      <div className="mt-2 h-1 rounded-full bg-brand-gray/15 overflow-hidden">
        <div className="h-full w-[94%] bg-brand-cyan" />
      </div>
    </div>
  </div>
);

/* ── Content data ─────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: Eye, title: 'Explicabilidad Grad-CAM', body: 'Cada predicción viene con un mapa de calor que muestra exactamente qué región de la imagen motivó el diagnóstico. Sin cajas negras.' },
  { icon: Zap, title: 'Inferencia sub-150 ms', body: 'Backbone EfficientNet-B4 optimizado para CPU. Resultados en tiempo clínico, sin depender de GPU dedicada.' },
  { icon: Layers, title: 'DICOM y estándar', body: 'Carga nativa de estudios DICOM (pydicom + SimpleITK) además de PNG/JPEG, con anonimización automática de metadatos.' },
  { icon: ShieldCheck, title: 'Ley 1581 por diseño', body: 'Anonimización de PII, trazabilidad de auditoría y control de acceso por rol integrados desde la arquitectura.' },
  { icon: Activity, title: 'Active learning', body: 'El feedback del especialista se registra en PostgreSQL y realimenta el reentrenamiento del modelo.' },
  { icon: Cpu, title: 'MLOps con MLflow', body: 'Versionado de modelos, métricas y registro de experimentos. Despliegue reproducible en Render o Docker.' },
];

const STEPS = [
  { n: '01', title: 'Carga el estudio', body: 'Arrastra una radiografía DICOM o estándar. Se anonimiza y normaliza automáticamente.' },
  { n: '02', title: 'Inferencia del modelo', body: 'EfficientNet-B4 clasifica normal vs. anomalía con una probabilidad calibrada.' },
  { n: '03', title: 'Explicación visual', body: 'Grad-CAM genera el mapa de calor superpuesto sobre la región relevante.' },
  { n: '04', title: 'Validación y reporte', body: 'El especialista confirma o corrige; se emite un reporte PDF y queda en el historial.' },
];

const PIPELINE = [
  { icon: Layers, label: 'Preprocesador DICOM', sub: 'anonimiza · normaliza' },
  { icon: Boxes, label: 'EfficientNet-B4', sub: 'backbone + Focal Loss' },
  { icon: Eye, label: 'Grad-CAM', sub: 'explicabilidad XAI' },
  { icon: Server, label: 'FastAPI', sub: 'API REST + Gradio' },
  { icon: Database, label: 'PostgreSQL + MLflow', sub: 'feedback · versionado' },
];

const USE_CASES = [
  { icon: Stethoscope, title: 'Apoyo al radiólogo', body: 'Segunda lectura automática que prioriza estudios con hallazgos y reduce tiempo de reporte.' },
  { icon: GraduationCap, title: 'Docencia médica', body: 'Los mapas de calor hacen visible el razonamiento del modelo, útil para formación en imagenología.' },
  { icon: FlaskConical, title: 'Investigación clínica', body: 'Registro reproducible de experimentos y métricas para estudios sobre detección asistida por IA.' },
];

const FAQ = [
  { q: '¿MedVision AI reemplaza al radiólogo?', a: 'No. Es una herramienta de apoyo diagnóstico. Toda predicción requiere validación de un especialista; el sistema está diseñado como segunda lectura, no como decisión final.' },
  { q: '¿Qué modelo usa por debajo?', a: 'Un clasificador basado en EfficientNet-B4 preentrenado, adaptado a un canal (escala de grises) y entrenado con Focal Loss para manejar el desbalance de clases típico en imagen médica.' },
  { q: '¿Cómo protege los datos del paciente?', a: 'Los metadatos DICOM se anonimizan en el preprocesamiento (se eliminan campos PII) antes de cualquier inferencia o almacenamiento, en cumplimiento de la Ley 1581 de 2012.' },
  { q: '¿Por qué la explicabilidad es importante?', a: 'Un diagnóstico asistido solo es confiable si se puede auditar. Grad-CAM muestra la evidencia visual detrás de cada predicción, permitiendo al especialista aceptarla o descartarla con criterio.' },
  { q: '¿Se puede desplegar en producción?', a: 'Sí. Incluye configuración para Docker Compose (API, PostgreSQL, MinIO, MLflow) y despliegue directo en Render con requisitos optimizados para CPU.' },
];

const TEAM = [
  { name: 'Manuel J. Sanabria Gil', role: 'Autor · ML & Full-Stack', icon: Cpu },
  { name: 'Asesoría Clínica', role: 'Validación radiológica', icon: Stethoscope },
  { name: 'Asesoría MLOps', role: 'Arquitectura & despliegue', icon: Server },
];

const REPO_URL = 'https://github.com/';

/* ── Landing nav ──────────────────────────────────────────────────────── */
const NAV = [
  { href: '#caracteristicas', label: 'Características' },
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#arquitectura', label: 'Arquitectura' },
  { href: '#casos', label: 'Casos de uso' },
  { href: '#faq', label: 'FAQ' },
];

const LandingNav: FC = () => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-primary/85 backdrop-blur-md border-b border-white/10' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto max-w-6xl px-6 md:px-10 h-16 flex items-center justify-between text-white">
        <a href="#inicio" className="text-white"><Logo variant="full" size={24} /></a>
        <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-300">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="hover:text-brand-cyan transition-colors">{n.label}</a>
          ))}
        </nav>
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-cyan text-primary text-xs font-bold hover:bg-brand-cyan/90 transition-colors"
        >
          Entrar <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </header>
  );
};

/* ── FAQ accordion item ───────────────────────────────────────────────── */
const FaqItem: FC<{ q: string; a: string }> = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-brand-gray/15">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left cursor-pointer group"
        aria-expanded={open}
      >
        <span className="font-sans font-bold text-brand-deep dark:text-white text-sm md:text-base group-hover:text-brand-cyan transition-colors">{q}</span>
        <ChevronDown className={`w-5 h-5 text-brand-cyan shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="pb-5 -mt-1 text-sm text-brand-gray leading-relaxed max-w-3xl">{a}</p>}
    </div>
  );
};

/* ── Page ─────────────────────────────────────────────────────────────── */
export const LandingPage: FC = () => {
  const revealRef = useReveal();

  return (
    <div ref={revealRef} className="bg-brand-white dark:bg-primary text-brand-deep dark:text-white font-sans overflow-x-hidden">
      <LandingNav />

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section id="inicio" className="relative pt-28 pb-24 md:pt-36 md:pb-32 px-6 md:px-10 lg:px-16 bg-primary text-white overflow-hidden">
        <div className="absolute inset-0 reticle-grid opacity-40" />
        <div className="absolute top-[-10%] right-[-5%] w-[45%] h-[70%] rounded-full bg-brand-cyan/10 blur-[130px] pointer-events-none" />
        <div className="relative mx-auto max-w-6xl grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Eyebrow>Detección de anomalías explicable</Eyebrow>
              <h1 className="mt-6 font-black tracking-tight leading-[1.02] text-4xl md:text-5xl lg:text-6xl">
                IA que muestra{' '}
                <span className="text-brand-cyan">dónde</span> mira.
              </h1>
              <p className="mt-6 text-slate-300 text-base md:text-lg leading-relaxed max-w-xl">
                MedVision AI detecta anomalías en radiografías e imágenes DICOM y superpone un mapa de calor Grad-CAM sobre la evidencia. Apoyo diagnóstico auditable, no una caja negra.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-cyan text-primary font-bold text-sm hover:bg-brand-cyan/90 transition-colors shadow-lg shadow-brand-cyan/20">
                  Probar la demo clínica <ArrowRight className="w-4 h-4" />
                </Link>
                <a href="#arquitectura" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 text-white font-semibold text-sm hover:bg-white/5 transition-colors">
                  Ver la arquitectura
                </a>
              </div>
              {/* Trust stats — lectura tipo instrumento */}
              <div className="mt-12 grid grid-cols-3 gap-6 max-w-md font-mono">
                {[['87.4%', 'AUC-ROC'], ['<150ms', 'Inferencia'], ['100%', 'Explicable']].map(([v, l]) => (
                  <div key={l}>
                    <div className="text-2xl md:text-3xl font-black text-white">{v}</div>
                    <div className="text-[10px] uppercase tracking-widest text-brand-gray mt-1">{l}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.15 }}>
            <DiagnosticViewer />
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────── */}
      <SectionShell id="caracteristicas">
        <div className="reveal">
          <Eyebrow num="01">Características</Eyebrow>
          <h2 className="mt-5 text-3xl md:text-4xl font-black tracking-tight max-w-2xl">Diseñado para el criterio clínico, no para reemplazarlo.</h2>
        </div>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="reveal group p-6 rounded-2xl border border-brand-gray/15 bg-white dark:bg-primary-light hover:border-brand-cyan/40 transition-colors">
              <div className="w-11 h-11 rounded-xl bg-brand-cyan/10 text-brand-cyan flex items-center justify-center border border-brand-cyan/20 group-hover:scale-110 transition-transform">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="mt-5 font-bold text-brand-deep dark:text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-brand-gray leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </SectionShell>

      {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
      <SectionShell id="como-funciona" className="bg-white dark:bg-primary-light/40">
        <div className="reveal">
          <Eyebrow num="02">Cómo funciona</Eyebrow>
          <h2 className="mt-5 text-3xl md:text-4xl font-black tracking-tight max-w-2xl">De la imagen al diagnóstico auditable en cuatro pasos.</h2>
        </div>
        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((s) => (
            <div key={s.n} className="reveal relative">
              <div className="font-mono text-brand-cyan text-sm font-bold">{s.n}</div>
              <div className="mt-3 h-px w-full bg-gradient-to-r from-brand-cyan/40 to-transparent" />
              <h3 className="mt-4 font-bold text-brand-deep dark:text-white">{s.title}</h3>
              <p className="mt-2 text-sm text-brand-gray leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </SectionShell>

      {/* ── ARCHITECTURE ────────────────────────────────────────────── */}
      <SectionShell id="arquitectura">
        <div className="reveal">
          <Eyebrow num="03">Arquitectura</Eyebrow>
          <h2 className="mt-5 text-3xl md:text-4xl font-black tracking-tight max-w-2xl">Un pipeline reproducible, de extremo a extremo.</h2>
          <p className="mt-4 text-brand-gray max-w-2xl text-sm md:text-base">Cada componente es independiente y auditable. La misma ruta corre en local (Docker Compose) y en producción (Render).</p>
        </div>
        <div className="reveal mt-14 flex flex-col lg:flex-row items-stretch gap-3">
          {PIPELINE.map((p, i) => (
            <div key={p.label} className="flex-1 flex items-center gap-3">
              <div className="flex-1 p-5 rounded-2xl border border-brand-gray/15 bg-white dark:bg-primary-light text-center">
                <div className="w-10 h-10 mx-auto rounded-lg bg-brand-deep/5 dark:bg-white/5 text-brand-cyan flex items-center justify-center">
                  <p.icon className="w-5 h-5" />
                </div>
                <div className="mt-3 font-bold text-xs text-brand-deep dark:text-white">{p.label}</div>
                <div className="mt-1 font-mono text-[10px] text-brand-gray">{p.sub}</div>
              </div>
              {i < PIPELINE.length - 1 && (
                <ArrowRight className="hidden lg:block w-4 h-4 text-brand-cyan shrink-0" />
              )}
            </div>
          ))}
        </div>
      </SectionShell>

      {/* ── DEMO ────────────────────────────────────────────────────── */}
      <SectionShell id="demo" className="bg-primary text-white">
        <div className="reveal relative rounded-3xl border border-brand-cyan/20 bg-primary-light/40 reticle-grid overflow-hidden p-10 md:p-16 text-center">
          <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[60%] h-[80%] rounded-full bg-brand-cyan/10 blur-[120px] pointer-events-none" />
          <div className="relative">
            <LogoMark size={44} className="mx-auto text-white" />
            <h2 className="mt-6 text-3xl md:text-4xl font-black tracking-tight">Compruébalo con un estudio real.</h2>
            <p className="mt-4 text-slate-300 max-w-xl mx-auto text-sm md:text-base">Entra al panel clínico, carga una imagen y observa la predicción con su mapa de calor en tiempo real. Incluye cuentas de demostración.</p>
            <Link to="/login" className="mt-8 inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-brand-cyan text-primary font-bold text-sm hover:bg-brand-cyan/90 transition-colors">
              <ScanLine className="w-4 h-4" /> Abrir el panel clínico
            </Link>
          </div>
        </div>
      </SectionShell>

      {/* ── USE CASES ───────────────────────────────────────────────── */}
      <SectionShell id="casos" className="bg-white dark:bg-primary-light/40">
        <div className="reveal">
          <Eyebrow num="04">Casos de uso</Eyebrow>
          <h2 className="mt-5 text-3xl md:text-4xl font-black tracking-tight max-w-2xl">Donde la evidencia visual cambia la decisión.</h2>
        </div>
        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {USE_CASES.map((u) => (
            <div key={u.title} className="reveal p-7 rounded-2xl border border-brand-gray/15 bg-brand-white dark:bg-primary">
              <div className="w-11 h-11 rounded-xl bg-brand-cyan/10 text-brand-cyan flex items-center justify-center border border-brand-cyan/20">
                <u.icon className="w-5 h-5" />
              </div>
              <h3 className="mt-5 font-bold text-brand-deep dark:text-white">{u.title}</h3>
              <p className="mt-2 text-sm text-brand-gray leading-relaxed">{u.body}</p>
            </div>
          ))}
        </div>
      </SectionShell>

      {/* ── FAQ ─────────────────────────────────────────────────────── */}
      <SectionShell id="faq">
        <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-12">
          <div className="reveal">
            <Eyebrow num="05">FAQ</Eyebrow>
            <h2 className="mt-5 text-3xl md:text-4xl font-black tracking-tight">Preguntas frecuentes</h2>
            <p className="mt-4 text-brand-gray text-sm">Lo esencial sobre alcance, modelo y cumplimiento normativo.</p>
          </div>
          <div className="reveal">
            {FAQ.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </SectionShell>

      {/* ── TEAM ────────────────────────────────────────────────────── */}
      <SectionShell id="equipo" className="bg-white dark:bg-primary-light/40">
        <div className="reveal">
          <Eyebrow num="06">Equipo</Eyebrow>
          <h2 className="mt-5 text-3xl md:text-4xl font-black tracking-tight max-w-2xl">Un proyecto académico con estándar de producto.</h2>
          <p className="mt-4 text-brand-gray text-sm max-w-2xl">Desarrollado en la Universidad Santo Tomás · Tunja, Boyacá, como sistema de apoyo diagnóstico con IA explicable.</p>
        </div>
        <div className="mt-14 grid sm:grid-cols-3 gap-6">
          {TEAM.map((m) => (
            <div key={m.name} className="reveal p-7 rounded-2xl border border-brand-gray/15 bg-brand-white dark:bg-primary text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-cyan/10 text-brand-cyan flex items-center justify-center border border-brand-cyan/20">
                <m.icon className="w-6 h-6" />
              </div>
              <h3 className="mt-5 font-bold text-brand-deep dark:text-white">{m.name}</h3>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-brand-gray">{m.role}</p>
            </div>
          ))}
        </div>
      </SectionShell>

      {/* ── REPO ────────────────────────────────────────────────────── */}
      <SectionShell id="repositorio">
        <div className="reveal rounded-3xl border border-brand-gray/15 bg-primary text-white p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-start gap-5">
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <GitBranch className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">Código abierto y reproducible</h2>
              <p className="mt-2 text-slate-300 text-sm max-w-xl">Pipeline de entrenamiento, API, frontend y tests. Documentación de arquitectura y cumplimiento (Ley 1581) incluida.</p>
              <div className="mt-4 flex flex-wrap gap-2 font-mono text-[11px]">
                {['PyTorch', 'FastAPI', 'React', 'MLflow', 'Docker'].map((t) => (
                  <span key={t} className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-slate-300">{t}</span>
                ))}
              </div>
            </div>
          </div>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-cyan text-primary font-bold text-sm hover:bg-brand-cyan/90 transition-colors shrink-0">
            Ver repositorio <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
      </SectionShell>

      {/* ── CONTACT ─────────────────────────────────────────────────── */}
      <SectionShell id="contacto" className="bg-white dark:bg-primary-light/40">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="reveal">
            <Eyebrow num="07">Contacto</Eyebrow>
            <h2 className="mt-5 text-3xl md:text-4xl font-black tracking-tight">¿Hablamos sobre el proyecto?</h2>
            <p className="mt-4 text-brand-gray text-sm max-w-md">Consultas académicas, colaboración o una demostración guiada. Respondo personalmente.</p>
            <div className="mt-8 flex flex-col gap-3">
              <a href="mailto:manueljosesanabriagil19@gmail.com" className="inline-flex items-center gap-3 text-brand-deep dark:text-white hover:text-brand-cyan transition-colors">
                <span className="w-10 h-10 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan flex items-center justify-center"><Mail className="w-4.5 h-4.5" /></span>
                <span className="font-mono text-sm">manueljosesanabriagil19@gmail.com</span>
              </a>
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 text-brand-deep dark:text-white hover:text-brand-cyan transition-colors">
                <span className="w-10 h-10 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan flex items-center justify-center"><GitBranch className="w-4.5 h-4.5" /></span>
                <span className="font-mono text-sm">github.com</span>
              </a>
            </div>
          </div>
          <div className="reveal p-8 rounded-2xl border border-brand-gray/15 bg-brand-white dark:bg-primary">
            <h3 className="font-bold text-brand-deep dark:text-white">Lo que obtienes hoy</h3>
            <ul className="mt-5 flex flex-col gap-3">
              {['Panel clínico con cuentas demo', 'Inferencia + Grad-CAM en tiempo real', 'Historial y reportes en PDF', 'Despliegue reproducible con Docker'].map((t) => (
                <li key={t} className="flex items-center gap-3 text-sm text-brand-gray">
                  <span className="w-5 h-5 rounded-full bg-brand-cyan/15 text-brand-cyan flex items-center justify-center shrink-0"><Check className="w-3 h-3" /></span>
                  {t}
                </li>
              ))}
            </ul>
            <Link to="/login" className="mt-7 w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-deep dark:bg-brand-cyan text-white dark:text-primary font-bold text-sm hover:opacity-95 transition-opacity">
              Entrar al panel <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </SectionShell>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="bg-primary text-white px-6 md:px-10 lg:px-16 py-12 border-t border-white/10">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-white"><Logo variant="full" size={22} /></div>
          <p className="font-mono text-[11px] text-brand-gray text-center">
            © 2026 MedVision AI · Universidad Santo Tomás, Tunja · Apoyo diagnóstico — no sustituye criterio médico
          </p>
          <div className="flex items-center gap-4">
            {NAV.slice(0, 3).map((n) => (
              <a key={n.href} href={n.href} className="text-xs text-slate-300 hover:text-brand-cyan transition-colors">{n.label}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
