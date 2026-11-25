import type { LucideIcon } from 'lucide-react';
import { Briefcase, Car, Cpu, CupSoda, Droplet, FileText, Fuel, GlassWater, GraduationCap, Hammer, HeartPulse, Leaf, Phone, Printer, Recycle, Scale, ShieldCheck, ShoppingCart, SprayCan, Users, Zap } from 'lucide-react';

/**
 * Ícone e cores de cada Tema do PLS (Res. CNJ 400/2021), para diferenciar os temas na tela.
 * As classes do Tailwind ficam escritas por extenso para serem incluídas no CSS final.
 */
export interface ThemeStyle {
  icon: LucideIcon;
  /** Caixa do ícone */
  iconBox: string;
  /** Faixa de cabeçalho do tema (tom leve) */
  header: string;
  /** Borda de destaque à esquerda do bloco do tema */
  accent: string;
  /** Etiqueta pequena (lista geral) */
  chip: string;
  /** Borda dos cartões ao passar o mouse */
  cardHover: string;
  /** Cor das barras dos minigráficos (usa currentColor) */
  bar: string;
}

const STYLES: Record<number, ThemeStyle> = {
  // Variáveis Gerais
  1: {
    icon: Users,
    iconBox: 'bg-slate-100 text-slate-700 border-slate-200',
    header: 'bg-slate-50/70',
    accent: 'border-l-slate-400',
    chip: 'bg-slate-50 text-slate-800 border-slate-200',
    cardHover: 'hover:border-slate-400',
    bar: 'text-slate-500',
  },
  // Papel
  2: {
    icon: FileText,
    iconBox: 'bg-amber-100 text-amber-800 border-amber-200',
    header: 'bg-amber-50/70',
    accent: 'border-l-amber-400',
    chip: 'bg-amber-50 text-amber-800 border-amber-200',
    cardHover: 'hover:border-amber-400',
    bar: 'text-amber-500',
  },
  // Copos Descartáveis
  3: {
    icon: CupSoda,
    iconBox: 'bg-orange-100 text-orange-700 border-orange-200',
    header: 'bg-orange-50/70',
    accent: 'border-l-orange-400',
    chip: 'bg-orange-50 text-orange-800 border-orange-200',
    cardHover: 'hover:border-orange-400',
    bar: 'text-orange-500',
  },
  // Água Envasada
  4: {
    icon: GlassWater,
    iconBox: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    header: 'bg-cyan-50/70',
    accent: 'border-l-cyan-400',
    chip: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    cardHover: 'hover:border-cyan-400',
    bar: 'text-cyan-500',
  },
  // Impressão
  5: {
    icon: Printer,
    iconBox: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    header: 'bg-zinc-50/70',
    accent: 'border-l-zinc-400',
    chip: 'bg-zinc-50 text-zinc-800 border-zinc-200',
    cardHover: 'hover:border-zinc-400',
    bar: 'text-zinc-500',
  },
  // Energia Elétrica
  6: {
    icon: Zap,
    iconBox: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    header: 'bg-yellow-50/70',
    accent: 'border-l-yellow-400',
    chip: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    cardHover: 'hover:border-yellow-400',
    bar: 'text-yellow-500',
  },
  // Água e Esgoto
  7: {
    icon: Droplet,
    iconBox: 'bg-blue-100 text-blue-700 border-blue-200',
    header: 'bg-blue-50/70',
    accent: 'border-l-blue-400',
    chip: 'bg-blue-50 text-blue-800 border-blue-200',
    cardHover: 'hover:border-blue-400',
    bar: 'text-blue-500',
  },
  // Gestão de Resíduos
  8: {
    icon: Recycle,
    iconBox: 'bg-lime-100 text-lime-800 border-lime-200',
    header: 'bg-lime-50/70',
    accent: 'border-l-lime-400',
    chip: 'bg-lime-50 text-lime-800 border-lime-200',
    cardHover: 'hover:border-lime-400',
    bar: 'text-lime-500',
  },
  // Reformas e Construções
  9: {
    icon: Hammer,
    iconBox: 'bg-stone-100 text-stone-700 border-stone-200',
    header: 'bg-stone-50/70',
    accent: 'border-l-stone-400',
    chip: 'bg-stone-50 text-stone-800 border-stone-200',
    cardHover: 'hover:border-stone-400',
    bar: 'text-stone-500',
  },
  // Limpeza
  10: {
    icon: SprayCan,
    iconBox: 'bg-teal-100 text-teal-700 border-teal-200',
    header: 'bg-teal-50/70',
    accent: 'border-l-teal-400',
    chip: 'bg-teal-50 text-teal-800 border-teal-200',
    cardHover: 'hover:border-teal-400',
    bar: 'text-teal-500',
  },
  // Vigilância
  11: {
    icon: ShieldCheck,
    iconBox: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    header: 'bg-indigo-50/70',
    accent: 'border-l-indigo-400',
    chip: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    cardHover: 'hover:border-indigo-400',
    bar: 'text-indigo-500',
  },
  // Telefonia
  12: {
    icon: Phone,
    iconBox: 'bg-violet-100 text-violet-700 border-violet-200',
    header: 'bg-violet-50/70',
    accent: 'border-l-violet-400',
    chip: 'bg-violet-50 text-violet-800 border-violet-200',
    cardHover: 'hover:border-violet-400',
    bar: 'text-violet-500',
  },
  // Veículos
  13: {
    icon: Car,
    iconBox: 'bg-sky-100 text-sky-700 border-sky-200',
    header: 'bg-sky-50/70',
    accent: 'border-l-sky-400',
    chip: 'bg-sky-50 text-sky-800 border-sky-200',
    cardHover: 'hover:border-sky-400',
    bar: 'text-sky-500',
  },
  // Combustível
  14: {
    icon: Fuel,
    iconBox: 'bg-red-100 text-red-700 border-red-200',
    header: 'bg-red-50/70',
    accent: 'border-l-red-400',
    chip: 'bg-red-50 text-red-800 border-red-200',
    cardHover: 'hover:border-red-400',
    bar: 'text-red-500',
  },
  // Apoio ao Serviço Administrativo
  15: {
    icon: Briefcase,
    iconBox: 'bg-gray-100 text-gray-700 border-gray-200',
    header: 'bg-gray-50/70',
    accent: 'border-l-gray-400',
    chip: 'bg-gray-50 text-gray-800 border-gray-200',
    cardHover: 'hover:border-gray-400',
    bar: 'text-gray-500',
  },
  // Aquisições e Contratações
  16: {
    icon: ShoppingCart,
    iconBox: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    header: 'bg-fuchsia-50/70',
    accent: 'border-l-fuchsia-400',
    chip: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200',
    cardHover: 'hover:border-fuchsia-400',
    bar: 'text-fuchsia-500',
  },
  // Qualidade de Vida
  17: {
    icon: HeartPulse,
    iconBox: 'bg-pink-100 text-pink-700 border-pink-200',
    header: 'bg-pink-50/70',
    accent: 'border-l-pink-400',
    chip: 'bg-pink-50 text-pink-800 border-pink-200',
    cardHover: 'hover:border-pink-400',
    bar: 'text-pink-500',
  },
  // Capacitação em Sustentabilidade
  18: {
    icon: GraduationCap,
    iconBox: 'bg-purple-100 text-purple-700 border-purple-200',
    header: 'bg-purple-50/70',
    accent: 'border-l-purple-400',
    chip: 'bg-purple-50 text-purple-800 border-purple-200',
    cardHover: 'hover:border-purple-400',
    bar: 'text-purple-500',
  },
  // Equidade e Diversidade
  19: {
    icon: Scale,
    iconBox: 'bg-rose-100 text-rose-700 border-rose-200',
    header: 'bg-rose-50/70',
    accent: 'border-l-rose-400',
    chip: 'bg-rose-50 text-rose-800 border-rose-200',
    cardHover: 'hover:border-rose-400',
    bar: 'text-rose-500',
  },
  // Programa Justiça Carbono Zero
  20: {
    icon: Leaf,
    iconBox: 'bg-green-100 text-green-700 border-green-200',
    header: 'bg-green-50/70',
    accent: 'border-l-green-400',
    chip: 'bg-green-50 text-green-800 border-green-200',
    cardHover: 'hover:border-green-400',
    bar: 'text-green-500',
  },
  // Novas Tecnologias
  21: {
    icon: Cpu,
    iconBox: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    header: 'bg-emerald-50/70',
    accent: 'border-l-emerald-400',
    chip: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    cardHover: 'hover:border-emerald-400',
    bar: 'text-emerald-500',
  },
};

const FALLBACK: ThemeStyle = STYLES[20];

/** Estilo do tema pelo número (aceita 'theme-6', '6' ou 'THEME-6'). */
export function themeStyle(theme?: { id?: string; code?: string } | null): ThemeStyle {
  const raw = theme?.code || theme?.id || '';
  const n = Number(String(raw).replace(/\D+/g, ''));
  return STYLES[n] || FALLBACK;
}
