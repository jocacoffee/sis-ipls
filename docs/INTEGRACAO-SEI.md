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

## Situação (nov/2026)

Resposta da TI do TRF1:

- SEI **5.0.3** em produção, com atualização para a **6.0** prevista para o início de 2027.
  Depois da atualização, refaça os testes na homologação antes de ligar em produção.
- Homologação em `seihml.trf1.jus.br`. Pode ficar fora do ar e, durante os testes do banco, aponta
  para uma **cópia da produção**, ou seja, com dados reais: só leitura, sem guardar PDFs fora do iPLS.
- Cadastro do sistema: **processo SEI ao NUPAE**.
- O web service devolve o **conteúdo do documento em Base64**. Use o web service, e não o mod-wssei.
- A Pesquisa Pública não está ativa.

## Agente de coleta (Fase 3) — já implementado

O iPLS já tem o agente de coleta. Ele fica desligado até a configuração abaixo.

- **Processos monitorados** ficam em *Integrações (SEI / CNJ) → Coleta do SEI*, que por enquanto
  só aparece no perfil dev. O administrador cadastra processos de qualquer órgão; o master, do próprio.
- **Coleta:** para cada processo ativo, o agente faz o seguinte:
  1. lista os documentos e filtra pelos tipos configurados (ex.: "Fatura") e pelo nível de acesso
     (só públicos, por padrão);
  2. pula os documentos já vistos;
  3. baixa o PDF de cada documento novo;
  4. passa o PDF pela **mesma leitura do upload manual** (seção abaixo).
- A coleta roda na hora agendada (`SEI_SYNC_HOUR`) ou pelo botão **Sincronizar agora**. Cada
  execução, cada documento e cada lançamento ficam registrados (histórico na tela e auditoria).
- **Modo simulado** (`SEI_MODE=simulado`) para testar sem o SEI: uma pasta com uma subpasta por
  processo (só os dígitos do número) contendo os PDFs e, opcionalmente, um `documentos.json`
  (`[{"arquivo","tipo","numero","data"}]`). Esse modo é bloqueado em produção.

### Configuração (variáveis do servidor, nunca no repositório)

```env
SEI_MODE=soap
SEI_URL=https://seihml.trf1.jus.br/sei/controlador_ws.php?servico=sei
SEI_SIGLA_SISTEMA=IPLS
SEI_CHAVE=<chave do serviço, fornecida pelo NUPAE>
SEI_ID_UNIDADE=<id da unidade>
SEI_OP_LISTAR=<operação que lista os documentos do processo>
SEI_OP_DOCUMENTO=consultarDocumento
SEI_SYNC_HOUR=2
SEI_SOMENTE_PUBLICOS=true
```

### A confirmar na homologação

Os nomes exatos da **operação que lista os documentos do processo** (`SEI_OP_LISTAR`) e dos campos
de retorno do SEI 5.0.3 ainda precisam ser confirmados. Ficam concentrados em `SOAP_FIELDS`
(`src/server/agent/seiClient.ts`) e nas variáveis `SEI_OP_*`, para que o ajuste seja pequeno.
Roteiro do primeiro teste:

1. Cadastre um processo de energia da SJRR na tela e clique em **Sincronizar agora**.
2. No histórico, confira se a lista de documentos veio com tipo, número e nível de acesso.
3. Confira se a fatura foi baixada, lida e conferida (documento LANCADO ou PENDENTE).
4. Se algum campo vier vazio, ajuste `SOAP_FIELDS` e as operações `SEI_OP_*` com base na resposta
   real do serviço.

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
