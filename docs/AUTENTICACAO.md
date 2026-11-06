# Acesso ao iPLS

O **AD só autentica**: cada pessoa entra com o próprio usuário e senha de rede da floresta `trf1.gov.br`. **Quem pode fazer o quê é decidido no próprio iPLS**, por delegação, na tela **Usuários e Permissões**. Não é preciso criar grupos de segurança no AD.

## Papéis

| Papel | Quem concede | Pode |
|---|---|---|
| Visitante (sem login) | — | Consultar painéis, indicadores, IDS e relatórios de todos os órgãos |
| Logado sem papel | — | O mesmo que o visitante, além de usar o chat de IA e gerar relatório |
| **Preenchedor** | Master do órgão (ou administrador) | Lançar e corrigir medições e documentos **do próprio órgão** |
| **Master do órgão** | Administrador regional | Tudo o que o preenchedor faz, mais **metas e plano de ação** do órgão; concede e revoga preenchedores do órgão |
| **Administrador regional** | Configuração do servidor (`IPLS_ADMINS`) ou outro administrador | Nomear masters e administradores, lançar em qualquer órgão, alterar o catálogo de indicadores |

Regras da delegação:

- O master só concede o papel de **preenchedor**, só para o **próprio órgão** e só para usuários do **domínio do próprio órgão** (ex.: o master da SJBA só dá acesso a `usuario@ba.trf1.gov.br`). Exceções são feitas pelo administrador regional.
- Ninguém altera ou revoga a própria permissão.
- Uma permissão pode ter **validade**, útil para o piloto. Depois do prazo, o usuário passa a apenas consultar.
- Revogações valem **na hora**, inclusive para quem já está logado.
- Toda concessão, alteração e revogação fica na **auditoria**: quem fez, para quem, antes e depois.
- O consolidado da 1ª Região nunca recebe lançamentos, porque é calculado a partir dos órgãos.

O órgão padrão de cada pessoa sai do domínio do AD:

| Domínio | Órgão |
|---|---|
| `trf1.gov.br` | TRF1 — 2º Grau |
| `xx.trf1.gov.br` | SJXX |
| `mg.trf1.gov.br` | Somente consulta |

## O que configurar

No AD, **nada além de LDAPS**: um controlador de domínio da SJRR com o Catálogo Global (porta 3269) acessível a partir do servidor do iPLS. O login é validado com as credenciais da própria pessoa (`JFBA\usuario`), sem conta de serviço.

No `.env` do servidor:

```
AUTH_MODE=ldap
IPLS_ADMINS=<usuario>@<secao>.trf1.gov.br          # primeiros administradores regionais
SESSION_SECRET=<openssl rand -hex 32>
COOKIE_SECURE=true                            # atrás de HTTPS
TRUST_PROXY=true                              # atrás de proxy reverso (nginx)
LDAP_URL=ldaps://<dc-da-sjrr>:3269
LDAP_TLS_CA_FILE=/caminho/ca-interna.pem      # se o certificado for da CA interna
```

Opcional: `LDAP_BIND_DN` e `LDAP_BIND_PASSWORD` de uma conta somente leitura. Ela serve apenas para mostrar o nome completo de quem recebe acesso antes do primeiro login dessa pessoa.

## Fluxo sugerido para o piloto

1. Você (em `IPLS_ADMINS`) entra e, em **Usuários e Permissões**, nomeia o master de cada seção participante e, se quiser, a área de PLS do TRF1 como administradora.
2. Cada master entra e cadastra os preenchedores da própria seção, com validade até o fim do piloto.
3. As demais pessoas acessam o endereço do iPLS sem login para consultar.

## Segurança

- A senha é validada pelo AD por LDAPS e nunca é armazenada. Senha vazia é sempre recusada.
- A sessão fica num cookie `HttpOnly` assinado, válido por 8 horas (`SESSION_HOURS`), e guarda só a identidade. O papel é lido do banco a cada requisição.
- Há bloqueio temporário após 8 tentativas de login erradas.
- Requisições de escrita vindas de outra origem são recusadas.
- As permissões são verificadas no servidor.
- A tela sempre mostra o que está no banco. O cache do navegador não reenvia dados.

## Modo de teste (sem AD)

Use `AUTH_MODE=dev` com `AUTH_DEV_PASSWORD=<senha>`, apenas em ambiente local. Em produção, esse modo exige ainda `AUTH_ALLOW_DEV_IN_PRODUCTION=true`.

Nesse modo, qualquer `nome@xx.trf1.gov.br` entra com a senha de teste, e os papéis seguem as mesmas regras (`IPLS_ADMINS` e a tela de permissões).
