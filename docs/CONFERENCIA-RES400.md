# Conferência dos indicadores com a Res. CNJ nº 400/2021

Referência: o **Anexo compilado** da Res. CNJ nº 400/2021, com a redação dada pelas Resoluções nº 550/2024, 594/2024 e 641/2025 (21 temas, 165 itens e 124 variáveis). O texto do Anexo extraído está em `data/reference/anexo-res400-itens.json`. A ligação de cada indicador do iPLS ao Anexo está em `data/reference/anexo-res400.json`.

## Resultado (catálogo com 183 indicadores)

| Situação | Qtde |
|---|---|
| Item do Anexo | 152 |
| Variável usada na fórmula de um item do Anexo (ex.: AC1–AC8, CEEs…IEEo, TMC, VHib/VAltH) | 26 |
| Fora do Anexo vigente: GEE-Esc1, GEE-Esc2, GEE-Tot, GEE-PC e ANT, vindos dos dados de demonstração | 5 |

Os 21 temas mínimos do art. 7º (inclusive "k) descarbonização", da Res. 594/2024) estão cobertos.

## Corrigido (`scripts/apply-annex.ts`)

- **ServCI:** na planilha, ServCI significa *servidores capacitados para elaborar inventários* (variável do CultGEE1). A carga tinha gravado esses dados no **19.16 ServCI** (*servidores indígenas em chefia*). Os 70 lançamentos foram movidos para o novo **20.21 ServCInv**. O próprio Anexo usa a sigla ServCI para os dois conceitos.
- **RDC:** passou a ser o item **21.1**, em **percentual**, como no Anexo (antes era o 21.2, em R$). O ANT, que não consta do Anexo, passou a 21.9.
- **GOT:** passou a ser o item **13.15** do Anexo. O VHib (variável VAltH do RedGEE4) passou a 13.16.
- **Referência oficial:** cada indicador recebeu definição, unidade, periodicidade, forma de preenchimento no PLS-Jud, fórmula e variáveis do Anexo. Essas informações aparecem nos textos de ajuda (ícone ⓘ).

## Divergências pendentes (decisão da gestão)

1. **Tema 20 (Programa Justiça Carbono Zero).** O Anexo vigente organiza o tema em:
   - PlDescarb;
   - Inv1 a Inv5;
   - RedGEE1 a RedGEE6;
   - CompGEE, CompGEE2 e CompGEE4;
   - CultGEE1 e CultGEE2.

   O iPLS tem as variáveis de vários desses itens, mas não os itens em si, e mantém indicadores de demonstração fora do Anexo (GEE-Esc1/2, GEE-Tot, GEE-PC). A fonte do CNJ tem dados para PlDescarb, Inv1, Inv5, RedGEE1, RedGEE3 a RedGEE6, CompGEE4 e CultGEE2. Recomenda-se reestruturar o tema conforme o Anexo e carregar esses dados.
2. **Variáveis gerais 1.1 a 1.15:** no Anexo vigente são **mensais** (dados do MPM/SIESPJ). No iPLS são anuais. Por serem quantidades de pessoal (estoque), o total anual não pode ser a soma dos meses, e a mudança exige regra própria, como usar o último mês ou a média.
3. **6.4 GRE:** é anual no Anexo e mensal no iPLS. É calculado (GEE / m² Total).
4. **Inv3, Inv4 e CompGEE2:** o Anexo pede "sim/não" ou "1, 2 ou 3". O iPLS guarda o código numérico da fonte.
5. **Ainda faltam no iPLS:** os itens do tema 20 citados acima.
