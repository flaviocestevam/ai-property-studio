# Prompt mestre — copiar para o Codex junto com o pacote

Você continuará o CRM AI Property Studio existente. Não crie outro CRM, Site ou banco de outro projeto. Trabalhe a partir do código fornecido e mantenha a Central de Operações dentro do endereço atual.

## Projeto e fonte exatos

Site: https://ai-property-crm.flaviocostaestevam.chatgpt.site/
Site project ID: `appgprj_6ad79bb203508191a43d35ef3317d7b4`.

O pacote contém `ai-property-crm.git.bundle`, `published-v6/`, `prepared-v7/`, dois archives de fonte, patch, docs e evidências. Não foi confirmado um GitHub deste CRM. Não usar `flaviocestevam/corretor-ia-studio` como fonte: o documento histórico que o cita descreve outra aplicação de vídeos.

Clone o bundle:

```bash
git clone ai-property-crm.git.bundle ai-property-crm
cd ai-property-crm
git switch -c evolution/operator-central
```

Fonte publicada v6: `07fa2f44755bb6f0083dbf766ba38df55e1408a4`, extensão 1.2.0.
HEAD preparado v7: `55180295f8741a0918fd990293665539d2b56c59`, extensão 1.4.0, salvo mas não publicado na auditoria de 21/10/2026.

Não confunda HEAD com produção. Se o estado remoto tiver mudado depois da auditoria, reconcilie antes de qualquer push/deploy. O clone do bundle não tem credenciais nem ligação de publicação com Sites.

Leia nesta ordem: `LEIA-ME.md`, `docs/01-auditoria.md`, `02-arquitetura.md`, `03-especificacao-operador.md`, `04-central-de-operacoes.md`, `05-plano-de-implementacao.md`, `06-testes-e-evidencias.md`, `08-fontes.md`.

## Base já conhecida

Frontend HTML/CSS/JS, buildless, em `dist`. Não usa React, Next.js ou Supabase. `.openai/hosting.json` contém somente project ID e static.directory=dist. Não há backend, banco remoto ou API de LLM. Estado local no IndexedDB `ai-property-crm-v1`, object store `crm`, key `state`, com compatibilidade localStorage `ai-property-crm:state:v1`.

Extensão Chrome MV3, restrita aos hosts deste CRM e www.sothebysrealty.com. Diretório fixo `/eng/associates/int/agent-last-name-high-sort`; segue a ordem visível, que ainda precisa ser validada como alfabética e na direção desejada. Não há garantia independente A–Z. Lotes 10/50/100/200, perfil identificado pelo ID na URL, checkpoint de página/item/último perfil e ACK depois de salvar no CRM.

Mensagens hoje são texto padrão editável; não há personalização por anúncio. Abrir perfil passa snapshot em fragmento `aipropertycrm_v1` e a extensão preenche. Envio é manual. `sent` no legado representa confirmação do usuário, não aceitação automaticamente observada.

O usuário relatou falha real de preenchimento. A v7 corrige perda de payload em recarga/roteamento e limite de observação de 3min; foi testada em fixtures/DOM controlado, sem homologação no Sotheby’s. O navegador remoto anterior recebeu 403 Request blocked. Não declarar o problema resolvido nem usar o 403 como prova de que todos os usuários estão bloqueados. Não tentar evadir controles.

## Objetivo e primeira entrega executável

Evoluir o mesmo CRM para operador observável com autonomia progressiva. Prioridade: provar acesso permitido, preenchimento real e observação da sessão antes de desenvolver autonomia ou telas secundárias.

Primeiro marco: (1) reproduzir baseline e preservar dados; (2) abrir um perfil real autorizado e preencher sem enviar; (3) exibir essa mesma sessão na Central dentro do CRM; (4) implementar revisão/aprovação versionada e executar um envio real somente quando destinatário e conteúdo estiverem autorizados; (5) comprovar aceitação e registrar evidência. Se acesso/canal bloquear, entregar diagnóstico concreto e trabalho independente completo, sem inventar sucesso.

Não publique, contrate serviços pagos ou envie mensagens reais por inferência. Apresente as mudanças de produção propostas antes de executá-las e respeite a autorização específica da sessão de trabalho. Instalar dependências e desenvolver em branch/ambiente de teste são parte da implementação. Não apagar bases locais ou histórico.

## Arquitetura principal

Híbrida: Site atual como interface; API Node/TypeScript + worker persistente; PostgreSQL para fila, aprovações, tentativas, eventos e cursor; storage privado para evidências; Playwright/Chromium remoto com live view, inicialmente Browserbase sujeito ao piloto. Preservar extensão como adaptador local opcional, usando a mesma fila central. Não executar dois adaptadores no mesmo item.

Manter a Central em `/#operacoes`, mesma origem do CRM. Adicionar seção e assets pequenos sem migrar framework desnecessariamente. API pode ter outra origem HTTPS configurável. Configurar CORS exato e autorização de proprietário por requisição; página pública não pode dar controle público sobre navegador/envios. Propor método de autenticação/pareamento e explicar a mudança operacional antes de ativá-lo.

Playwright não fornece stream sozinho. Integrar sessão visual real do provedor ou frames reais de 1–2s via endpoint autenticado. Não iframe do site-alvo, não screenshot fictício e não barra de progresso como substituto. Não usar pointer-events:none como garantia de segurança. CDP/API keys nunca vão ao frontend. View interativa só com lease manual exclusivo; permitir devolver ao operador após revalidar campos e autorização.

Não presumir PostgreSQL/Chromium/Queues já disponíveis no Sites. O frontend estático atual é preservado. Verificar o fluxo suportado do plugin para futuras publicações; não recriar o project ID nem inventar remoto Git.

## Arquivos e estrutura

Reutilize `dist/index.html`, `app.js`, `storage.js`, `style.css`, `collector.css`, `extension/collector-core.js`, `directory.js`, `background.js`, `bridge.js`, `payload.js`, `autofill.js` e `form-diagnostics.js`. Faça refatoração incremental com adaptadores, preservando backup v1.

Estrutura nova proposta: `dist/operations.js`, `dist/operations.css`, `packages/contracts/`, `services/operator-api/`, `services/operator-worker/adapters/sothebys/`, `db/migrations/`, `tests/operator/`, `.env.example`. Esses arquivos novos ainda não existem. Manter o manifesto Sites apontando para o frontend `dist`.

Configuração: OPERATOR_API_BASE_URL pública; DATABASE_URL, BROWSERBASE_API_KEY/PROJECT_ID, SESSION_SIGNING_KEY, SESSION_ENCRYPTION_KEY e storage secrets somente no servidor. OPERATOR_SEND_ENABLED=false por padrão; concorrência inicial 1. Nenhum valor real de segredo está neste pacote. Cookies/contextos de navegador não entram em Git.

## Fila, dados e migração

Preserve numeração permanente, IDs, source URLs, cursor e textos completos do histórico. Contatos/dados reais estão no navegador do usuário e não no repositório. Antes de migrar, obter backup pelo CRM, calcular hash, reconciliar e importar idempotentemente sem substituir ou apagar a base local.

Repetir a importação não duplica. Deduplicar por ID Sotheby’s, inclusive URLs de idiomas diferentes. Preservar sent/replied/closed e tombstones/supressões. `sent` antigo vira manual_legacy, sem ser promovido a confirmação do servidor. Coordenação multicliente precisa resolver lost updates que o IndexedDB atual não trata.

Estados: não pesquisado, mapeado, mensagem preparada, aguardando aprovação, aprovado para envio, envio em andamento, envio confirmado, falha e requer revisão. Não pesquisado é fronteira desconhecida do diretório, não pessoa inventada. Separar estados da coleta, mensagem e tentativa.

Backend com UNIQUE, leases e fencing. Ordem estrita no lote congelado, um consumidor por campanha no início. Eventos append-only com sequência, timestamps e reconexão por último ID. Progresso do worker é persistido a cada transição; sessão do browser não é banco de fila.

## Autonomia

1. Supervisionado: mostra corretor, URL, campos e texto; aguarda aprovação por versão antes de cada clique.
2. Semiautomático: usuário aprova snapshot do lote com destinatários/versões/hashes; versão alterada retorna à revisão.
3. Autônomo: política explicitamente ativada e revogável define campanha, destinatários elegíveis, remetente, templates/variações, horários, quotas, duração e critérios de envio. Materializar a autorização para o conteúdo exato por item.

Não promover de modo por contagem de mensagens. Editar texto/remetente/destinatário ou política invalida a autorização correspondente. LLM gera proposta, nunca permissão. Comandos iniciais podem usar parser determinístico; “preparar” não aprova nem envia.

## Segurança da submissão e resultado

Antes de clicar: conferir perfil/domínio, formulário, campos lidos de volta, validação, conteúdo e remetente exatos, approval hash/expiry, job ativo, lease/fencing, controle manual ausente, quotas e supressões. Registrar intenção durável. Enviar uma única vez pelo mecanismo normal do formulário; respeitar proteção e validação do canal.

Clicar, HTTP 200 genérico, modal fechado ou campo limpo não confirmam envio. Validar sucesso novo do formulário e recibo quando disponível, correlacionados à tentativa. Screenshot/resposta sanitizada/timestamps devem sustentar a confirmação. A aceitação do formulário não prova entrega de e-mail ou leitura.

Crash ou timeout após possível clique = resultado incerto/revisão, sem retry automático. Exactly-once não pode ser prometido para um formulário externo sem chave idempotente. Dois workers, reconexão e troca de adaptador não podem duplicar submissão. Recontato só com regra explícita.

Pausar impede novos cliques após efetivação do gate; parada não desfaz requisição já disparada. Mostrar comando solicitado versus efetivado. Captcha/403/429 ou recusa do site param o fluxo para revisão, sem proxies/identidades rotativas ou bypass. Não contornar autenticação, consentimento ou requisitos do canal.

## Central de Operações

Mostrar navegador real/sessionId/pageId, URL final, número do corretor e posição no lote, ação atual, campos/mensagem, estado da aprovação, erros e eventos, último corretor/cursor. Contadores derivados do backend: preparadas, aprovadas, aceitas pelo formulário, falhas, revisão, com origem da confirmação legada separada.

Controles: Iniciar, Pausar, Continuar, Parar; Aprovar envio, Rejeitar e Editar mensagem; aprovação de lote; modo explícito; assumir/devolver controle manual. Aviso de frame atrasado/offline e bloqueio de envio supervisionado sem observação válida. Autônomo pode continuar sem espectador se política autorizar e worker estiver saudável.

## Testes e evidências

Antes de mudar código, execute:

```bash
node scripts/verify.mjs
node scripts/collector.test.mjs
node scripts/form-diagnostics.test.mjs
node scripts/payload.test.mjs
```

O quarto script existe somente na preparada. Eles são Node/VM; não declará-los como teste e2e de produção. Acrescente regressão de instalação real da extensão, payload após redirect/reload, formulário tardio/recriado, edição manual, dados de outra aba/perfil, frames se encontrados e ausência de autoenvio legado.

Obrigatórios para o operador: abertura do perfil, preenchimento pós-hidratação, aprovação manual, envio autorizado, confirmação de resultado, pausa/retomada, recuperação antes/depois do clique, duplicidade sob concorrência, visualização remota e controle exclusivo, lotes 10/50/100/200 e preservação de dados. Negativos: aprovação revogada/alterada, DOM divergente, stream antigo, worker duplicado, disco/banco indisponível e captcha/403.

Separe fixtures de DOM, integração em navegador e piloto real. Grave commit/ambiente/ID/resultado/evidência para cada teste. Nenhuma função pode ser declarada operacional com base só em mock ou layout. Se depender de conta, segredo ou evidência inacessível, registrar bloqueador específico e concluir o trabalho independente.

## Handoff e publicação

Entregue PR/patch com componentes, migrations, exemplos de configuração sem segredo, comandos de execução, testes/evidências e limites. Explique qual parte foi testada no site real e qual ficou pendente. Não publicar como efeito colateral de preparar a arquitetura; publicar só a mudança aprovada no mesmo Site, com fonte/commit/arquivo de deploy correspondentes.

Não altere o site de marketing AI Property Studio, Radar UK, AI Fashion Cast, projetos Supabase de vídeos ou outros CRMs. Não apague contatos do usuário porque uma mensagem anterior pediu limpeza: esta etapa preserva histórico e pede planejamento da evolução.
