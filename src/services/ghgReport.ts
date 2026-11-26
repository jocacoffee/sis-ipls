import type { GHGYearInventory } from './ghgInventory';
import { TREES_PER_TCO2E } from './ghgInventory';
import type { TravelYearStats } from '../components/TravelEmissionsCharts';

/** Resposta de GET /api/ghg/inventory. */
export interface GHGInventoryData {
  orgId: string;
  series: GHGYearInventory[];
  travel: Record<number, TravelYearStats>;
}

export async function fetchGHGInventory(orgId: string): Promise<GHGInventoryData> {
  const r = await fetch(`/api/ghg/inventory?orgId=${encodeURIComponent(orgId)}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  return { orgId: d.orgId, series: d.series || [], travel: d.travel || {} };
}

export const fmtT = (v: number | null | undefined, digits = 2) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const fmtN = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const fmtPct = (v: number) => `${v > 0 ? '+' : ''}${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

export const treesOf = (t: number | null | undefined) => (t == null ? null : Math.round(t * TREES_PER_TCO2E));

/** Variação anual só quando os dois anos estão completos e sem escopo faltando. */
export function comparableVariation(inv: GHGYearInventory, prev?: GHGYearInventory): number | null {
  const partial = inv.energyMonths > 0 && inv.energyMonths < 12;
  if (inv.total == null || !prev?.total || partial || inv.warnings.length || prev.warnings.length) return null;
  return ((inv.total - prev.total) / prev.total) * 100;
}

/** Ranking simples de um registro (maiores primeiro). */
export function topEntries<T>(o: Record<string, T>, by: (v: T) => number, n: number): [string, T][] {
  return Object.entries(o).sort((a, b) => by(b[1]) - by(a[1])).slice(0, n);
}

/**
 * Texto da seção "Programa Justiça Carbono Zero" do relatório anual, a partir do inventário
 * calculado pelo iPLS (mesmos números da tela Inventário GEE e do PDF do inventário).
 */
export function ghgReportText(data: GHGInventoryData, year: number, acronym: string): string {
  const inv = data.series.find(s => s.year === year);
  if (!inv) {
    return (
      `Não há dados de atividade (combustíveis, energia elétrica, gases refrigerantes ou viagens) lançados para ${acronym} em ${year}, ` +
      'o que impede o cálculo do inventário de emissões de GEE exigido pela Resolução CNJ nº 594/2024 (Programa Justiça Carbono Zero).'
    );
  }
  const prev = data.series.find(s => s.year === year - 1);
  const travel = data.travel[year];
  const partial = inv.energyMonths > 0 && inv.energyMonths < 12;
  const parts: string[] = [];
  const sc = (v: number | null) => (v == null ? 'não calculado' : `${fmtT(v)} tCO₂e`);

  parts.push(
    `O inventário de emissões de gases de efeito estufa (GEE) de ${acronym} em ${year}, calculado pelo iPLS a partir dos dados lançados ` +
    'e com os fatores da Ferramenta GHG Protocol (Programa Brasileiro GHG Protocol/FGV), totaliza ' +
    `${fmtT(inv.total)} tCO₂e: escopo 1 (combustão móvel e emissões fugitivas) ${sc(inv.scope1)}; ` +
    `escopo 2 (energia elétrica adquirida) ${sc(inv.scope2)}; e escopo 3 (viagens aéreas a serviço) ${sc(inv.scope3)}.` +
    (inv.biogenic != null && inv.biogenic > 0 ? ` As emissões de CO₂ biogênico, relatadas à parte, somam ${fmtT(inv.biogenic)} tCO₂.` : '')
  );

  const v = comparableVariation(inv, prev);
  if (v != null) {
    parts.push(`Em relação a ${year - 1} (${fmtT(prev!.total)} tCO₂e), o total variou ${fmtPct(v)}.`);
  } else if (partial) {
    parts.push(`O exercício está em curso: a energia elétrica foi lançada em ${inv.energyMonths} de 12 meses, e a comparação anual será feita no fechamento.`);
  }

  const trees = treesOf(inv.total);
  if (trees) {
    parts.push(
      `Em termos de divulgação, as emissões do ano equivalem a cerca de ${fmtN(trees)} árvores de Mata Atlântica crescendo por 20 anos ` +
      `(${TREES_PER_TCO2E.toLocaleString('pt-BR')} árvores por tCO₂e; estimativa, não fator oficial de compensação).`
    );
  }

  if (inv.reported12 != null || inv.scope3Reported != null) {
    const rep: string[] = [];
    const missing = [inv.scope1 == null && 'escopo 1', inv.scope2 == null && 'escopo 2'].filter(Boolean).join(' e ');
    if (inv.reported12 != null) rep.push(`escopos 1 e 2 informados ao CNJ (GEE1e2): ${fmtT(inv.reported12)} tCO₂e, contra ${fmtT(inv.total12)} tCO₂e calculados${missing ? ` (sem o ${missing}, não calculado)` : ''}`);
    if (inv.scope3Reported != null) rep.push(`escopo 3 informado (GEE-Esc3): ${fmtT(inv.scope3Reported)} tCO₂e, contra ${fmtT(inv.scope3)} tCO₂e de viagens calculados`);
    parts.push(`Comparação com os valores informados: ${rep.join('; ')}.`);
  }

  if (travel && travel.trips > 0) {
    const dest = topEntries(travel.byDestination, x => x, 3).map(([k, n]) => `${k} (${fmtN(n)})`).join(', ');
    const route = topEntries(travel.byRoute, x => x.t, 3).map(([k, r]) => `${k} (${fmtT(r.t, 1)} tCO₂e)`).join(', ');
    let t =
      `Viagens a serviço: ${fmtN(travel.trips)} trechos aéreos e ${fmtN(travel.km)} km percorridos, com ${fmtT(travel.tCO2e)} tCO₂e ` +
      `(somados trecho a trecho a partir do painel de BI de viagens). Destinos mais frequentes: ${dest}. Trajetos de maior emissão: ${route}.`;
    if (travel.byOrg.length > 1) {
      const units = [...travel.byOrg].sort((a, b) => b.t - a.t).slice(0, 3).map(o => `${o.acronym} (${fmtT(o.t, 1)} tCO₂e)`).join(', ');
      t += ` Maiores emissões por unidade: ${units}.`;
    }
    parts.push(t);
  }

  const notes = [...inv.warnings];
  if (inv.provisional) notes.push('Há fator de emissão provisório no ano (fator do SIN ainda não publicado pelo MCTI).');
  if (notes.length) parts.push(`Observações: ${notes.join(' ')}`);

  parts.push(
    'Metodologia: escopo 1 pelo consumo de gasolina, etanol e diesel (CO₂ fóssil, CH₄ e N₂O, GWP do AR5) e pela reposição de gases refrigerantes; ' +
    'escopo 2 pela abordagem de localização, com os fatores do Sistema Interligado Nacional (MCTI), e, em sistema isolado, com o fator informado; ' +
    'escopo 3 pelas viagens aéreas a serviço. O detalhamento está no PDF do inventário de GEE, gerado pelo iPLS.'
  );
  // Sem subscritos: o texto também vai para o PDF do relatório anual (fonte padrão do jsPDF)
  return parts.join('\n\n').replace(/₂/g, '2').replace(/₄/g, '4');
}
