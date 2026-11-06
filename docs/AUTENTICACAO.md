# Acesso ao iPLS

## Quem pode fazer o quê

| Perfil | Como obtém | Pode |
|---|---|---|
| Visitante | Não faz login | Consultar painéis, indicadores, IDS e relatórios de todos os órgãos |
| Leitor | Login de rede, sem grupo do iPLS | O mesmo que o visitante, além de usar o chat de IA e gerar relatório |
| Gestor | Login de rede + grupo `GU-iPLS-Gestores` | Lançar dados, metas, planos e documentos **do próprio órgão** |
| Administrador | Login de rede + grupo `GU-iPLS-Admin` | Lançar em qualquer órgão e alterar o catálogo de indicadores |

O órgão do usuário é definido pelo domínio do AD:

| Domínio | Órgão |
|---|---|
| `trf1.gov.br` | TRF1 — 2º Grau |
| `xx.trf1.gov.br` | SJXX (por exemplo, `ba.trf1.gov.br` → SJBA) |
| `mg.trf1.gov.br` | Somente leitura |

O consolidado da 1ª Região nunca recebe lançamentos, porque é calculado a partir dos órgãos.

## O que configurar no AD da SJRR

1. **Conta de serviço** somente leitura em `rr.trf1.gov.br`, por exemplo `svc-ipls`. Ela não precisa de privilégios: usuários autenticados já leem o Catálogo Global.
2. **Grupos universais** em `rr.trf1.gov.br`: `GU-iPLS-Admin` e `GU-iPLS-Gestores`. Grupos universais aceitam usuários de qualquer domínio da floresta, e grupos aninhados também são considerados.
3. **LDAPS** num controlador de domínio da SJRR, acessível a partir do servidor do iPLS, na porta 3269 (Catálogo Global). Se o certificado for da CA interna, monte o PEM da CA no container e informe o caminho em `LDAP_TLS_CA_FILE`.

## Variáveis (`.env` no servidor)

```
AUTH_MODE=ldap
SESSION_SECRET=<openssl rand -hex 32>
COOKIE_SECURE=true          # atrás de HTTPS
TRUST_PROXY=true            # atrás de proxy reverso (nginx)
LDAP_URL=ldaps://<dc-da-sjrr>:3269
LDAP_BIND_DN=CN=svc-ipls,OU=...,DC=rr,DC=trf1,DC=gov,DC=br
LDAP_BIND_PASSWORD=<senha da conta de serviço>
LDAP_GROUP_ADMIN_DN=CN=GU-iPLS-Admin,OU=...,DC=rr,DC=trf1,DC=gov,DC=br
LDAP_GROUP_GESTORES_DN=CN=GU-iPLS-Gestores,OU=...,DC=rr,DC=trf1,DC=gov,DC=br
```

O login aceita `usuario@ba.trf1.gov.br`, `JFBA\usuario` ou apenas `usuario`; nesse último caso, usa o domínio `AUTH_DEFAULT_DOMAIN`.

## Segurança

- A senha é validada pelo próprio AD (bind do usuário por LDAPS) e nunca é armazenada. Senha vazia é sempre recusada.
- A sessão fica num cookie `HttpOnly` assinado (HMAC-SHA256), válido por 8 horas (`SESSION_HOURS`).
- Há bloqueio temporário após 8 tentativas de login erradas, contadas por IP e usuário.
- Requisições de escrita vindas de outra origem são recusadas.
- As permissões são verificadas no servidor. A auditoria registra o usuário real, e não um usuário informado pelo navegador.

## Modo de teste (sem AD)

Use `AUTH_MODE=dev` e `AUTH_DEV_PASSWORD=<senha>` apenas em ambiente local. Em produção, esse modo exige ainda `AUTH_ALLOW_DEV_IN_PRODUCTION=true`.

Nesse modo, qualquer `nome@xx.trf1.gov.br` entra com a senha de teste. O perfil depende do início do nome:

| Nome começa com | Perfil |
|---|---|
| `admin` | Administrador |
| `leitor` | Leitor |
| qualquer outro | Gestor |
