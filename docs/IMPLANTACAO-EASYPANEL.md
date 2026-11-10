# Implantação do iPLS no Easypanel (SJRR)

O iPLS sobe no Easypanel como um serviço **Compose** com fonte **Git**, usando o arquivo
`docker-compose.easypanel.yml`. Ele cria dois contêineres: a aplicação (`ipls-app`, porta 3000)
e o PostgreSQL 16 (`postgres`, só na rede interna).

## 1. Repositórios

| Remote | Endereço | O que vai para lá |
|---|---|---|
| `origin` | `github.com/jocacoffee/sis-ipls` | Todo o desenvolvimento (branches de trabalho) |
| `trf1` | `github.com/trf1-rr/ipls` | Só a `main` com versões estáveis e as tags (`v0.1.0`, ...) |

```bash
git remote add trf1 git@github.com:trf1-rr/ipls.git
```

Publicar uma versão estável:

```bash
git checkout main
git merge feat/...            # a branch com o trabalho concluído
git tag -a v0.1.0 -m "Piloto SJRR"
git push origin main v0.1.0
git push trf1 main v0.1.0
```

O Easypanel faz o deploy da branch `main` do `trf1-rr/ipls`. Por isso, só envie para lá o que
deve ir para o servidor.

## 2. Fonte (aba Source → Git)

| Campo | Valor |
|---|---|
| Repository URL | `git@github.com:trf1-rr/ipls.git` (repositório privado: use o endereço SSH) |
| Branch | `main` |
| Build Path | `/` |
| Docker Compose File | `docker-compose.easypanel.yml` |

**Repositório privado:**
1. Clique em **Generate SSH Key** e copie a chave pública.
2. No GitHub, abra `trf1-rr/ipls` → Settings → **Deploy keys** → Add deploy key.
3. Cole a chave e **não** marque "Allow write access". Assim, o servidor só consegue ler o repositório.

## 3. Variáveis (aba Environment)

Obrigatórias: o deploy falha se faltarem.

```env
POSTGRES_PASSWORD=<senha forte e exclusiva do servidor>
SESSION_SECRET=<64 caracteres hexadecimais aleatórios>
```

Para gerar o `SESSION_SECRET`:

```bash
openssl rand -hex 32
```

Autenticação no AD:

```env
AUTH_MODE=ldap
AUTH_DEFAULT_DOMAIN=rr.trf1.gov.br
LDAP_URL=ldaps://<controlador-de-dominio>:3269
IPLS_ADMINS=<login@rr.trf1.gov.br dos administradores, separados por vírgula>
```

Opcionais:

- **IA local:** `AI_PROVIDER`, `LOCAL_AI_ENDPOINT` e `LOCAL_AI_MODEL`. O endpoint precisa ser
  acessível a partir do servidor; `localhost` é o próprio contêiner.
- **Sessão:** `SESSION_HOURS`.

O compose já traz estes padrões:

- `COOKIE_SECURE=true` e `TRUST_PROXY=true`: o Easypanel publica o serviço por HTTPS, atrás de proxy.
- `LDAP_TLS_CA_FILE=/app/certs/ac-trf1.pem`: a cadeia pública da AC TRF1, versionada em `certs/`.

> Nunca use `AUTH_MODE=dev` nem `AUTH_ALLOW_DEV_IN_PRODUCTION` no servidor.

## 4. Domínio (aba Domains)

Aponte o domínio (ex.: `ipls.rr.trf1.gov.br`) para o serviço **`ipls-app`**, porta **3000**, com HTTPS.
O compose não publica portas no host; o acesso é só pelo domínio.

## 5. Primeiro deploy e dados

Na primeira subida, o banco está vazio e a aplicação importa `data/database.json`. Esse arquivo
contém os 16 órgãos, o catálogo, as medições de 2021 a 2026 e os complementos do IDS. Ele não
contém auditoria nem permissões. Confira nos logs do serviço `ipls-app`:

```
[StorageEngine] PostgreSQL vazio: base inicial importada de data/database.json (27067 medições).
```

Depois disso, o PostgreSQL do servidor passa a ser a fonte dos dados. Novos deploys **não**
reimportam o arquivo, porque o volume `pgdata` é mantido.

Para atualizar `data/database.json` com o conteúdo do banco local, antes de publicar uma versão:

```bash
DATABASE_URL=postgresql://... npm run db:export
```

## 6. Backup

O volume `pgdata` guarda todos os dados do sistema. Agende um dump diário, pelo console do
serviço `postgres` ou por uma tarefa no servidor:

```bash
pg_dump -U ipls_admin -d ipls_db -n ipls -Fc > ipls-$(date +%F).dump
```

Para restaurar o dump, pare o `ipls-app` antes. Ele mantém os dados em memória e sobrescreveria
a restauração.

```bash
pg_restore -U ipls_admin -d ipls_db --clean -n ipls ipls-AAAA-MM-DD.dump
```

## 7. Checklist do piloto

- [ ] O deploy terminou e o `/health` responde pelo domínio.
- [ ] O painel abre sem login (visualização anônima).
- [ ] O login com usuário do AD da SJRR funciona.
- [ ] O administrador (IPLS_ADMINS) vê a tela de Permissões e delega o master de cada seccional.
- [ ] Um lançamento de teste fica gravado depois de reiniciar o serviço. Remova o lançamento depois.
- [ ] O backup do banco foi agendado e testado uma vez.
