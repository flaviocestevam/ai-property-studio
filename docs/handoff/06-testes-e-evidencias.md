# 06 — Testes e critérios de aceitação

## Evidência existente

Os scripts foram executados novamente nos snapshots publicados e preparados. Os comandos, saídas e exit codes estão em `evidence/published-v6-tests.*` e `evidence/prepared-v7-tests.*`. Todos passaram. São testes Node/VM com fixtures e mocks de DOM/Chrome; não testes de envio no Sotheby’s.

- `verify.mjs`: preenchimento, isolamento do protocolo, alterações manuais, CRUD, importação, registro manual, histórico, numeração, 20 mil contatos, paginação e armazenamento; v7 inclui exclusão por status/todos, stale batches e reset.
- `collector.test.mjs`: domínio, dedup, paginação, propriedade da aba, quotas, checkpoints, retomada; v7 inclui reset e cache de preenchimento por aba/perfil.
- `form-diagnostics.test.mjs`: limites de mensagem, required, validity, consentimento não alterado e botão desabilitado.
- `payload.test.mjs` (v7): captura antes da alteração do fragmento, Unicode e recuperação do payload.

Na sessão de desenvolvimento anterior também houve teste com DOM real em página controlada: formulário criado dinamicamente recebeu cinco campos; edição manual preservada; botão de reaplicar funcionou; formulário recriado foi preenchido. A página temporária foi removida antes de salvar v7. Essa evidência é observação registrada na conversa, não teste Selenium/Playwright reexecutável incluso, e não valida o DOM real do Sotheby’s.

O usuário relatou que o preenchimento real falha. Isso prevalece sobre qualquer alegação genérica de “todos os testes passaram”. Não há evidência de submissão, confirmação real, aprovação por lote, live view ou execução autônoma.

## Matriz obrigatória para o novo operador

| ID | Caso | Evidência exigida | Atual |
|---|---|---|---|
| O01 | Abrir perfil | URL final, ID do corretor, screenshot e session/page ID | Pendente real |
| O02 | Abrir/preencher formulário | Cinco campos corretos lidos após hidratação; dom/trace sanitizado | Controlado passou; real pendente |
| O03 | Aprovação manual | Evento de aprovação vinculada à versão; zero cliques antes dela | Não implementado |
| O04 | Envio autorizado | Tentativa única, aprovação vigente, gate e clique correlacionados | Não implementado |
| O05 | Confirmar resultado | Aceitação do formulário e evidência ligada à tentativa | Não implementado |
| O06 | Pausa e retomada | ACK da pausa, nenhum novo clique, cursor retomado | Coleta simulada passou; operador pendente |
| O07 | Recuperar falha | Crash antes/depois do clique; pós-clique incerto não repete | Não implementado |
| O08 | Duplicidade | Dois workers, duas importações e dois adaptadores não duplicam envio | Dedup local passou; distribuído pendente |
| O09 | Acompanhamento visual | Página real do mesmo job, atraso medido, reconexão e manual lease | Não implementado |
| O10 | Lotes | 10/50/100/200, limites e ordem, checkpoint no meio da página | Coleta simulada passou; envios pendentes |
| O11 | Preservar dados | Contagens, IDs, textos/hashes e confirmações manuais antes/depois | Local passou; migração pendente |

## Casos negativos adicionais

- Domínio, perfil ou aba divergente: interromper antes de preencher/submeter.
- Formulário tardio, recriado, dentro de frame ou com campos customizados: não assumir sucesso se faltarem campos; testar o DOM real correspondente.
- Texto aprovado maior que maxlength: revisão; não truncar nem editar silenciosamente.
- Valores de formulário mudam após aprovação/hidratação: invalidar gate.
- Aprovação expirada, revogada, de outra campanha ou perfil: nenhum envio.
- Alterar modo não habilita envios já rejeitados.
- Conta/sessão sem autorização, origem errada ou viewer sem permissão: nenhum acesso ao stream ou controle.
- Captcha/403/429: parar/pausar conforme causa; sem evasão; sem marcar confirmação.
- HTTP 200 genérico, fechamento do modal ou timeout após clique: revisão, sem retry automático.
- Banco indisponível ao persistir intenção: não clicar. Banco indisponível após clique: resultado incerto, sem novo envio.
- Cancelamento concorrente com dispatch: registro correto do limite irreversível; não prometer desfazer o que foi submetido.
- Live view desconectada, frame antigo, stream da aba errada ou operador e humano simultâneos: impedir condições perigosas e registrar.
- Reinício/rotação da sessão e página do diretório alterada: reconciliar IDs e cursor, não presumir índice fixo eterno.

## Estratégia

Começar com fixtures reexecutáveis para estados e DOM. Depois testes integrados em navegador com o adaptador de sessão e stream. Por último, piloto real autorizado de um contato e lote pequeno. Nunca enviar mensagens comerciais reais apenas para testar uma fixture; testes de submissão em staging usam destinatários controlados. O piloto real exige destinatário/conteúdo autorizados e respeita as regras do canal.

Cada teste registra commit, versão do adaptador, ambiente, execução, resultado esperado/observado, IDs, timestamps e evidência privada. Não incluir credenciais, cookies ou valores pessoais desnecessários. Um teste que usa mock não passa na coluna “real”.

## Reprodução do baseline

Na raiz de cada snapshot:

```bash
node scripts/verify.mjs
node scripts/collector.test.mjs
node scripts/form-diagnostics.test.mjs
```

Na preparada, adicionalmente:

```bash
node scripts/payload.test.mjs
```

Os scripts usam módulos nativos do Node e não precisam instalar pacotes. Execuções desta auditoria usaram Node 24. Não há teste e2e de produção escondido neste pacote.
