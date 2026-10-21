# 03 — Especificação funcional do operador

Proposta, não implementação. O operador atua somente nas páginas autorizadas do Sotheby’s; política de navegação exata e validação em todo redirect. Requisições normais de recursos do site podem usar seus domínios de assets/captcha; isso não amplia o escopo de prospecção. Não pesquisar outras redes/sites nem substituir o canal por e-mail sem instrução.

## Estados

Separar estado de descoberta de estado da mensagem/tentativa. Um corretor pode ter histórico respondido e uma mensagem nova em revisão; não perder esse histórico numa única coluna.

| Estado exibido | Significado e saída |
|---|---|
| Não pesquisado | Fronteira do diretório ainda não visitada; não criar pessoas fictícias para representá-la |
| Mapeado | Perfil válido, identidade e origem registradas |
| Mensagem preparada | Versão de texto e remetente materializados, ainda sem autorização |
| Aguardando aprovação | Formulário revisável e versão aguardando decisão |
| Aprovado para envio | Aprovação válida para destinatário, sender e conteúdo exatos |
| Envio em andamento | Tentativa reservada; registrar se o clique já foi disparado |
| Envio confirmado | Página confirmou aceitação do formulário, com evidência; não significa entrega na caixa postal |
| Falha | Erro explícito conhecido; classificar se aconteceu antes ou depois do clique |
| Requer revisão | Resultado incerto, versão alterada, campo desconhecido, bloqueio, estrutura divergente ou aprovação inválida |

Rejeitado e cancelado são resultados de decisão/job, preservados nos eventos. `replied` e `closed` do legado continuam acessíveis. `sent` antigo é importado com `confirmation_source=manual_legacy`, sem promover a confirmação automática.

## Modos configuráveis e reversíveis

| Modo | Gate do envio | Mudança de conteúdo |
|---|---|---|
| Supervisionado | Aprovação individual após visualizar destinatário, campos e mensagem | Nova versão exige nova aprovação |
| Semiautomático | Aprovação de um snapshot de lote com IDs e hashes exatos | Só item alterado volta à revisão, não enviar versão diferente |
| Autônomo | Política explicitamente ativada com escopo, remetente, template/variantes permitidas, limites, horário, duração e critérios de elegibilidade | Conteúdo fora da regra requer revisão; guardar decisão da política por item |

Aprovação tem ator, timestamp, expiração/revogação, campaign_version, agent/profile ID, sender_hash e message_hash. No autônomo, materializar uma aprovação de política da versão exata antes de executar. Alterar modo não é promoção automática; invalidar permissões incompatíveis e pausar até reconciliar fila. LLM ou texto externo nunca autoriza submissão.

## Fluxo por item

1. **Reservar:** selecionar próximo elegível na ordem congelada do lote. Validar supressões, confirmações anteriores, lease, política, quota e sessão. Gerar attempt_id.
2. **Abrir:** navegar ao perfil canônico, conferir domínio e ID após redirects. Registrar session/page IDs, URL final, horário e evidência. Sem lista de URLs alternativas para contornar bloqueio.
3. **Identificar:** localizar contact/send-message e abrir o formulário pela interface. Seletores semânticos do DOM validado. Se houver múltiplos formulários/frames, identificar o do corretor; não preencher newsletter ou formulário de outro destinatário.
4. **Preparar:** nome/sobrenome/email/telefone/mensagem vêm da campanha/versão. LLM opcional só com fontes verificadas; não inventar dados do anúncio. Verificar required, maxlength, email, formato de telefone, controles customizados e erros. Não truncar texto aprovado silenciosamente.
5. **Preencher:** usar APIs normais do navegador e verificar os valores lidos novamente após renderização/hidratação. Registrar mapa de campos e hashes, não segredos ou dados pessoais em logs abertos.
6. **Revisar:** publicar evento de preparação com snapshot do destinatário e mensagem; no supervisionado, aguardar a aprovação correta. Ao aguardar, liberar lease de processamento se necessário, mantendo bloqueio lógico de submissão. Antes de voltar, revalidar página e campos.
7. **Autorizar:** imediatamente antes do clique, recalcular hashes e conferir destinatário, aprovação vigente, política, job não pausado/parado, fencing token atual, dono do controle e ausência de tentativa confirmada/incerta. Mudança em qualquer campo deve invalidar a autorização aplicável.
8. **Submeter:** gravar a intenção durável e marcar dispatch_started; disparar uma submissão única pelo mecanismo normal do formulário. Não chamar endpoints internos não documentados para pular validação/captcha.
9. **Verificar:** observar resposta do fluxo real e estado visível associado ao formulário. Guardar recibo/correlation ID se houver, trecho de resposta sanitizado, screenshot após resposta e timestamp. Atualizar estado com evidência.
10. **Persistir e avançar:** commit de resultado, evento e cursor. Só depois avançar ao próximo. Falha no banco após possível submissão gera revisão e nunca retry cego.

## Confirmação de resultado

Critérios a validar no piloto do site real: transição nova para mensagem de sucesso do formulário, recibo específico quando fornecido e ausência de erros de validação. Resposta HTTP 200 genérica, botão clicado, formulário fechado, textarea limpa ou captura isolada não confirmam aceitação. Se sucesso e erro coexistirem ou faltar correlação com a tentativa atual, revisão.

Uma resposta positiva de aceitação pode confirmar o formulário, mas não leitura, caixa de entrada nem entrega de e-mail. A interface deverá distinguir essas semânticas. A regra do adaptador deve ser versionada e acompanhada do fixture que reproduz a evidência observada no canal.

## Duplicidade e recuperação

Identidade estável é o ID do perfil na URL, não nome, região ou UUID recém-importado. Prevenir duplicatas entre idiomas e importações. Registrar supressão de contatos excluídos/encerrados e envios legados antes de reservar.

Aprovação e deduplicação são problemas diferentes: chave de tentativa inclui workspace, campanha, perfil e versão aprovada; regra de contato limita reenvios ao mesmo perfil/campanha mesmo se o texto mudar. Nova mensagem não libera repetição automática. Recontato só por regra explícita autorizada.

Banco com UNIQUE e lease/fencing evita dois workers dispararem o mesmo item. Não prometer exactly-once ao formulário externo, que pode não oferecer idempotency key. Se o processo cair após o clique e antes do resultado durável: `requires_review`, preservar attempt_id e não repetir automaticamente. Antes do clique, falhas transitórias podem ter retries limitados com backoff; o limite deve ser configurado e testado.

403/429, captcha ou recusa do site pausam o item/campanha conforme classificação. Exibir evidência e solicitar revisão; não trocar proxies, rotacionar identidades nem resolver proteção automaticamente. Não tratar um 403 genérico como prova de bot detection sem evidência específica.

## Pausa, parada e controle manual

Pausar impede novos itens e novos cliques após o gate; uma requisição já disparada precisa ser reconciliada. Parar encerra o job e libera sessão de forma segura; não desfaz um envio. Registrar a diferença entre comando recebido e pausa/parada efetivada. Não mostrar “parado” enquanto o worker ainda controla a página.

Takeover: backend solicita pausa, aguarda ACK do worker, concede lease manual e incrementa fencing token. Só um controlador. Registrar ações manuais e eventual submissão como manual, com evidência independente; devolver controle não conta como aprovação. Revalidar hashes, sessão e destinatário para continuar.

## Comandos do usuário

Parser determinístico inicial aceita mapear/preparar/enviar/pausar/continuar/parar, com lotes 10/50/100/200. Mostrar interpretação concreta antes de ações consequentes. “Prepare 100” não aprova nem envia. “Inicie os envios aprovados” usa apenas versões aprovadas. Comando ambíguo não escolhe campanha ou destinatários silenciosamente. Modelo de linguagem, se adicionado depois, produz apenas comando estruturado validado pela API.
