# 04 — Central de Operações no endereço atual

Especificação de interface futura, não tela implementada. Local: mesma origem do CRM, aba “Central de Operações”, rota inicial `/#operacoes`. Não criar outro Site ou mandar o usuário a outro painel para acompanhar a execução cotidiana.

## Composição

| Região | Conteúdo e comportamento |
|---|---|
| Cabeçalho | Campanha, modo ativo, adaptador remoto/local, conectado/pausado/offline, botão Parar sempre acessível |
| Área principal, aproximadamente 65% no desktop | Navegador da sessão efetiva; view interativa controlada ou frames atualizados a cada 1–2s |
| Barra do navegador | Nome do corretor, número permanente, posição no lote, ID do perfil, URL final, sessionId/pageId e horário do último frame |
| Painel lateral | Primeiro/sobrenome/email/telefone, texto exato, versão, aprovação e validações de campos |
| Controles de execução | Iniciar, Pausar, Continuar, Parar, quantidade, modo e escopo |
| Decisão | Aprovar envio, Rejeitar, Editar mensagem; também aprovar snapshot do lote no semiautomático |
| Controle manual | Assumir controle / Devolver ao operador; mostrar quem tem o lease e quando foi confirmado |
| Rodapé operacional | Preparadas, aprovadas, aceitas pelo formulário, falhas e revisão; cursor e último corretor processado |
| Histórico | Timeline paginada de eventos, tentativas, versões, erros e links privados de evidência |
| Entrada de comando | Comando textual com interpretação estruturada e campanha/limite visíveis |

Em mobile: navegador acima, mensagem/decisão abaixo e controles essenciais fixos; não ocultar o destinatário na área de aprovação.

## Regras de visualização

- Tela mostra a sessão e aba efetivamente controladas, não imagem de demonstração. Um job sem navegador mostra “Sessão ainda não iniciada”, nunca uma página de corretor fictícia.
- Último frame há mais de 5s: aviso de atraso; há mais de 15s: não exibir como “ao vivo”. Essas metas são requisitos de produto a testar, não métricas alcançadas.
- No supervisionado, perda de observação bloqueia nova submissão até restabelecer a visualização ou interromper o item para revisão. No autônomo, ausência de espectadores não para campanha autorizada; ausência de telemetria do operador, sim, exige tratamento de saúde.
- View e evento têm timestamps e session/page IDs para detectar mismatch. Mudança de aba atualiza a visualização.
- Se o provedor não permitir integração visual segura/estável, o piloto falha; não substituir o navegador por uma barra de progresso. Frames frequentes da página real são alternativa prevista e devem ser identificados como tal.
- Não expor CDP, APIs do navegador ou links de controle a visitantes públicos. Não confiar só em CSS para impedir cliques.

## Habilitação dos controles

Iniciar: campanha configurada, operador saudável e escopo válido. Aprovar: somente destinatário e versão atuais, sem erros obrigatórios. Continuar: job pausado e causa resolvida; revalida aprovações. Parar: comando com ID e confirmação de efetivação do worker. Editar: cria nova versão e destaca aprovação invalidada.

Modo pode ser alterado pelo proprietário, com evento e resumo do novo escopo; não mudar sozinho por volume concluído. Lote aprovado lista cada destinatário/versão e permite rejeitar itens. Uma barra de “100 aprovados” sem conteúdo auditável é insuficiente.

## Contadores

Cada número é derivado do banco e do escopo exibido, nunca de cliques no frontend. “Confirmadas” representa aceitação comprovada pelo formulário; “confirmadas manualmente no legado” deve aparecer separado ou com origem clara. Diferenciar totais da campanha, do lote e da sessão. Eventos repetidos em reconexão não incrementam contadores duas vezes.

## Evidência mínima de conclusão

Teste integrado mostrando navegador real, preenchimento, decisão de aprovação, tentativa, verificação, evento persistido e próximo item. Captura de layout ou fixture valida interface, não envio real. Logs devem informar claramente quando um teste usa formulário controlado e quando usa Sotheby’s autorizado.
