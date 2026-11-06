# Dados de sustentabilidade – JF 1ª Região (pacote de importação)

Origem: `Painel_Unificado_Sustentabilidade_JF1_BR_corrigido.xlsx`. Os arquivos estão em UTF-8, com separador vírgula e decimal com ponto.

## Modelo (formato longo, um valor por linha)

```
orgaos (id) ──┐
              ├──< valores_mensais (orgao_id, indicador, ano, mes, valor)
indicadores ──┤
  (codigo)    └──< valores_anuais  (orgao_id, indicador, ano, valor)
```

| Arquivo | Linhas | Chave | Conteúdo |
|---|---|---|---|
| `orgaos.csv` | 16 | `id` | 14 órgãos ativos (TRF1_2G + 13 seções), SJMG (inativo, só histórico) e TRF1 (total regional da fonte) |
| `indicadores.csv` | 120 | `codigo` | 21 indicadores mensais e 99 anuais: tema, unidade, `tipo_valor`, `consolidacao` |
| `valores_mensais.csv` | 18.849 | orgao_id+indicador+ano+mes | Histórico de 2021 a 2025 e lançamentos de 2026 |
| `valores_anuais.csv` | 6.800 | orgao_id+indicador+ano | Indicadores anuais de 2021 a 2025 |
| `fonte_anual_bruta.csv` | 13.884 | orgao_id+ano+campo | Todos os 178 campos da fonte CNJ, inclusive FTT, área e os campos que não estão no catálogo (`no_catalogo=false`) |
| `ids_indicadores.csv` | 14 | `id` | Indicadores do IDS: melhor resultado (maior ou menor) e peso AHP |
| `alertas_qualidade.csv` | 131 | — | Problemas encontrados na planilha (ver abaixo) |
| `dados_sustentabilidade.json` | — | — | Tudo em um único JSON, exceto a fonte bruta: `meta`, `orgaos`, `indicadores`, `ids_indicadores`, `valores_mensais`, `valores_anuais`, `alertas` |

## Regras de negócio (mantidas da planilha)

- **Ausência e zero:** a ausência de linha significa "não informado"; `0` significa zero confirmado. Os valores `nd`, `NA` e `Inf` não foram exportados como valor. Na fonte bruta, o texto original fica em `valor_original`.
- **Percentuais** (`tipo_valor = percentual_fracao`): são frações, ou seja, 0.25 = 25%.
- **Códigos** (Inv3, Inv4, CompGEE2): são códigos numéricos da fonte e não devem ser somados.
- **Consolidado regional:** só se aplica a `consolidacao = soma`. É a soma dos órgãos com `ativo = true`. Exceção: no histórico mensal de 2021, o consolidado inclui SJMG. Com essas regras, a soma reproduz os 105 totais `TRF1_AJUSTADO` da planilha sem divergência.
- **Cobertura:** o painel mostra quantos meses ou órgãos informaram. Calcule essa cobertura com `COUNT` sobre as linhas existentes.
- **Variação anual:** não é calculada quando o ano tem menos de 12 meses (2026 e 2027).

## Alertas de qualidade (resumo)

| Severidade | Tipo | Qtde | O que é |
|---|---|---|---|
| alta | `valor_invalido` | 1 | SJMT · CPC · jul/2026 contém o texto `","`; foi descartado |
| alta | `percentual_acima_100` | 3 | PRQV 2º grau 2024 (475%), PRAS 2º grau 2024 (185%), PRAS SJAM 2025 (115%) |
| alta | `metodologia_ftt` | 2 | FTT por órgão em 2024 e 2025 é fracionária e muito menor que o total (2º grau: 2553 → 39) |
| alta | `area_zerada` | 1 | `mtotal` = 0 para todos os órgãos em 2024 e 2025, o que impede os indicadores por m² |
| média | `valor_atipico` | 21 | Meses de 2026 muito acima ou abaixo da mediana do ano (ex.: SJGO DPa abr = 3900, mediana 28) |
| média | `salto_anual` | 51 | Valor anual fora da faixa de 10x da mediana de 2021 a 2025 (ex.: QIP 2º grau 2024 = 20.413) |
| média | `lacuna_mensal` | 2 | Meses intermediários vazios (SJDF kWhI, SJRR DPl em 2026) |
| média | `sjmg_zerado` | 1 | SJMG tem registros de 2022 e 2023 zerados na fonte anual |
| baixa | `zero_em_serie` | 48 | Zeros em séries de 2026 que normalmente têm valor; confirmar se são zero real ou falta de dado |
| baixa | `sem_historico` | 1 | RDC não tem nenhum valor |

Os alertas não alteram os dados. Só a célula inválida foi removida.

## Regenerar

```bash
python gerar_dados.py "<planilha.xlsx>" dados_importacao
```
Requer `openpyxl`.
