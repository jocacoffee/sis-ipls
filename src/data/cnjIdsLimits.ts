/**
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
  2021: {
    cre: { min: 0, max: 19470.62806 },
    crem2: { min: 0, max: 320.6069203 },
    cra: { min: 0, max: 223.7815534 },
    cram2: { min: 0, max: 2.483983081 },
    upv: { min: 5.921052632, max: 130.6124031 },
    cc_ftt: { min: 0, max: 8.540171912 },
    gtransm2: { min: 0.02639489922, max: 2696.645999 },
    gp_ftt: { min: 0, max: 958.8594293 },
    tmr_ftt: { min: 0, max: 141.105643 },
    ced_ftt: { min: 0, max: 99.90422535 },
    glinha_ftt: { min: 0, max: 791.2271638 },
    qei_ftt: { min: 0.05102954342, max: 1.580735552 }
  },
  2022: {
    cre: { min: 0, max: 3543.116608 },
    crem2: { min: 0, max: 71.32324636 },
    cra: { min: 1.052255985, max: 21.44764441 },
    cram2: { min: 0.02326741493, max: 0.6026415398 },
    upv: { min: 0.6783333333, max: 128.8582677 },
    cc_ftt: { min: 0, max: 10.1292316 },
    gtransm2: { min: 0.04058138022, max: 2139.915237 },
    gp_ftt: { min: 0, max: 8995.766074 },
    tmr_ftt: { min: 0.02521440823, max: 484.7619523 },
    ced_ftt: { min: 0, max: 69.10323253 },
    glinha_ftt: { min: 3.15479646, max: 858.4565523 },
    qei_ftt: { min: 0.04652996845, max: 0.7505376344 }
  },
  2023: {
    cre: { min: 0, max: 3326.486793 },
    crem2: { min: 0, max: 77.85325562 },
    cra: { min: 0.9923215899, max: 22.26845908 },
    cram2: { min: 0.02147657567, max: 0.62216115 },
    upv: { min: 7.635135135, max: 205.6 },
    cc_ftt: { min: 0, max: 6.84295302 },
    gtransm2: { min: 0.04067373809, max: 2764.141598 },
    gp_ftt: { min: 1.633414436, max: 1020.184124 },
    tmr_ftt: { min: 0.08160828025, max: 3147.08264 },
    ced_ftt: { min: 0, max: 39.34594132 },
    glinha_ftt: { min: 4.539940239, max: 749.4800398 },
    qei_ftt: { min: 0.04154727794, max: 0.7429328622 }
  },
  2024: {
    cre: { min: 186.9272727, max: 3639.224077 },
    crem2: { min: 2.216497068, max: 103.8860339 },
    cra: { min: 0.5897435897, max: 21.16306156 },
    cram2: { min: 0.01279601364, max: 0.6051019492 },
    upv: { min: 1.110960758, max: 174.2653061 },
    cc_ftt: { min: 0, max: 10.09476031 },
    gtransm2: { min: 0.03834072579, max: 3071.100204 },
    gp_ftt: { min: 3.368455002, max: 2975.036844 },
    tmr_ftt: { min: 0.2325333333, max: 896.2280876 },
    ced_ftt: { min: 0, max: 45.07494093 },
    glinha_ftt: { min: 2.279930876, max: 2674.900836 },
    qei_ftt: { min: 0.0389182058, max: 0.452687039 }
  },
  2025: {
    cre: { min: 0, max: 3684.828434 },
    crem2: { min: 0, max: 99.16572501 },
    cra: { min: 0.5822680412, max: 21.76998369 },
    cram2: { min: 0.01041039111, max: 0.5836371591 },
    upv: { min: 8.283783784, max: 144.3333333 },
    cc_ftt: { min: 0, max: 6.030558789 },
    gtransm2: { min: 0.446744235, max: 3502.635369 },
    gp_ftt: { min: 0, max: 1074.151051 },
    tmr_ftt: { min: 1.598038061, max: 1335.02538 },
    ced_ftt: { min: 0, max: 43.27470857 },
    glinha_ftt: { min: 2.694377682, max: 841.2283463 },
    qei_ftt: { min: 0.034738041, max: 0.4442570733 },
    pservcf: { min: 0.341346154, max: 0.669414317 }
  }
};

/** IDS publicados pelo CNJ (Balanço da Sustentabilidade), em %, por órgão do iPLS e exercício. */
export const CNJ_PUBLISHED_IDS: Record<string, Record<number, { value: number; source: string }>> = {
  'org-trf1': { 2025: { value: 58.43, source: '10º Balanço da Sustentabilidade (CNJ, 2026), Tabela 3' } }
};
