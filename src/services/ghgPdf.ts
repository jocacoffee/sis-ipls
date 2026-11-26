import jsPDF from 'jspdf';
import { drawBrasaoDaRepublicaPdf } from '../components/BrasaoDaRepublica';
import {
  commercialFuelFactors,
  FUEL_EF,
  FUGITIVE_GASES,
  GWP,
  TREES_PER_TCO2E,
  YEAR_FACTORS
} from './ghgInventory';
import { comparableVariation, fmtT, GHGInventoryData, topEntries, treesOf } from './ghgReport';

interface GHGPdfOptions {
  data: GHGInventoryData;
  year: number;
  /** Rótulos do órgão (reportOrgLabels). */
  labels: { acronym: string; fileTag: string; letterhead: string };
  organizationName: string;
}

const fmtN = (v: number | null | undefined) => (v == null ? '—' : v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }));
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** PDF do inventário de GEE de um órgão e exercício (pedido separadamente pelo CNJ). */
export function generateGHGInventoryPdf({ data, year, labels, organizationName }: GHGPdfOptions): void {
  const inv = data.series.find(s => s.year === year);
  if (!inv) throw new Error(`Sem inventário calculado para ${year}.`);
  const prev = data.series.find(s => s.year === year - 1);
  const travel = data.travel[year];

  const pdf = new jsPDF('p', 'mm', 'a4');
  // A fonte padrão do jsPDF (WinAnsi) não tem subscritos: CO₂ vira CO2, CH₄ vira CH4
  const clean = (t: string) => t.replace(/₂/g, '2').replace(/₄/g, '4').replace(/₃/g, '3');
  const rawText = pdf.text.bind(pdf) as (...a: unknown[]) => jsPDF;
  (pdf as unknown as { text: unknown }).text = (t: string | string[], ...rest: unknown[]) =>
    rawText(Array.isArray(t) ? t.map(clean) : clean(t), ...rest);
  const rawSplit = pdf.splitTextToSize.bind(pdf);
  (pdf as unknown as { splitTextToSize: unknown }).splitTextToSize = (t: string, w: number, o?: unknown) => rawSplit(clean(t), w, o as never);
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 15;
  const CW = W - M * 2;
  let y = M;

  const header = () => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`PODER JUDICIÁRIO · JUSTIÇA FEDERAL (${labels.acronym}) · INVENTÁRIO DE EMISSÕES DE GEE ${year}`, W / 2, 10, { align: 'center' });
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.line(M, 12, W - M, 12);
  };
  const need = (h: number) => {
    if (y + h > H - M - 8) {
      pdf.addPage();
      header();
      y = M + 4;
    }
  };
  const heading = (t: string) => {
    need(14);
    y += 2;
    pdf.setFillColor(240, 253, 244);
    pdf.setDrawColor(187, 247, 208);
    pdf.roundedRect(M, y, CW, 6.5, 1.2, 1.2, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(6, 95, 70);
    pdf.text(t, M + 3, y + 4.5);
    y += 9;
  };
  const para = (t: string, size = 8, color: [number, number, number] = [51, 65, 85]) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    for (const line of pdf.splitTextToSize(t, CW) as string[]) {
      need(4);
      pdf.text(line, M, y);
      y += size * 0.45;
    }
    y += 1.5;
  };
  /** Tabela simples com quebra de linha nas células; `align` 'r' alinha à direita. */
  const table = (cols: { title: string; w: number; align?: 'r' }[], rows: string[][], opts: { boldLast?: boolean } = {}) => {
    const pad = 1.5;
    const lineH = 3.3;
    const drawRow = (cells: string[], bold: boolean, fill?: [number, number, number]) => {
      pdf.setFont('helvetica', bold ? 'bold' : 'normal');
      pdf.setFontSize(7.2);
      const wrapped = cells.map((c, i) => pdf.splitTextToSize(c, cols[i].w - pad * 2) as string[]);
      const h = Math.max(...wrapped.map(w => w.length)) * lineH + pad * 2;
      need(h);
      if (fill) {
        pdf.setFillColor(...fill);
        pdf.rect(M, y, CW, h, 'F');
      }
      let x = M;
      wrapped.forEach((lines, i) => {
        pdf.setTextColor(bold ? 15 : 51, bold ? 23 : 65, bold ? 42 : 85);
        lines.forEach((ln, k) => {
          const tx = cols[i].align === 'r' ? x + cols[i].w - pad : x + pad;
          pdf.text(ln, tx, y + pad + 2.4 + k * lineH, { align: cols[i].align === 'r' ? 'right' : 'left' });
        });
        x += cols[i].w;
      });
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.2);
      pdf.line(M, y + h, M + CW, y + h);
      y += h;
    };
    drawRow(cols.map(c => c.title), true, [241, 245, 249]);
    rows.forEach((r, i) => drawRow(r, !!opts.boldLast && i === rows.length - 1));
    y += 3;
  };


  // ---------- Gráficos (desenhados com primitivas do jsPDF: nítidos e leves)
  type RGB = [number, number, number];
  const SCOPE_COLOR: Record<number, RGB> = { 1: [5, 150, 105], 2: [217, 119, 6], 3: [37, 99, 235] };
  const BAR: RGB = [5, 150, 105];
  const INK: RGB = [51, 65, 85];
  const MUTED: RGB = [100, 116, 139];
  const txt = (t: string, x: number, yy: number, size: number, color: RGB, opts?: { align?: 'left' | 'right' | 'center'; bold?: boolean }) => {
    pdf.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    pdf.text(t, x, yy, { align: opts?.align || 'left' });
  };
  const chartTitle = (t: string, x: number, yy: number) => txt(t, x, yy, 7.8, [15, 23, 42], { bold: true });

  /** Barras horizontais ordenadas, uma série (o título nomeia a medida). Retorna a altura usada. */
  const hbars = (title: string, items: { label: string; value: number | null; color?: RGB }[], x: number, y0: number, w: number, fmt: (v: number) => string) => {
    const rowH = 5.2;
    const labelW = Math.min(30, w * 0.34);
    const valueW = 16;
    const barW = w - labelW - valueW - 2;
    const max = Math.max(...items.map(i => i.value ?? 0), 0) || 1;
    chartTitle(title, x, y0 + 3);
    let yy = y0 + 6.5;
    items.forEach(i => {
      const label = (pdf.splitTextToSize(i.label, labelW - 1) as string[])[0];
      txt(label, x, yy + 3.2, 6.8, INK);
      pdf.setFillColor(241, 245, 249);
      pdf.rect(x + labelW, yy + 0.8, barW, 3.2, 'F');
      if (i.value == null) {
        txt('não calculado', x + w, yy + 3.2, 6.8, MUTED, { align: 'right' });
      } else {
        pdf.setFillColor(...(i.color || BAR));
        pdf.roundedRect(x + labelW, yy + 0.8, Math.max(0.8, (i.value / max) * barW), 3.2, 0.6, 0.6, 'F');
        txt(fmt(i.value), x + w, yy + 3.2, 6.8, INK, { align: 'right' });
      }
      yy += rowH;
    });
    return yy - y0 + 1;
  };

  /** Barras verticais (uma série), com rótulo de valor no topo e categoria embaixo. */
  const vbars = (title: string, items: { label: string; value: number }[], x: number, y0: number, w: number, h: number, fmt: (v: number) => string) => {
    chartTitle(title, x, y0 + 3);
    const top = y0 + 9;
    const base = y0 + h - 6;
    const max = Math.max(...items.map(i => i.value), 0) || 1;
    const slot = w / Math.max(1, items.length);
    const bw = Math.min(10, slot * 0.62);
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.2);
    pdf.line(x, base, x + w, base);
    items.forEach((i, k) => {
      const cx = x + slot * k + slot / 2;
      const bh = i.value > 0 ? Math.max(0.6, (i.value / max) * (base - top - 4)) : 0;
      if (bh) {
        pdf.setFillColor(...BAR);
        pdf.roundedRect(cx - bw / 2, base - bh, bw, bh, 0.6, 0.6, 'F');
        txt(fmt(i.value), cx, base - bh - 1.2, 5.8, INK, { align: 'center' });
      }
      txt(i.label, cx, base + 3.6, 5.8, MUTED, { align: 'center' });
    });
    return h;
  };

  /** Barras empilhadas por ano (escopos 1, 2 e 3), com legenda e total no topo. */
  const stackedYears = (x: number, y0: number, w: number, h: number) => {
    const rows = data.series;
    chartTitle('Emissões por escopo e ano (tCO2e)', x, y0 + 3);
    let lx = x + w;
    ([3, 2, 1] as const).forEach(sc => {
      const label = `Escopo ${sc}`;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.8);
      const tw = pdf.getTextWidth(label);
      lx -= tw + 7;
      pdf.setFillColor(...SCOPE_COLOR[sc]);
      pdf.rect(lx, y0 + 0.8, 2.6, 2.6, 'F');
      txt(label, lx + 3.6, y0 + 3, 6.8, INK);
    });
    const top = y0 + 9;
    const base = y0 + h - 6;
    const max = Math.max(...rows.map(r => r.total || 0), 0) || 1;
    const slot = w / Math.max(1, rows.length);
    const bw = Math.min(14, slot * 0.55);
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.2);
    pdf.line(x, base, x + w, base);
    rows.forEach((r, k) => {
      const cx = x + slot * k + slot / 2;
      let yTop = base;
      ([1, 2, 3] as const).forEach(sc => {
        const v = sc === 1 ? r.scope1 : sc === 2 ? r.scope2 : r.scope3;
        if (!v || v <= 0) return;
        const bh = (v / max) * (base - top - 4);
        pdf.setFillColor(...SCOPE_COLOR[sc]);
        pdf.rect(cx - bw / 2, yTop - bh, bw, bh, 'F');
        pdf.setFillColor(255, 255, 255);
        pdf.rect(cx - bw / 2, yTop - bh, bw, 0.4, 'F');
        yTop -= bh;
      });
      if (r.total) txt(fmtT(r.total, 0), cx, yTop - 1.4, 6, INK, { align: 'center', bold: r.year === year });
      const partial = r.energyMonths > 0 && r.energyMonths < 12;
      txt(`${r.year}${partial ? '*' : ''}${r.warnings.length ? '†' : ''}`, cx, base + 3.6, 6.4, r.year === year ? [15, 23, 42] : MUTED, { align: 'center', bold: r.year === year });
    });
    return h;
  };

  /** Rosca: participação das faixas de distância no número de trechos. */
  const donut = (title: string, parts: { label: string; value: number; color: RGB }[], x: number, y0: number) => {
    chartTitle(title, x, y0 + 3);
    const total = parts.reduce((s, p) => s + p.value, 0) || 1;
    const r = 13;
    const cx = x + r + 1;
    const cy = y0 + 8 + r;
    let a0 = -Math.PI / 2;
    parts.forEach(p => {
      const a1 = a0 + (p.value / total) * Math.PI * 2;
      const steps = Math.max(2, Math.ceil(((a1 - a0) / (Math.PI * 2)) * 72));
      const pts: [number, number][] = [];
      let px = cx;
      let py = cy;
      for (let i = 0; i <= steps; i++) {
        const a = a0 + ((a1 - a0) * i) / steps;
        const nx = cx + r * Math.cos(a);
        const ny = cy + r * Math.sin(a);
        pts.push([nx - px, ny - py]);
        px = nx;
        py = ny;
      }
      pdf.setFillColor(...p.color);
      pdf.lines(pts, cx, cy, [1, 1], 'F', true);
      a0 = a1;
    });
    pdf.setFillColor(255, 255, 255);
    pdf.circle(cx, cy, r * 0.58, 'F');
    txt(total.toLocaleString('pt-BR'), cx, cy + 0.6, 7, [15, 23, 42], { align: 'center', bold: true });
    txt('trechos', cx, cy + 3.6, 5.6, MUTED, { align: 'center' });
    let ly = y0 + 12;
    parts.forEach(p => {
      pdf.setFillColor(...p.color);
      pdf.rect(x + 2 * r + 6, ly - 2.4, 2.8, 2.8, 'F');
      txt(`${p.label}: ${p.value.toLocaleString('pt-BR')} (${fmtT((p.value / total) * 100, 1)}%)`, x + 2 * r + 10.5, ly, 6.8, INK);
      ly += 5;
    });
    return 2 * r + 12;
  };

  // ---------- Capa
  header();
  drawBrasaoDaRepublicaPdf(pdf, W / 2, y + 2, 20);
  y += 29;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('PODER JUDICIÁRIO', W / 2, y, { align: 'center' });
  y += 5;
  pdf.setFontSize(9.5);
  pdf.setTextColor(51, 65, 85);
  pdf.text(labels.letterhead, W / 2, y, { align: 'center' });
  y += 6;
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(16, 185, 129);
  pdf.setLineWidth(0.6);
  pdf.roundedRect(M, y, CW, 20, 2, 2, 'FD');
  pdf.setLineWidth(0.2);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(6, 78, 59);
  pdf.text('INVENTÁRIO DE EMISSÕES DE GASES DE EFEITO ESTUFA', W / 2, y + 7, { align: 'center' });
  pdf.setFontSize(8.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(`EXERCÍCIO DE ${year} · ${organizationName.toUpperCase()}`.slice(0, 110), W / 2, y + 12.5, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(71, 85, 105);
  pdf.text('Programa Justiça Carbono Zero (Resolução CNJ nº 594/2024) · Ferramenta GHG Protocol (Programa Brasileiro GHG Protocol/FGV)', W / 2, y + 17, { align: 'center' });
  y += 26;

  // ---------- 1. Resumo
  heading('1. EMISSÕES POR ESCOPO');
  const scope1Fug = inv.lines.filter(l => l.key.startsWith('fugitiva-') && !l.excluded).reduce((s, l) => s + (l.tCO2e || 0), 0);
  table(
    [{ title: 'Escopo', w: 25 }, { title: 'Fontes', w: 85 }, { title: 'Emissões (tCO₂e)', w: 35, align: 'r' }, { title: 'Árvores equivalentes', w: 35, align: 'r' }],
    [
      ['Escopo 1', `Combustão móvel (gasolina, etanol, diesel)${scope1Fug > 0 ? ' e emissões fugitivas' : ''}`, fmtT(inv.scope1), fmtN(treesOf(inv.scope1))],
      ['Escopo 2', 'Energia elétrica adquirida (abordagem por localização)', fmtT(inv.scope2), fmtN(treesOf(inv.scope2))],
      ['Escopo 3', 'Viagens aéreas a serviço', fmtT(inv.scope3), fmtN(treesOf(inv.scope3))],
      ['Total', '', fmtT(inv.total), fmtN(treesOf(inv.total))]
    ],
    { boldLast: true }
  );
  const v = comparableVariation(inv, prev);
  const resumo: string[] = [];
  if (inv.biogenic != null && inv.biogenic > 0) resumo.push(`Emissões de CO₂ biogênico (relatadas à parte, fora do total): ${fmtT(inv.biogenic)} tCO₂.`);
  if (v != null) resumo.push(`Variação do total em relação a ${year - 1} (${fmtT(prev!.total)} tCO₂e): ${v > 0 ? '+' : ''}${fmtT(v, 1)}%.`);
  if (inv.reported12 != null) resumo.push(`Escopos 1 e 2 informados ao CNJ (GEE1e2): ${fmtT(inv.reported12)} tCO₂e; calculados pelo iPLS: ${fmtT(inv.total12)} tCO₂e.`);
  if (inv.scope3Reported != null) resumo.push(`Escopo 3 informado ao CNJ (GEE-Esc3): ${fmtT(inv.scope3Reported)} tCO₂e; viagens calculadas pelo iPLS: ${fmtT(inv.scope3)} tCO₂e.`);
  resumo.push(`Árvores equivalentes: árvores de Mata Atlântica necessárias para fixar as emissões em 20 anos (${TREES_PER_TCO2E.toLocaleString('pt-BR')} por tCO₂e); estimativa de divulgação, não fator oficial de compensação.`);
  need(30);
  y += hbars(
    'Emissões por escopo (tCO2e)',
    ([1, 2, 3] as const).map(sc => ({
      label: `Escopo ${sc}`,
      value: sc === 1 ? inv.scope1 : sc === 2 ? inv.scope2 : inv.scope3,
      color: SCOPE_COLOR[sc]
    })),
    M, y, CW, v => fmtT(v)
  ) + 2;
  resumo.forEach(t => para(t));

  const notes = [...inv.warnings];
  if (inv.energyMonths > 0 && inv.energyMonths < 12) notes.push(`Exercício parcial: energia elétrica lançada em ${inv.energyMonths} de 12 meses.`);
  if (inv.provisional) notes.push('Há fator de emissão provisório (fator do SIN do ano ainda não publicado pelo MCTI; usado o último disponível).');
  if (notes.length) {
    heading('OBSERVAÇÕES');
    notes.forEach(n => para(`• ${n}`, 7.8, [146, 64, 14]));
  }

  // ---------- 2. Memória de cálculo
  heading('2. MEMÓRIA DE CÁLCULO');
  table(
    [
      { title: 'Escopo', w: 14 }, { title: 'Fonte', w: 44 }, { title: 'Dado de atividade', w: 30, align: 'r' },
      { title: 'Fator', w: 27, align: 'r' }, { title: 'Origem do fator', w: 43 }, { title: 'tCO₂e', w: 22, align: 'r' }
    ],
    inv.lines.map(l => [
      String(l.scope),
      `${l.source} (${l.indicatorCode})${l.excluded ? ' — fora do total' : ''}`,
      l.activity == null ? 'sem dado' : `${l.activityUnit === 'tCO₂e' ? fmtT(l.activity) : fmtN(l.activity)} ${l.activityUnit}`,
      l.factor == null ? '—' : `${fmtT(l.factor, l.factorUnit.startsWith('GWP') ? 1 : 4)} ${l.factorUnit}`,
      `${l.factorSource}${l.provisional ? ' (provisório)' : ''}${l.warning ? `. ${l.warning}` : ''}`,
      l.tCO2e == null ? '—' : fmtT(l.tCO2e)
    ])
  );

  // ---------- 3. Viagens
  if (travel && travel.trips > 0) {
    heading('3. VIAGENS A SERVIÇO (ESCOPO 3)');
    para(
      `${fmtN(travel.trips)} trechos aéreos, ${fmtN(travel.km)} km e ${fmtT(travel.tCO2e)} tCO₂e (${fmtN(treesOf(travel.tCO2e))} árvores equivalentes). ` +
      'Fonte: painel de BI de viagens; emissões somadas trecho a trecho (distância do trecho × fator da faixa de distância).' +
      (travel.panelRefreshedAt ? ` Painel atualizado em ${new Date(travel.panelRefreshedAt).toLocaleDateString('pt-BR')}.` : '')
    );
    const CAT_COLOR: Record<string, RGB> = { Curta: [110, 231, 183], Média: [5, 150, 105], Longa: [6, 78, 59] };
    const catParts = ['Curta', 'Média', 'Longa', ...Object.keys(travel.byCategory).filter(k => !['Curta', 'Média', 'Longa'].includes(k))]
      .filter(k => travel.byCategory[k])
      .map(k => ({ label: k, value: travel.byCategory[k].trips, color: CAT_COLOR[k] || ([148, 163, 184] as RGB) }));
    const half = (CW - 8) / 2;
    need(58);
    const yA = y;
    const hL = hbars('Destinos mais escolhidos (trechos)', topEntries(travel.byDestination, x => x, 8).map(([k, n]) => ({ label: k, value: n })), M, yA, half, v => fmtN(v));
    const hR = hbars('Trajetos de maior emissão (tCO2e)', topEntries(travel.byRoute, x => x.t, 8).map(([k, r]) => ({ label: k, value: r.t })), M + half + 8, yA, half, v => fmtT(v, 1));
    y = yA + Math.max(hL, hR) + 3;
    need(42);
    const yB = y;
    const hD = donut('Trechos por faixa de distância', catParts, M, yB);
    const unitItems = travel.byOrg.length > 1
      ? [...travel.byOrg].sort((a, b) => b.t - a.t).map(o => ({ label: o.acronym.replace('TRF1-2G', 'TRF1'), value: o.t }))
      : travel.byMonth.map((m, i) => ({ label: MONTHS[i], value: m.t }));
    vbars(travel.byOrg.length > 1 ? 'Emissão por unidade (tCO2e)' : 'Emissão por mês (tCO2e)', unitItems, M + half + 8, yB, half, 38, v => fmtT(v, v >= 100 ? 0 : 1));
    y = yB + Math.max(hD, 38) + 3;
    const cats = Object.entries(travel.byCategory).map(([k, c]) => [k, fmtN(c.trips), `${fmtT((c.trips / travel.trips) * 100, 1)}%`, fmtN(c.km), fmtT(c.t)]);
    table([{ title: 'Faixa de distância', w: 50 }, { title: 'Trechos', w: 30, align: 'r' }, { title: '% dos trechos', w: 30, align: 'r' }, { title: 'km', w: 35, align: 'r' }, { title: 'tCO₂e', w: 35, align: 'r' }], cats);
    const dests = topEntries(travel.byDestination, x => x, 10);
    const routes = topEntries(travel.byRoute, x => x.t, 10);
    const n = Math.max(dests.length, routes.length);
    table(
      [{ title: 'Destino', w: 55 }, { title: 'Trechos', w: 25, align: 'r' }, { title: 'Trajeto', w: 45 }, { title: 'Trechos', w: 25, align: 'r' }, { title: 'tCO₂e', w: 30, align: 'r' }],
      Array.from({ length: n }, (_, i) => [
        dests[i]?.[0] || '', dests[i] ? fmtN(dests[i][1]) : '',
        routes[i]?.[0] || '', routes[i] ? fmtN(routes[i][1].trips) : '', routes[i] ? fmtT(routes[i][1].t) : ''
      ])
    );
    if (travel.byOrg.length > 1) {
      table(
        [{ title: 'Unidade', w: 60 }, { title: 'Trechos', w: 40, align: 'r' }, { title: 'tCO₂e', w: 40, align: 'r' }, { title: 'Árvores equivalentes', w: 40, align: 'r' }],
        [...travel.byOrg].sort((a, b) => b.t - a.t).map(o => [o.acronym, fmtN(o.trips), fmtT(o.t), fmtN(treesOf(o.t))])
      );
    } else {
      table(
        [{ title: 'Mês', w: 60 }, { title: 'Trechos', w: 60, align: 'r' }, { title: 'tCO₂e', w: 60, align: 'r' }],
        travel.byMonth.map((m, i) => [`${MONTHS[i]}/${year}`, fmtN(m.trips), fmtT(m.t)]).filter(r => r[1] !== '0')
      );
    }
  }

  // ---------- 4. Série histórica
  heading(`${travel && travel.trips > 0 ? '4' : '3'}. SÉRIE HISTÓRICA (tCO₂e)`);
  need(62);
  y += stackedYears(M, y, CW, 60) + 1;
  para('* exercício parcial   † ano com escopo sem cálculo (ver observações)', 6.6, MUTED);
  table(
    [
      { title: 'Ano', w: 20 }, { title: 'Escopo 1', w: 26, align: 'r' }, { title: 'Escopo 2', w: 26, align: 'r' }, { title: 'Escopo 3', w: 26, align: 'r' },
      { title: 'Total iPLS', w: 28, align: 'r' }, { title: 'Informado 1 e 2', w: 27, align: 'r' }, { title: 'Informado 3', w: 27, align: 'r' }
    ],
    data.series.map(s => [
      `${s.year}${s.energyMonths > 0 && s.energyMonths < 12 ? ' (parcial)' : ''}${s.warnings.length ? ' †' : ''}`,
      fmtT(s.scope1), fmtT(s.scope2), fmtT(s.scope3), fmtT(s.total), fmtT(s.reported12), fmtT(s.scope3Reported)
    ])
  );

  // ---------- 5. Metodologia
  const fuel = commercialFuelFactors(year);
  heading(`${travel && travel.trips > 0 ? '5' : '4'}. METODOLOGIA E FATORES DE EMISSÃO`);
  para(
    `Escopo 1, combustíveis: fatores da Ferramenta GHG Protocol. O CO₂ entra só da parcela fóssil (gasolina pura ${fmtT(FUEL_EF.gasolinaPura.co2, 3)} e diesel puro ${fmtT(FUEL_EF.dieselPuro.co2, 3)} kg CO₂/L); ` +
    `o CH₄ e o N₂O de todas as parcelas, pelo GWP do AR5 (CH₄ = ${GWP.CH4}; N₂O = ${GWP.N2O}). Em ${year}: gasolina C com ${fmtT(fuel.etanolNaGasolina * 100, 1)}% de etanol anidro ` +
    `(${fmtT(fuel.gasolinaC.co2e, 3)} kg CO₂e/L) e diesel B com ${fmtT(fuel.biodieselNoDiesel * 100, 1)}% de biodiesel (${fmtT(fuel.dieselB.co2e, 3)} kg CO₂e/L). ` +
    'O CO₂ do etanol e do biodiesel é biogênico e fica fora do total.'
  );
  para(
    `Escopo 1, emissões fugitivas: massa de gás refrigerante reposta e de CO₂ recarregado em extintores × GWP do AR5 (${FUGITIVE_GASES.map(g => `${g.acronym} ${fmtN(g.gwp)}`).join('; ')}). ` +
    'O R-22 (Protocolo de Montreal) é relatado fora do total.'
  );
  para(
    'Escopo 2: abordagem por localização; consumo de cada mês × fator mensal do Sistema Interligado Nacional (MCTI) ou, sem fator mensal, a média anual ' +
    `(${Object.keys(YEAR_FACTORS).map(Number).filter(y => YEAR_FACTORS[y].sin != null).map(y => `${y}: ${fmtT(YEAR_FACTORS[y].sin!, 4)}`).join('; ')} tCO₂/MWh). ` +
    'Em sistema isolado (Roraima até 2025), usa-se o fator informado pelo órgão.'
  );
  para('Escopo 3: viagens aéreas a serviço, do painel de BI de viagens, somadas trecho a trecho com o fator da faixa de distância de cada trecho.');
  para('Os dados de atividade são os lançados no iPLS pelos órgãos; o consolidado regional é a soma dos inventários dos órgãos.', 7.5, [100, 116, 139]);

  // ---------- Rodapé em todas as páginas
  const pages = pdf.getNumberOfPages();
  const stamp = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.8);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`Gerado pelo iPLS em ${stamp}`, M, H - 7);
    pdf.text(`Página ${p} de ${pages}`, W - M, H - 7, { align: 'right' });
  }

  pdf.save(`Inventario_GEE_${labels.fileTag}_${year}.pdf`);
}
