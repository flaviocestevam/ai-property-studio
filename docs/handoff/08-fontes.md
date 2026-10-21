# 08 — Fontes verificadas e natureza das recomendações

Consultadas em 21/10/2026. Preços/limites podem mudar; o Codex deverá conferir SDK e plano vigentes na implementação. A recomendação de arquitetura é decisão técnica desta auditoria, não garantia de acesso ao Sotheby’s.

## Evidência primária do próprio projeto

- Código e histórico Git inclusos, commits publicados/preparados discriminados no LEIA-ME.
- `.openai/hosting.json` dos snapshots: configuração estática, mesmo project ID.
- Respostas sanitizadas de versões e deployment em `evidence/site-state.json`.
- Testes com saídas/exit codes em `evidence/`; classificação explícita como simulados.
- Documento histórico enviado pelo usuário: considerado para excluir a confusão com a aplicação TanStack/Supabase, sem copiar sua arquitetura para o CRM.
- Documentação do plugin Sites consultada: armazenamento D1/R2 requer bindings e migrações; frontend atual não os declara. Nenhum serviço adicional foi provisionado.

## Documentação externa oficial

1. Browserbase, live view: https://docs.browserbase.com/platform/browser/observability/session-live-view — observação/controle interativos e integração na aplicação. A interface proposta ainda não foi integrada.
2. Browserbase, preços: https://www.browserbase.com/pricing — planos e unidades usados no orçamento ilustrativo. Sem cotação de outros serviços.
3. Browserbase, timeout: https://docs.browserbase.com/platform/browser/long-sessions/timeouts — sessão tem limite; duração máxima documentada de 6h.
4. Browserbase, keep alive: https://docs.browserbase.com/platform/browser/long-sessions/keep-alive — reconexão em planos pagos; sessões precisam ser liberadas para evitar consumo ocioso.
5. Browserbase, contextos: https://docs.browserbase.com/platform/browser/core-features/contexts — persistência de dados de navegação entre sessões. Não substitui ledger de negócio.
6. Playwright, conexão CDP: https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp — conexão Chromium por CDP tem limitações em relação ao protocolo próprio. Validar métodos necessários no SDK selecionado.
7. Playwright, estado autenticado: https://playwright.dev/docs/auth — estado do navegador pode conter cookies sensíveis; não incluí-lo em repositório.
8. Cloudflare Workers, limites: https://developers.cloudflare.com/workers/platform/limits/ — isolates e limites de memória. Serviços gerais da Cloudflare não são automaticamente suportados/configurados no Sites auditado.
9. PostgreSQL SELECT e locking: https://www.postgresql.org/docs/current/sql-select.html — bloqueio e SKIP LOCKED como base possível de reserva transacional. A fila descrita é proposta própria; não está no CRM atual.

Não foram usados tutoriais de terceiros como base de afirmações técnicas. Números de desempenho e totais de contatos/páginas do diretório não foram verificados; exemplos de custo são hipóteses aritméticas, não benchmark nem promessa de throughput.
