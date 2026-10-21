# AI Property Studio — CRM de Prospecção

Código existente do CRM exclusivo para corretores da Sotheby's. Este repositório permite continuar o desenvolvimento no Codex Cloud; não é um novo site e não recria o CRM.

CRM publicado: https://ai-property-crm.flaviocostaestevam.chatgpt.site/

## Estado da transferência

- Fonte da raiz: versão 7 salva no Sites, commit `55180295f8741a0918fd990293665539d2b56c59`, extensão 1.4.0.
- Última publicação confirmada: versão 6, commit `07fa2f44755bb6f0083dbf766ba38df55e1408a4`, extensão 1.2.0.
- A versão 7 ainda não foi publicada no Sites. Não confundir o código deste repositório com o que o usuário recebe em produção.
- A migração para este GitHub não publica nada automaticamente. Preserve o project ID e o endereço existentes.
- Contatos e histórico reais ficam no navegador do usuário e não estão neste repositório.

## Começar no Codex Cloud

Selecione `flaviocestevam/ai-property-studio` ao criar o ambiente. Solicite Node.js 24 e execute `npm test`. O frontend atual é HTML/CSS/JavaScript estático, sem dependências npm de aplicação ou etapa de build.

Para inspecionar a interface localmente, se Python 3 estiver disponível:

```bash
python3 -m http.server 3000 --bind 0.0.0.0 --directory dist
```

Isso serve o frontend local; não executa o operador remoto. O preenchimento no Sotheby's exige a extensão instalada em Chrome e validação real do formulário.

## Contexto e próxima tarefa

Leia [AGENTS.md](AGENTS.md), [auditoria](docs/handoff/01-auditoria.md), [arquitetura](docs/handoff/02-arquitetura.md) e [prompt mestre](docs/handoff/07-prompt-mestre-codex.md).

Adaptação de caminhos do pacote anterior: o código atualizado já está na raiz deste repositório. Não clone outro projeto para começar. Os oito documentos estão em `docs/handoff`, as evidências em `docs/evidence` e a cópia publicada em `archives/published-v6-source.tar.gz`. O bundle `archives/ai-property-crm.git.bundle` preserva o histórico original do Sites e seus commits; os SHAs originais não são os commits iniciais deste GitHub.

O objetivo futuro é uma Central de Operações na mesma origem do CRM, inicialmente `/#operacoes`, conectada a um operador observável com fila persistente e aprovação progressiva. Essa Central, o backend remoto e o envio automático ainda não foram implementados.

## Limite da verificação

Os testes Node/VM passaram. O preenchimento 1.4.0 também foi exercitado em DOM controlado durante o desenvolvimento, mas não foi homologado no formulário real do Sotheby's. O usuário relatou falha de preenchimento e o navegador remoto retornou 403. Não declarar a função real resolvida a partir de mocks.

## Estrutura

- `dist/`: frontend e código da extensão Chrome.
- `scripts/`: testes executáveis em Node.
- `.openai/hosting.json`: identidade e configuração do Site existente.
- `docs/handoff/`: auditoria, arquitetura, especificações, plano e prompt para Codex.
- `docs/evidence/`: resultados dos testes e proveniência.
- `archives/`: baseline publicado e histórico original.

Nenhum segredo, banco de contatos ou cookie de navegador deve ser adicionado ao Git.
