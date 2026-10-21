# 01 — Auditoria do CRM existente

## Método e limites

Inspeção do Git e dos arquivos, leitura do manifesto de hospedagem, consulta às versões de Sites e ao deployment da versão 6; execução novamente dos testes de ambos os snapshots em 21/10/2026. Evidências em `../evidence/`. Nenhum envio real, coleta de produção ou acesso aos dados locais do usuário foi realizado nesta auditoria.

O documento anexado `estado-completo-corretor-ia-studio.md`, de 27/06/2026, descreve uma plataforma TanStack/Lovable/Supabase para produzir vídeos, personagens e cenas. Seu conteúdo não corresponde ao código deste CRM. Não importar suas tabelas, credenciais ou integrações como se já existissem aqui.

## Arquitetura confirmada

| Item | Evidência no código | Conclusão |
|---|---|---|
| Frontend | `dist/index.html`, `dist/app.js`, CSS | HTML/CSS/JavaScript direto, sem React, Next.js ou TanStack |
| Build | Ausência de `package.json`; manifesto aponta a `dist` | Site estático, sem build de framework |
| Hospedagem | `.openai/hosting.json` | Sites, project ID preservado, somente `static.directory=dist` |
| Banco remoto | Nenhum cliente ou binding de banco | Não existe banco servidor deste CRM no código auditado |
| Banco local | `dist/storage.js` | IndexedDB `ai-property-crm-v1`, versão 1; object store `crm`; chave `state` |
| Compatibilidade anterior | `dist/app.js` | localStorage `ai-property-crm:state:v1` como fonte anterior/fallback |
| Integração | `window.postMessage`, `chrome.runtime` | Comunicação CRM ↔ extensão, não API de operador remoto |
| Extensão | `dist/extension/manifest.json` | Manifest V3; permissões storage/alarms, hosts CRM e Sotheby’s |
| Backend | Ausência de servidor HTTP, jobs remotos ou streaming | Worker MV3 é service worker da extensão Chrome, não servidor hospedado |
| Credenciais/env atuais | Nenhuma variável de serviço no código | Não há API de LLM, navegador remoto ou banco contratada/configurada |

O projeto público e o auth_client_id provisionado pelo serviço Sites não significam que o CRM tenha autenticação de operador implementada. Não há API remota privilegiada hoje.

## Mapa de arquivos reutilizáveis

| Arquivo | Responsabilidade | Reutilização |
|---|---|---|
| `dist/index.html` | Abas Corretores, Mensagem e remetente, Histórico, Extensão; modais | Adicionar entrada Central de Operações sem substituir as abas |
| `dist/app.js` | Estado, CRUD, filtros, mensagens, CSV/JSON, histórico, protocolo de coleta | Extrair adaptadores gradualmente, manter formato antigo |
| `dist/storage.js` | Inicialização e fila de gravações IndexedDB | Backup e migração incremental; cache offline, não fila central |
| `dist/style.css`, `collector.css` | Identidade e layouts | Preservar aparência e legibilidade |
| `extension/collector-core.js` | URLs, identidade por ID, extração DOM, paginação, bloqueios | Base do adaptador Sotheby’s; seletores requerem validação real |
| `extension/directory.js` | Percurso, espera, scroll, páginas e pausa | Referência de checkpoints e tratamento de navegação |
| `extension/background.js` | Job persistido, quota, deduplicação, ACK, alarmes | Reusar o contrato de progresso no novo backend |
| `extension/bridge.js` | Mensagens entre página CRM e extensão | Manter compatibilidade; novo canal exige pareamento/autorização |
| `extension/autofill.js` | Campos, eventos nativos, painel e diagnóstico | Referência de mapeamento; não confirma envio |
| `extension/form-diagnostics.js` | required, validity, maxlength, erros e reCAPTCHA | Regras de validação; presença de reCAPTCHA não é aprovação |
| `extension/payload.js` | Somente v7: captura document_start | Preserva dados por aba/perfil, precisa homologação real |
| `scripts/*.mjs` | Testes VM e fixtures sintéticas | Base de regressão; não equivalem a teste no site externo |

## Estado e registros existentes

Raiz: `{project:'ai-property-crm', version:1, campaign, leads, history}`. Campos opcionais: `nextLeadNumber`, `collectionCheckpoint`, `collectionProgress`; v7 acrescenta exclusões e reinício pendente.

- Campanha: firstName, lastName, email, phone, company, website, subject, message. A assinatura padrão é Laissa; o nome inicial do remetente continua Flavio Cestevam e deve ser configurado pelo usuário. Não trocar silenciosamente remetentes.
- Contato: id interno, number, name, url, region, status, notes, followup, createdAt, openedAt, sentAt, attempt; coletados possuem sourceUrl/sourceKind/locatedAt.
- Histórico: snapshot do texto/remetente, leadId, URL, tipo, timestamp. Eventos hoje são abertura e envio confirmado pelo usuário; não são comprovantes de aceitação pelo servidor.
- Status atuais: `new`, `opened`, `sent`, `replied`, `closed`.
- Uma semente de exemplo, Dasara Zymeri, é criada na base inicial. Não representa coleta de todo o diretório.
- Numeração é atribuída por ordem de inserção, persiste entre filtros e exclusões; não é recalculada pela posição visual. Limpeza total proposta em v7 reinicia o contador.

## Coleta, ordem e retomada

Diretório fixo: `https://www.sothebysrealty.com/eng/associates/int/agent-last-name-high-sort`.

A extensão abre uma aba desse diretório, lê links visíveis de perfis, percorre controles de próxima página/carregar mais, deduplica pelo ID do perfil e limita novos registros a 10/50/100/200. Não usa busca web, nem API externa de contatos.

**A ordem alfabética não é garantida independentemente pelo código.** Ele preserva a ordem apresentada pelo diretório nesse URL. Não há verificação real da direção A–Z/Z–A, da colação ou do comportamento de anúncios destacados. O sufixo `high-sort` não comprova a direção. A função `signature(...).sort()` só compara conjuntos para detectar repetição; não reordena a fila. Homologar a ordenação visível e registrar o parâmetro de ordenação real antes de chamar a fila de A–Z.

Armazenamento da extensão: `ai-property-crm:collector:v1` e `ai-property-crm:directory-progress:v1`. Progresso: sourceUrl, pageUrl, pageNumber, nextIndex, nextAgentId, lastAgent, knownIds e finished. Job: runId, tabId, status, limit, contacts, visited, signatures, ackOffset, timestamps.

O CRM consulta status aproximadamente a cada 3 segundos. Só envia ACK após a gravação local. Há pausa ao fechar aba, interrupção sem resposta e repetição de página. Se o diretório usa URL estática, a retomada pode precisar percorrer páginas anteriores. Mudanças na lista entre execuções podem alterar posições; não é snapshot imutável de 20 mil páginas.

## Mensagens e preenchimento

Não há geração por IA ou personalização por anúncio no CRM atual. Uma mensagem padrão editável é enviada para todos. O CRM codifica o snapshot num fragmento URL `aipropertycrm_v1`, com `autoSubmit:false`. A extensão reconhece inputs/textarea por nome/id/labels/autocomplete e dispara eventos input/change.

Em produção v6/1.2.0: dados vivem na página; o fragmento é removido; observador expira após 180 segundos; só campos vazios e uma mensagem padrão específica são substituídos. Esses são pontos frágeis confirmados no código, não diagnóstico conclusivo da falha relatada pelo usuário.

Preparado v7/1.4.0: payload capturado em document_start e guardado no background por aba/ID de perfil por até 2h; sem prazo de 3min do observador; novos campos são detectados, texto padrão é substituído, alterações manuais são preservadas e botão de reaplicar é explícito. Sem all_frames para formulários em frames. Shadow DOM, mudança de estrutura e controles customizados não foram homologados. Contrato de payload é restrito ao domínio/perfil; nunca autoriza autoSubmit.

## Implementado, preparado e ausente

| Recurso | Situação real |
|---|---|
| CRUD, filtros, paginação, numeração, exportação/backup | Implementado; testes locais passaram |
| Coleta em lote, cursor e deduplicação | Implementado; testes simulados passaram, site real pendente |
| Preenchimento v1.2 | Implementado em produção; falha real relatada pelo usuário |
| Correção v1.4 | Salva, testes VM e DOM controlado; não publicada nem homologada no Sotheby’s |
| Excluir por status/todos e reset da extensão | Salvo em v7; ainda fora da produção |
| Envio | Exclusivamente manual na página; registro manual no CRM |
| Verificação automática de aceitação | Não existe |
| Sessão remota e transmissão visual | Não existem |
| Aprovação individual/lote vinculada ao conteúdo | Não existe |
| Fila remota, worker, migração multidevice | Não existem |
| IA ou comandos em linguagem natural | Não existem |

## Pendências relevantes

1. Falha de preenchimento relatada não reproduzida no site real; 403 do navegador remoto permanece sem solução comprovada. Não apresentar 1.4.0 como correção homologada.
2. Extensão/sessão reais precisam diagnóstico de URL, DOM e campos sem expor valores pessoais; avaliar redirects, frames, formulários dinâmicos e versão instalada.
3. Base do usuário não está disponível no servidor. Não foi apagada nem transferida; solicitar backup pela ferramenta ao iniciar migração.
4. IndexedDB é local. Várias abas não têm coordenação de escrita no banco principal; o evento localStorage não sincroniza as gravações IndexedDB. Risco de lost update deve ser removido antes de multicliente.
5. `persist()` indica sucesso de agendamento antes do commit assíncrono. Algumas mensagens de sucesso podem preceder falha de escrita; o novo backend deve confirmar o commit antes de ACK/resultado.
6. Histórico inteiro é renderizado; escala testada foi de 20 mil contatos, não de 100 mil atividades na UI.
7. Extrair nome do slug é fallback, não prova do nome exibido. Fim de paginação não prova cobertura total. Contagem de 20 mil páginas é meta do usuário, não fato auditado.
8. O bridge usa postMessage no mesmo origin. É comunicação local, não autenticação. Não promovê-lo a autorização de envios remotos.
9. Testes atuais não cobrem envio real, aprovação, streaming ou acesso concorrente do futuro operador.
