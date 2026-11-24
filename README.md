# UML Acessível

Plataforma web para interpretar e navegar diagramas de software por teclado e leitor de tela, pensada para pessoas com deficiência visual (cegueira total e baixa visão) ou sensibilidade à luz.

> Projeto acadêmico em desenvolvimento. O MVP cobre **Diagramas Entidade-Relacionamento (ER)**.

## O problema

Ferramentas tradicionais de diagramação dependem de imagens e desenhos vetoriais estáticos. Para quem usa leitor de tela, um diagrama vira apenas "imagem, 800 por 600 pixels". Para quem tem baixa visão ou fotofobia, fundos brancos intensos e zoom que quebra o layout tornam a leitura cansativa ou impossível.

## A solução

O usuário escreve ou cola o diagrama em texto (sintaxe `erDiagram` do Mermaid) e o sistema gera duas saídas sincronizadas:

- **Árvore semântica navegável** pelo teclado, compatível com leitores de tela (padrão WAI-ARIA Treeview) e com narração por síntese de voz.
- **Diagrama visual em SVG**, com alto contraste, zoom de até 400% e indicador de foco expandido.

## Funcionalidades previstas (MVP)

- Entrada de diagramas ER em código textual
- Árvore de navegação semântica em HTML/ARIA (entidades, atributos e relacionamentos)
- Navegação completa por teclado, sem uso de mouse
- Narração das propriedades e relacionamentos do elemento focado (Web Speech API)
- Sincronização entre o foco do teclado e o destaque no SVG
- Temas visuais: Padrão e Alto Contraste (amarelo sobre preto)
- Validação de sintaxe com erros comunicados em texto e áudio
- Sinais sonoros diferentes por tipo de cardinalidade
- Exportação da descrição do diagrama em Markdown

## Tecnologias

- TypeScript e React (Vite)
- Tailwind CSS
- Parser próprio para um subconjunto do `erDiagram` do Mermaid
- Web Speech API (`window.speechSynthesis`)
- Vitest e axe-core para testes
- GitHub Actions para integração contínua

## Acessibilidade

O projeto segue a **WCAG 2.2, nível AA** como base obrigatória. Os testes combinam verificação automatizada (axe-core) e testes manuais com o leitor de tela NVDA. Navegadores suportados nesta fase: Chrome, Firefox e Edge, em desktop.

## Como rodar o projeto

Pré-requisitos: [Node.js](https://nodejs.org/) (versão LTS) e Git.

```bash
git clone https://github.com/ludmilabss/uml-acessivel.git
cd uml-acessivel
npm install
npm run dev
```

Depois, abra o endereço que aparece no terminal (geralmente <http://localhost:5173>).

Outros comandos:

| Comando | O que faz |
|---|---|
| `npm run lint` | Verifica o código com ESLint, incluindo regras de acessibilidade (jsx-a11y) |
| `npm test` | Roda os testes uma vez (Vitest) |
| `npm run test:watch` | Roda os testes e repete a cada alteração |
| `npm run build` | Checa os tipos e gera a versão de produção em `dist/` |
| `npm run preview` | Abre localmente a versão gerada pelo build |

> O `eslint-plugin-jsx-a11y` ainda não tem suporte oficial ao ESLint 10. Por isso, ele foi liberado pelo campo `overrides` do `package.json`.

## Estrutura do repositório

```text
uml-acessivel/
├── docs/              # Documentação do projeto (ex.: gramática do erDiagram)
├── public/            # Arquivos estáticos (favicon)
├── src/
│   ├── core/          # Parser e modelo de dados, em TypeScript puro (sem React)
│   ├── ui/            # Componentes React da interface
│   ├── App.tsx        # Componente raiz
│   ├── main.tsx       # Ponto de entrada da aplicação
│   └── index.css      # Importa o Tailwind CSS
├── eslint.config.js
├── vite.config.ts
└── package.json
```

A regra central é que **nada em `core/` importa React**. Assim, o parser e o modelo podem ser testados de forma isolada e reaproveitados.

## Equipe

| Nome | Papel |
|---|---|
| Ludmila Barbosa | Líder de projeto e desenvolvedora front-end |
| Divaldo Verçosa | Engenheiro de software e arquitetura |
| Vitória Caroline | QA (síntese de áudio, navegação por teclado e testes de acessibilidade) |

## Fluxo de trabalho

Trabalhamos com Scrum/Kanban, em sprints de 15 dias. Cada sprint termina com um encontro e uma apresentação do andamento. O acompanhamento é feito no quadro do projeto, com as milestones **Entrega 2 a 6**.

### Branches

Toda mudança sai de uma branch a partir da `main`, com o formato `tipo/descricao-curta`:

- `feat/parser-entidades`
- `fix/foco-teclado`
- `docs/gramatica-er`
- `chore/projeto-base`

### Commits e Pull Requests

Mensagens e títulos de PR seguem o padrão `tipo: descrição curta (#issue)`:

- `feat`: funcionalidade nova
- `fix`: correção de erro
- `docs`: documentação
- `test`: testes e exemplos de teste
- `chore`: configuração, CI e ferramentas
- `refactor`: reorganização de código sem mudar o comportamento

Exemplo: `feat: implementa parser de entidades e atributos (#5)`

Regras:

- A `main` é protegida: nada entra sem Pull Request
- Todo PR precisa de pelo menos 1 aprovação de outra pessoa da equipe
- Um PR para cada issue, sempre que possível
- O modelo de PR traz o checklist de acessibilidade para mudanças na interface

### Definition of Done

Uma tarefa só é considerada pronta quando atende à nossa [Definition of Done](docs/definition-of-done.md), que inclui a checklist de acessibilidade. O modelo de PR traz a mesma checklist.

## Cronograma

| Entrega | Data | Foco |
|---|---|---|
| 2 | 13/10/2026 | Projeto base e parser de entidades |
| 3 | 27/10/2026 | Relacionamentos, cardinalidades e árvore semântica |
| 4 | 10/11/2026 | Integração com React e navegação por teclado |
| 5 | 24/11/2026 | SVG, temas e síntese de voz |
| 6 | 08/12/2026 | Sons, exportação, testes de acessibilidade e fechamento |

## Licença

Distribuído sob a licença MIT.
