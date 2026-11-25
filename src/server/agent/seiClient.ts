/**
 * Cliente do SEI usado pelo agente de coleta (agent/seiSync.ts).
 *
 * Dois modos, escolhidos por SEI_MODE:
 *  - "soap": web service do SEI do TRF1 (controlador_ws.php), com o sistema "IPLS" cadastrado
 *            pelo NUPAE (sigla + chave de acesso), somente consulta. O conteúdo do documento
 *            vem em Base64 (resposta do TRF1, nov/2026).
 *  - "simulado": lê PDFs de uma pasta local, para testar o fluxo inteiro sem acesso ao SEI.
 *            Bloqueado em produção, salvo SEI_ALLOW_SIMULADO_IN_PRODUCTION=true.
 *
 * Variáveis (modo soap):
 *   SEI_URL              ex.: https://seihml.trf1.jus.br/sei/controlador_ws.php?servico=sei
 *   SEI_SIGLA_SISTEMA    sigla cadastrada (ex.: IPLS)
 *   SEI_CHAVE            chave de acesso do serviço (segredo)
 *   SEI_ID_UNIDADE       id da unidade usada nas consultas
 *   SEI_OP_LISTAR        operação que lista os documentos do processo   (a confirmar com o NUPAE)
 *   SEI_OP_DOCUMENTO     operação que devolve o documento com o conteúdo (padrão consultarDocumento)
 *   SEI_TIMEOUT_S        tempo limite por chamada (padrão 60)
 * Variáveis (modo simulado):
 *   SEI_SIMULADO_DIR     pasta com uma subpasta por processo (padrão data/sei-simulado)
 *
 * ATENÇÃO: os nomes exatos das operações e dos campos de retorno do SEI 5.0.3 do TRF1 devem
 * ser confirmados na homologação (seihml). Estão concentrados em SOAP_FIELDS e nas variáveis
 * SEI_OP_*, para que o ajuste seja pequeno.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface SeiDocumentInfo {
  /** Identificador interno do documento no SEI (IdDocumento). */
  id: string;
  /** Número SEI exibido ao usuário (ex.: 12345678). */
  number?: string;
  /** Tipo do documento (série), ex.: "Fatura", "Nota Fiscal". */
  type: string;
  date?: string;
  /** Nível de acesso informado pelo SEI, se houver (0 = público). */
  accessLevel?: string;
  /** Referência interna do cliente (ex.: arquivo no modo simulado). */
  ref?: string;
}

export interface SeiDocumentContent {
  fileName: string;
  mimeType: string;
  data: Buffer;
}

export interface SeiClient {
  readonly mode: 'soap' | 'simulado';
  listDocuments(processNumber: string): Promise<SeiDocumentInfo[]>;
  getContent(doc: SeiDocumentInfo, processNumber: string): Promise<SeiDocumentContent>;
}

export class SeiConfigError extends Error {}

const env = process.env;

/** Estado da configuração (sem segredos), para a tela e para o agente. */
export function seiStatus(): { mode: 'soap' | 'simulado' | 'desligado'; ready: boolean; message: string; target?: string } {
  const mode = (env.SEI_MODE || '').toLowerCase();
  if (mode === 'soap') {
    const missing = ['SEI_URL', 'SEI_SIGLA_SISTEMA', 'SEI_CHAVE', 'SEI_ID_UNIDADE', 'SEI_OP_LISTAR'].filter(k => !env[k]);
    let host = '';
    try { host = env.SEI_URL ? new URL(env.SEI_URL).host : ''; } catch { host = 'URL inválida'; }
    return missing.length
      ? { mode: 'soap', ready: false, message: `Faltam variáveis: ${missing.join(', ')}.`, target: host }
      : { mode: 'soap', ready: true, message: `Web service do SEI em ${host}.`, target: host };
  }
  if (mode === 'simulado') {
    if (env.NODE_ENV === 'production' && env.SEI_ALLOW_SIMULADO_IN_PRODUCTION !== 'true') {
      return { mode: 'simulado', ready: false, message: 'Modo simulado bloqueado em produção.' };
    }
    const dir = simulatedDir();
    return fs.existsSync(dir)
      ? { mode: 'simulado', ready: true, message: `SEI simulado: PDFs da pasta ${path.relative(process.cwd(), dir) || dir}.` }
      : { mode: 'simulado', ready: false, message: `Pasta do SEI simulado não encontrada (${dir}).` };
  }
  return { mode: 'desligado', ready: false, message: 'Coleta do SEI desligada (defina SEI_MODE).' };
}

export function seiClientFromEnv(): SeiClient {
  const st = seiStatus();
  if (!st.ready) throw new SeiConfigError(st.message);
  return st.mode === 'soap' ? new SoapSeiClient() : new SimulatedSeiClient(simulatedDir());
}

// ------------------------------------------------------------------------------- simulado

const simulatedDir = () => path.resolve(env.SEI_SIMULADO_DIR || path.join(process.cwd(), 'data', 'sei-simulado'));
const folderFor = (processNumber: string) => processNumber.replace(/[^0-9A-Za-z]+/g, '');

/**
 * Uma subpasta por processo, com o número só com dígitos (ex.: 00012345620244018013/),
 * contendo PDFs e, opcionalmente, documentos.json: [{ "arquivo", "tipo", "numero", "data" }].
 */
class SimulatedSeiClient implements SeiClient {
  readonly mode = 'simulado' as const;
  constructor(private dir: string) {}

  async listDocuments(processNumber: string): Promise<SeiDocumentInfo[]> {
    const folder = path.join(this.dir, folderFor(processNumber));
    if (!fs.existsSync(folder)) return [];
    const metaFile = path.join(folder, 'documentos.json');
    const meta: { arquivo: string; tipo?: string; numero?: string; data?: string }[] = fs.existsSync(metaFile)
      ? JSON.parse(fs.readFileSync(metaFile, 'utf-8'))
      : [];
    return fs
      .readdirSync(folder)
      .filter(f => f.toLowerCase().endsWith('.pdf'))
      .sort()
      .map(f => {
        const m = meta.find(x => x.arquivo === f);
        return {
          id: `sim-${crypto.createHash('sha1').update(`${processNumber}/${f}`).digest('hex').slice(0, 12)}`,
          number: m?.numero,
          type: m?.tipo || 'Fatura',
          date: m?.data,
          accessLevel: '0',
          ref: f
        };
      });
  }

  async getContent(doc: SeiDocumentInfo, processNumber: string): Promise<SeiDocumentContent> {
    const file = doc.ref || '';
    const full = path.join(this.dir, folderFor(processNumber), path.basename(file));
    return { fileName: path.basename(file), mimeType: 'application/pdf', data: fs.readFileSync(full) };
  }
}

// ----------------------------------------------------------------------------------- SOAP

/** Nomes dos campos do SEI usados na leitura das respostas (a confirmar na homologação). */
const SOAP_FIELDS = {
  documentId: ['IdDocumento'],
  documentNumber: ['DocumentoFormatado', 'NumeroDocumento'],
  documentType: ['Serie.Nome', 'NomeSerie', 'Serie'],
  documentDate: ['Data', 'DataGeracao'],
  accessLevel: ['NivelAcessoLocal', 'NivelAcessoGlobal', 'NivelAcesso'],
  contentBase64: ['ConteudoBase64', 'Conteudo', 'Arquivo'],
  fileName: ['NomeArquivo', 'Nome'],
  mimeType: ['TipoConteudo', 'MimeType']
};

interface XmlNode {
  name: string;
  children: XmlNode[];
  text: string;
}

/** Leitor de XML mínimo (sem atributos), suficiente para as respostas SOAP do SEI. */
export function parseXml(xml: string): XmlNode {
  const root: XmlNode = { name: '#root', children: [], text: '' };
  const stack: XmlNode[] = [root];
  const re = /<(\/?)([A-Za-z_][\w.\-]*:)?([A-Za-z_][\w.\-]*)([^>]*?)(\/?)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  const decode = (s: string) =>
    s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  xml = xml.replace(/<\?[\s\S]*?\?>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, c) =>
    c.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  );
  while ((m = re.exec(xml))) {
    const top = stack[stack.length - 1];
    if (m[6] !== undefined) {
      top.text += decode(m[6]);
    } else if (m[1]) {
      if (stack.length > 1) stack.pop();
    } else {
      const node: XmlNode = { name: m[3], children: [], text: '' };
      top.children.push(node);
      if (!m[5]) stack.push(node);
    }
  }
  return root;
}

function findAll(node: XmlNode, name: string, out: XmlNode[] = []): XmlNode[] {
  for (const c of node.children) {
    if (c.name === name) out.push(c);
    findAll(c, name, out);
  }
  return out;
}

/** Valor do primeiro campo encontrado (aceita caminho "Pai.Filho"). */
function field(node: XmlNode, candidates: string[]): string | undefined {
  for (const cand of candidates) {
    const parts = cand.split('.');
    let cur: XmlNode | undefined = node;
    for (const p of parts) cur = cur && (cur.children.find(c => c.name === p) || findAll(cur, p)[0]);
    const v = cur?.text.trim();
    if (v) return v;
  }
  return undefined;
}

class SoapSeiClient implements SeiClient {
  readonly mode = 'soap' as const;
  private url = env.SEI_URL!;
  private timeoutMs = Number(env.SEI_TIMEOUT_S || 60) * 1000;

  private envelope(operation: string, params: Record<string, string>): string {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const body = Object.entries(params).map(([k, v]) => `<${k}>${esc(v)}</${k}>`).join('');
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sei="Sei">
<soapenv:Header/><soapenv:Body><sei:${operation}>${body}</sei:${operation}></soapenv:Body></soapenv:Envelope>`;
  }

  private async call(operation: string, params: Record<string, string>): Promise<XmlNode> {
    const auth = {
      SiglaSistema: env.SEI_SIGLA_SISTEMA!,
      IdentificacaoServico: env.SEI_CHAVE!,
      IdUnidade: env.SEI_ID_UNIDADE!
    };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: env.SEI_SOAP_ACTION || 'SeiAction' },
        body: this.envelope(operation, { ...auth, ...params }),
        signal: controller.signal
      });
      const text = await res.text();
      const tree = parseXml(text);
      const fault = findAll(tree, 'Fault')[0];
      if (fault) throw new Error(`SEI recusou ${operation}: ${field(fault, ['faultstring', 'Reason']) || 'erro sem descrição'}`);
      if (!res.ok) throw new Error(`SEI respondeu HTTP ${res.status} em ${operation}.`);
      return tree;
    } catch (err: any) {
      if (err?.name === 'AbortError') throw new Error(`Tempo limite esgotado chamando ${operation} no SEI.`);
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async listDocuments(processNumber: string): Promise<SeiDocumentInfo[]> {
    const tree = await this.call(env.SEI_OP_LISTAR!, { ProtocoloProcedimento: processNumber });
    // Cada documento é um elemento que contém IdDocumento
    const parents: XmlNode[] = [];
    const collect = (node: XmlNode) => {
      for (const c of node.children) {
        if (c.children.some(x => SOAP_FIELDS.documentId.includes(x.name))) parents.push(c);
        else collect(c);
      }
    };
    collect(tree);
    return parents
      .map(p => ({
        id: field(p, SOAP_FIELDS.documentId) || '',
        number: field(p, SOAP_FIELDS.documentNumber),
        type: field(p, SOAP_FIELDS.documentType) || '',
        date: field(p, SOAP_FIELDS.documentDate),
        accessLevel: field(p, SOAP_FIELDS.accessLevel)
      }))
      .filter(d => d.id);
  }

  async getContent(doc: SeiDocumentInfo): Promise<SeiDocumentContent> {
    const tree = await this.call(env.SEI_OP_DOCUMENTO || 'consultarDocumento', {
      ProtocoloDocumento: doc.number || doc.id,
      SinRetornarAndamentoGeracao: 'N',
      SinRetornarAssinaturas: 'N',
      SinRetornarPublicacao: 'N',
      SinRetornarCampos: 'N'
    });
    const b64 = field(tree, SOAP_FIELDS.contentBase64);
    if (!b64) throw new Error(`O SEI não devolveu o conteúdo do documento ${doc.number || doc.id}.`);
    return {
      fileName: field(tree, SOAP_FIELDS.fileName) || `SEI-${doc.number || doc.id}.pdf`,
      mimeType: field(tree, SOAP_FIELDS.mimeType) || 'application/pdf',
      data: Buffer.from(b64.replace(/\s+/g, ''), 'base64')
    };
  }
}
