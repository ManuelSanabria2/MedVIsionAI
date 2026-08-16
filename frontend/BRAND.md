# MedVision AI — Sistema de identidad visual

Guía de marca para mantener una identidad consistente ("software comercial") en
todo el producto.

## Concepto

**MedVision AI** es apoyo diagnóstico *explicable*: detecta anomalías en imágenes
médicas y muestra **dónde** mira (Grad-CAM). La identidad traduce dos ideas —
**visión** (una apertura / visor) y **señal clínica** (un pulso ECG).

## Logo

- **Marca (símbolo):** una retícula de encuadre (cuatro esquinas de visor) que
  rodea una onda de pulso. Componente: `src/components/brand/Logo.tsx`.
  - `<Logo variant="full" />` — símbolo + wordmark ("Med**Vision** AI").
  - `<Logo variant="mark" />` / `<LogoMark />` — solo símbolo (sidebar colapsado,
    favicon, botones).
- El **marco** usa `currentColor` (se adapta a fondo claro/oscuro); el **pulso**
  siempre va en cian de marca (`#00C2CB`), que contrasta sobre navy y blanco.
- **Favicon:** `public/favicon.svg` — la marca sobre un "device" navy redondeado.
- Área de respeto: mantener un margen ≥ 25% de la altura del símbolo.
- No: rotar, recolorear el pulso, ni añadir sombras al símbolo.

## Paleta

| Token           | Hex       | Uso                                      |
|-----------------|-----------|------------------------------------------|
| `brand-deep`    | `#0A2342` | Navy — texto principal, superficies base |
| `brand-cyan`    | `#00C2CB` | Cian — acento diagnóstico, CTAs, foco    |
| `brand-gray`    | `#64748B` | Slate — texto secundario, etiquetas      |
| `brand-white`   | `#F8FAFC` | Niebla clínica — fondo de aplicación     |
| `success`       | `#10B981` | Confirmaciones                           |
| `warning`       | `#F59E0B` | Zona intermedia del heatmap              |
| `danger`        | `#EF4444` | Anomalía / alerta crítica                |

> Los tokens se definen en `src/styles/globals.css` (`@theme`, Tailwind v4) y
> generan utilidades `text-brand-*`, `bg-brand-*`, etc. **No** dupliques colores
> con hex sueltos: usa los tokens. `tailwind.config.ts` es legado (v3) y Tailwind
> v4 no lo lee — la fuente de verdad es `@theme`.

## Tipografía

- **DM Sans** — cuerpo y titulares (pesos 300–800, `font-sans`).
- **DM Mono** — tratamiento de firma (`font-mono`): eyebrows, cifras/estadísticas,
  numeración de sección y lecturas tipo consola de imagenología. Es lo que da el
  carácter de "instrumento clínico"; úsalo en mayúsculas con tracking amplio.

Escala: titulares `font-black tracking-tight`; etiquetas mono
`uppercase tracking-[0.22em]`.

## Motion

- Reveal on scroll (`.reveal` + IntersectionObserver) y `heat-bloom` /
  `hero-scan-line` para el visor del hero.
- Siempre respetar `prefers-reduced-motion` (ya contemplado en `globals.css`).

## Voz

Español clínico, directo y honesto. Regla no negociable: **apoyo diagnóstico, no
sustituye el criterio médico.** Nunca prometer diagnóstico autónomo.
