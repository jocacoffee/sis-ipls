/**
 * Servidor MCP (Model Context Protocol) do iPLS — somente leitura.
 *
 * Permite que o LM Studio (ou outro assistente compatível com MCP) consulte os dados do PLS
 * usando as mesmas ferramentas do chat do iPLS (agent/tools.ts).
 *
 * Endereço: POST /mcp  (transporte "Streamable HTTP", sem sessão)
 * Autenticação: cabeçalho "Authorization: Bearer <chave>".
 *
 * Variáveis de ambiente:
 *   MCP_TOKENS   chaves aceitas, separadas por vírgula, no formato nome:chave
 *                (ex.: "lmstudio-semad:9f3c...,assistente-sjba:7ab1..."). O nome aparece nos logs.
 *                Cada chave deve ter ao menos 32 caracteres. Vazio = MCP desligado (404).
 *   MCP_RATE_PER_MIN  chamadas por minuto por chave (padrão 120)
 */
import crypto from 'crypto';
import express, { Request, Response, NextFunction } from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { runTool, TOOLS } from './tools';

interface McpClient {
  name: string;
  hash: Buffer;
}

const sha = (s: string) => crypto.createHash('sha256').update(s).digest();

/** Lê MCP_TOKENS; chaves curtas são ignoradas (com aviso). */
function loadClients(): McpClient[] {
  const raw = process.env.MCP_TOKENS || '';
  const clients: McpClient[] = [];
  raw.split(',').map(s => s.trim()).filter(Boolean).forEach((entry, k) => {
    const idx = entry.indexOf(':');
    const name = idx > 0 ? entry.slice(0, idx).trim() : `cliente-${k + 1}`;
    const token = idx > 0 ? entry.slice(idx + 1).trim() : entry;
    if (token.length < 32) {
      console.warn(`[MCP] Chave "${name}" ignorada: use ao menos 32 caracteres.`);
      return;
    }
    clients.push({ name, hash: sha(token) });
  });
  return clients;
}

const INSTRUCTIONS = `Servidor MCP do iPLS — Plano de Logística Sustentável da Justiça Federal da 1ª Região (Resolução CNJ nº 400/2021).
Ferramentas somente de leitura: órgãos, indicadores, valores mensais/anuais, metas, situação, comparações, pendências de preenchimento, alertas, planos de ação e IDS.
Órgãos pela sigla (SJRR, SJBA, TRF1-2G...) ou "TRF1" para o consolidado regional. Indicadores pelo código (6.1) ou sigla (CEE).
Use sempre os números devolvidos pelas ferramentas; não invente valores.`;

function buildServer(clientName: string): Server {
  const server = new Server(
    { name: 'ipls', version: '1.0.0' },
    { capabilities: { tools: {} }, instructions: INSTRUCTIONS }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.parameters,
      annotations: { readOnlyHint: true, openWorldHint: false }
    }))
  }));
  server.setRequestHandler(CallToolRequestSchema, async request => {
    const { name, arguments: args } = request.params;
    const t0 = Date.now();
    const { ok, result } = runTool(name, args || {});
    console.log(`[MCP] ${clientName} · ${name} ${JSON.stringify(args || {}).slice(0, 200)} · ${Date.now() - t0} ms${ok ? '' : ' · erro'}`);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 1) }],
      isError: !ok
    };
  });
  return server;
}

export function createMcpRouter() {
  const router = express.Router();
  const clients = loadClients();
  const ratePerMin = Math.max(10, Number(process.env.MCP_RATE_PER_MIN || 120));
  const calls = new Map<string, { windowStart: number; count: number }>();

  if (clients.length === 0) {
    router.use((_req, res) => res.status(404).json({ error: 'Servidor MCP desligado (defina MCP_TOKENS).' }));
    return router;
  }
  console.log(`[MCP] Servidor MCP ativo em /mcp (${clients.length} chave(s)).`);

  const authenticate = (req: Request, res: Response, next: NextFunction) => {
    // Navegadores não devem chamar o MCP (proteção contra DNS rebinding / sites de terceiros)
    if (req.headers.origin) return res.status(403).json({ error: 'Origem não permitida.' });
    const header = String(req.headers.authorization || '');
    const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
    const h = sha(token);
    const client = token ? clients.find(c => crypto.timingSafeEqual(c.hash, h)) : undefined;
    if (!client) {
      res.setHeader('WWW-Authenticate', 'Bearer realm="ipls-mcp"');
      return res.status(401).json({ error: 'Chave MCP ausente ou inválida.' });
    }
    const now = Date.now();
    const w = calls.get(client.name);
    if (!w || now - w.windowStart > 60_000) calls.set(client.name, { windowStart: now, count: 1 });
    else if (++w.count > ratePerMin) return res.status(429).json({ error: 'Limite de chamadas por minuto excedido.' });
    (req as any).mcpClient = client.name;
    next();
  };

  router.post('/', authenticate, async (req: Request, res: Response) => {
    const server = buildServer((req as any).mcpClient);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => {
      transport.close().catch(() => undefined);
      server.close().catch(() => undefined);
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error('[MCP] Erro ao atender requisição:', err);
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Erro interno.' }, id: null });
      }
    }
  });

  // Sem sessão: não há fluxo SSE (GET) nem encerramento de sessão (DELETE)
  router.all('/', authenticate, (_req, res) => {
    res.status(405).set('Allow', 'POST').json({ jsonrpc: '2.0', error: { code: -32000, message: 'Método não permitido.' }, id: null });
  });

  return router;
}
