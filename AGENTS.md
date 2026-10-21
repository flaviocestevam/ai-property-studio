# Orientações para continuidade

Este é o CRM AI Property Studio existente, não a aplicação de produção de vídeos com nome parecido. Preserve o frontend, histórico e funcionalidades atuais.

- Comece por README.md e docs/handoff/01-auditoria.md. O código atualizado já está na raiz; o prompt do pacote anterior tem caminhos de transferência que o README atual explica.
- A versão 7/extension 1.4.0 é preparada, não publicada. A produção confirmada usa versão 6/extension 1.2.0. Não publicar automaticamente nesta etapa.
- Use o mesmo Site project ID `appgprj_6ad79bb203508191a43d35ef3317d7b4` e a mesma URL. Não criar outro Site por padrão.
- A Central de Operações deve ficar na mesma origem do CRM, inicialmente `/#operacoes`. Backend e navegador podem ficar fora, com autenticação do proprietário e segredos no servidor.
- Não apagar dados ou importar a arquitetura Supabase/TanStack de outro projeto. Este frontend é HTML/JS estático e usa IndexedDB local.
- Não habilitar envio real, contratar serviços ou publicar mudanças sem autorização aplicável. Preparar código e testes em branch de trabalho.
- Não contornar captcha, 403 ou proteções. Não confundir testes simulados, DOM controlado e operação real no Sotheby's.
- Priorizar a homologação do preenchimento real e a observabilidade antes de ampliar autonomia.
- Preservar confirmação manual legada; clique no botão não comprova aceitação do formulário. Resultado incerto após submissão vai à revisão, sem reenvio automático.
- Testes de baseline: `npm test`. Não exigem dependências de terceiros. Para testes de UI, seguir as ferramentas disponíveis no ambiente.
- Nunca adicionar .env, cookies, payloads pessoais, bancos ou credenciais ao repositório. Endereço público de API é configuração, não lugar para segredo.

O pacote de arquitetura está em docs/handoff/02-arquitetura.md e o plano testável em docs/handoff/05-plano-de-implementacao.md.
