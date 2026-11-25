# Agentes de IA e servidor MCP do iPLS

O iPLS oferece às IAs um **catálogo de ferramentas somente de leitura** (`src/server/agent/tools.ts`),
usado de dois jeitos:

1. **Chat do iPLS com ferramentas.** O modelo local decide o que consultar, recebe os números da base
   e só então responde.
2. **Servidor MCP** (`/mcp`). O LM Studio e outros assistentes compatíveis com o Model Context
   Protocol usam as mesmas ferramentas.

O **agente de coleta do SEI** (Fase 3) está descrito em [INTEGRACAO-SEI.md](INTEGRACAO-SEI.md).

## Ferramentas

| Ferramenta | O que devolve |
|---|---|
| `listar_orgaos` | Órgãos da 1ª Região, com sigla e tipo |
| `buscar_indicadores` | Indicadores por palavra, tema ou forma de preenchimento |
| `consultar_indicador` | Valores do mês ou do ano, total, meta e situação de um indicador num órgão; no consolidado, quantos órgãos informaram cada mês |
| `situacao_indicadores` | Panorama do órgão: risco, atenção, conformidade, sem dados |
| `comparar_anos` | Evolução de um indicador ano a ano |
| `comparar_orgaos` | Um indicador em todos os órgãos no exercício |
| `pendencias_preenchimento` | Quem ainda não preencheu os indicadores mensais até um mês |
| `planos_de_acao` | Ações do plano de ação do órgão |
| `alertas` | Inconsistências detectadas nos dados |
| `ids` | IDS do CNJ calculado pelo iPLS |

As ferramentas expõem só o que o iPLS já mostra a visitantes. **Não** expõem trilha de auditoria,
documentos, usuários nem permissões, e **nenhuma grava dados**. Os indicadores de cálculo automático
e o consolidado vêm já calculados, como no restante do sistema.

## Chat com ferramentas

- O chat usa o agente quando o provedor é a IA local (`AI_PROVIDER=local`) e `AI_AGENT` não é
  `off`. Se o agente falhar, o chat cai no modo antigo, com o contexto enviado de uma vez.
- O modelo precisa suportar **tool calling**. O `qwen/qwen3.5-9b` do LM Studio da SJRR foi testado
  e funciona; as respostas levam de 3 a 30 s, conforme o número de consultas.
- `AI_AGENT_MAX_STEPS` (padrão 6) limita as rodadas de consulta por pergunta.
- O log do servidor registra, por pergunta, o usuário, o órgão, o tempo e as ferramentas usadas,
  sem o texto da pergunta.

## Servidor MCP

- **Endereço:** `https://ipls.jfrr.jus.br/mcp` (transporte *Streamable HTTP*, sem sessão).
- **Autenticação:** cabeçalho `Authorization: Bearer <chave>`. As chaves ficam na variável
  `MCP_TOKENS` do servidor, no formato `nome:chave`, separadas por vírgula. Cada chave deve ter
  ao menos 32 caracteres; gere com `openssl rand -hex 32`. O nome aparece no log de cada chamada.
  Sem `MCP_TOKENS`, o MCP fica desligado (404).
- **Proteções:**
  - limite de chamadas por chave (`MCP_RATE_PER_MIN`, padrão 120);
  - chamadas vindas de navegador (com cabeçalho `Origin`) são recusadas;
  - as ferramentas são somente leitura.
- Trate a chave como senha: uma por pessoa ou máquina, para poder revogar só aquela, retirando-a
  de `MCP_TOKENS` e fazendo redeploy.

### LM Studio

No LM Studio, em *Program → Install → Edit mcp.json*, acrescente:

```json
{
  "mcpServers": {
    "ipls": {
      "url": "https://ipls.jfrr.jus.br/mcp",
      "headers": { "Authorization": "Bearer <sua-chave>" }
    }
  }
}
```

Depois, no chat do LM Studio, ative o servidor `ipls` e pergunte, por exemplo: *"Quais seccionais
ainda não lançaram o consumo de energia de outubro de 2026?"*.

Fora da rede da SJRR, a máquina precisa confiar no certificado do iPLS (cadeia da AC interna) e
alcançar o endereço.
