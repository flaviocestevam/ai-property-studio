# 05 — Etapas de implementação e integração sem trocar o CRM

Nenhuma etapa abaixo foi implementada nesta entrega. A ordem prioriza acesso real e observabilidade antes de autonomia.

| Etapa | Entrega | Critério para avançar |
|---|---|---|
| 0. Congelar baseline | Clone do bundle, branch, testes v6/v7, backup local do usuário | Contagens e origem dos dados documentadas; nenhuma perda |
| 1. Homologar o canal | Perfil/formulário real em sessão permitida; seletores e campos observados | Abrir, preencher, ler de volta e diagnosticar sem envio; evidência real |
| 2. Prova do remoto visível | Um navegador remoto e sua imagem na Central, backend mínimo autenticado | URL/session/page corretos, atraso medido, desconexão identificada, controle exclusivo |
| 3. Persistência central | PostgreSQL, importação idempotente, eventos e leases | Mesmo backup importado duas vezes sem duplicar ou perder histórico |
| 4. Modo supervisionado | Preparação, aprovação por versão, gate e verificação | Um envio autorizado real com aceitação documentada; rejeição não envia |
| 5. Lotes supervisionados | Mapear/preparar/operar 10; pausa, retomada e erro | Ordem e cursor preservados, sem duplicidade e sem retry pós-clique incerto |
| 6. Semiautomático | Snapshot de lote e invalidação seletiva | Alterar mensagem impede envio dessa versão; demais itens seguem corretos |
| 7. Autônomo | Política explícita, horário/quota, kill switch e recuperação | Reinícios, expiração e concorrência testados; evidência auditável de cada resultado |
| 8. Adaptador local opcional | Extensão pareada com mesma fila | Troca de adaptador não duplica itens nem muda confirmações legadas |

Se a etapa 1 ou a prova de acesso remoto falhar por proteção do canal, registrar bloqueador e suspender a promessa de operador remoto nesse canal. Não desenvolver uma sequência de telas que aparente operação concluída. Não usar acessos alternativos para contornar a recusa.

## Áreas propostas de código

No mesmo repositório:

- Preservar `dist/` e `scripts/` existentes.
- Adicionar `dist/operations.js`, `dist/operations.css` e uma seção em `dist/index.html`; incluir adaptador de API por configuração pública.
- Introduzir `packages/contracts/` para estados, eventos e schemas versionados.
- Introduzir `services/operator-api/` e `services/operator-worker/` (TypeScript), com instalação/build próprios, sem exigir framework novo no CRM.
- Introduzir `db/migrations/` e `tests/operator/` para contratos, máquina de estados e integração com navegador.
- Isolar seletores em `services/operator-worker/adapters/sothebys/`; reaproveitar regras de identidade/URL do collector-core com testes.
- Criar `.env.example`, documentação de setup e lockfiles dos novos serviços. Não executar npm/pnpm na raiz estática sem plano de estrutura.

Esses caminhos são propostos, não arquivos que já existam. Não mudar a hospedagem estática de Sites para todo o monorepo por engano: `.openai/hosting.json` continua apontando ao frontend `dist`.

## Migração dos dados

1. No navegador real do usuário, fazer backup JSON antes de mudanças de schema. Dados não podem ser extraídos deste pacote de fonte.
2. Importador suporta o `project/version` atual, chaves opcionais das versões 6 e 7 e registros antigos sem número.
3. Gravar snapshot original, hash, timestamp, ID da importação e mapa de IDs. Confirmar contatos únicos, textos exatos do histórico e flags sent/replied/closed.
4. Histórico `sent` preservado como confirmação manual; novo operador consulta esses contatos antes de reservar envio. Não inferir confirmação de servidor retroativamente.
5. Base central é a verdade depois de reconciliação e autorização; local permanece legível como backup/cache, sem duas escritas concorrentes independentes.
6. Tombstones de exclusão/supressão e cursor devem ser reconciliados; não limpar knownIds ou reiniciar coleta como efeito colateral da migração.
7. Falhas/duplicatas ficam em relatório de reconciliação. Nunca “resolver” removendo histórico.

## Produção e rollback

- Não publicar a versão 7 automaticamente durante o planejamento. Separar PR de estabilização da extensão e PR do operador.
- Desenvolvimento em branch e ambiente de teste do backend, mantendo apenas um Site de produção.
- Central desabilitada por feature flag enquanto não houver API configurada; não mostrar view falsa.
- Fazer adição de componentes e schema compatível antes de migração irreversível. Não descartar campos do backup.
- Manter frontend antigo funcional. Testar CSP/frame-src/connect-src e CORS na origem real antes de liberar a Central.
- Na publicação futura, usar o mesmo project ID e audience atual. Publicar exclusivamente por fluxo suportado de Sites, com commit exato e archive correspondente. Não assumir que push no bundle ou em GitHub atualiza o Site.
- Se o Codex não tiver acesso ao conector Sites, entregar commit/patch e frontend empacotado ao responsável pela publicação. Não inventar um remoto Git de deploy.
- Rollback da UI não desfaz envios reais nem transações do banco. Pausar workers antes de rollback; manter ledger e supressões.

## Decisões ainda necessárias

Método de autenticação do proprietário; provedor do backend/PostgreSQL/storage; orçamento e conta do navegador; política de horários/limites; retenção de evidências; remetente válido; regras do canal e homologação de sucesso. Codex pode preparar código e fixtures sem esses valores, mas não provisionar custos, habilitar envios ou prometer integração ativa sem configurá-los.
