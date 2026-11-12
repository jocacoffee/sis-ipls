# Integração do iPLS com o SEI do TRF1

Objetivo: o iPLS acompanha processos SEI cadastrados (ex.: o processo do contrato de energia
elétrica de cada órgão), encontra as faturas e os atestos novos, lê o consumo (kWh) e o gasto (R$)
do mês e alimenta os indicadores **CEE** e **GEE** sem digitação.

A leitura das faturas já funciona com o **upload do PDF** (módulo Documentos & OCR). Para buscar os
documentos direto no SEI, é preciso o acesso descrito abaixo.

## Pedido ao administrador do SEI do TRF1 (NUTEC / SECIN)

1. **Versão do SEI** em produção (ex.: 4.0.x, 4.1.x ou 5.x) e se existe **ambiente de homologação**.
2. **Cadastro do sistema** em *Administração → Sistemas*:
   - Sigla: `IPLS`
   - Nome: iPLS — Sistema Inteligente de Gestão do Plano de Logística Sustentável
   - Rede/IP autorizado: IP do servidor do Easypanel da SJRR
3. **Serviço** do sistema, com a **chave de acesso** (identificação do serviço), somente leitura,
   com as operações:
   - `consultarProcedimento` (dados do processo e lista de documentos);
   - `consultarDocumento` (metadados do documento: tipo, número, data, link);
   - operação que retorne o **conteúdo** do documento externo (PDF da fatura), se a versão tiver.
4. **Unidades** às quais o serviço terá acesso: as unidades onde tramitam os processos de energia
   (na SJRR e nas seccionais participantes).
5. **Download do PDF**: se o web service não devolver o conteúdo dos documentos externos, informar
   se o TRF1 usa o módulo REST **mod-wssei** (o mesmo do aplicativo SEI) e se é possível uma conta de
   serviço somente leitura para o iPLS.

O iPLS só **lê**: não cria, assina, tramita nem altera documentos.

## Configuração no iPLS (depois de liberado)

Variáveis de ambiente do servidor (aba Environment do Easypanel), nunca no repositório:

```env
SEI_URL=https://<endereco-do-sei>/sei/controlador_ws.php?servico=sei
SEI_SIGLA_SISTEMA=IPLS
SEI_CHAVE=<chave do serviço>
SEI_ID_UNIDADE=<id da unidade>
```

## Como a fatura vira dado no indicador

1. O texto do PDF é extraído no servidor. PDF escaneado, sem texto, fica pendente com aviso.
2. A IA local extrai competência, unidade consumidora (UC), nº da fatura, consumo em kWh e valor
   total em R$. Expressões regulares conferem os mesmos campos.
3. Checagens: competência válida e não futura, valores positivos, R$/kWh dentro da faixa histórica
   do órgão, sem pico em relação aos meses anteriores e ao mesmo mês do ano anterior, e nenhum
   lançamento manual no mês.
4. Tudo certo: o consumo entra em **CEE** e o gasto em **GEE** como validados, com a fatura como
   origem e registro na auditoria. Qualquer dúvida: o lançamento fica **pendente** em Documentos,
   para o preenchedor ou o master confirmar.
