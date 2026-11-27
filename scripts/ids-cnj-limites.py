# Gera src/data/cnjIdsLimits.ts a partir da saída de ids-cnj-replica.py.
# Uso: python scripts/ids-cnj-limites.py ids_cnj.json src/data/cnjIdsLimits.ts
import json
import sys

src, out = sys.argv[1], sys.argv[2]
d = json.load(open(src, encoding='utf-8'))
KEYMAP = {"cre": "cre", "crem2": "crem2", "cra": "cra", "cram2": "cram2", "upv": "upv", "cc.ftt": "cc_ftt",
          "gtransm2": "gtransm2", "gp.ftt": "gp_ftt", "tmr.ftt": "tmr_ftt", "ced.ftt": "ced_ftt",
          "glinha.ftt": "glinha_ftt", "qei.ftt": "qei_ftt", "Pservcf": "pservcf"}

lines = []
for y in sorted(d):
    L = d[y]['limits']
    parts = []
    for k, key in KEYMAP.items():
        v = L.get(k)
        if v is None:
            continue
        parts.append(f"    {key}: {{ min: {float(v[0]):.10g}, max: {float(v[1]):.10g} }}")
    lines.append(f"  {y}: {{\n" + ",\n".join(parts) + f"\n  }}")

ts = '''/**
 * Limites nacionais do IDS por exercício: mínimo e máximo de cada indicador entre os tribunais
 * considerados pelo CNJ (gerado a partir de "pls_totais_ids_2025.csv", do pacote "Código e base de
 * dados do IDS 2025", publicado pelo CNJ com o 10º Balanço da Sustentabilidade).
 *
 * A padronização oficial ("Código Básico do IDS - 2025.R") é linear entre esses limites:
 *   menor-é-melhor: 1 − (x − mín)/(máx − mín);  maior-é-melhor: (x − mín)/(máx − mín).
 * Ficam fora do cálculo, como no código do CNJ: seções judiciárias, 2º graus dos TRFs e os
 * agregados de segmento (TRE, TJ, TRF, TRT, TJM, PJ, Sup/Con). Copos em centos por pessoa.
 *
 * Exercícios de 2021 a 2024: a base não traz o percentual de servidoras em chefia (Pservcf);
 * nesses anos o iPLS usa o limite de 2025 para esse indicador (com observação).
 * Para atualizar: rode o código do CNJ do novo Balanço e acrescente o ano abaixo.
 */

export const CNJ_IDS_LIMITS_SOURCE = 'CNJ — base e código do IDS (10º Balanço da Sustentabilidade, 2026)';

export const CNJ_IDS_LIMITS: Record<number, Partial<Record<string, { min: number; max: number }>>> = {
''' + ",\n".join(lines) + '''
};

/** IDS publicados pelo CNJ (Balanço da Sustentabilidade), em %, por órgão do iPLS e exercício. */
export const CNJ_PUBLISHED_IDS: Record<string, Record<number, { value: number; source: string }>> = {
  'org-trf1': { 2025: { value: 58.43, source: '10º Balanço da Sustentabilidade (CNJ, 2026), Tabela 3' } }
};
'''
open(out, 'w', encoding='utf-8', newline='\n').write(ts)
print('ok', len(lines), 'anos')
