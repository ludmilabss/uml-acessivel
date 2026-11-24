# Plano de teste — UML Acessível

## 1. Objetivo

Definir o que será testado, como e por quem, cobrindo o que já foi entregue até a Entrega 5 (fundação técnica, parser ER completo, árvore semântica, integração com React, navegação por teclado e temas). Este é o primeiro documento de qualidade formal do projeto: até aqui não havia plano de teste, matriz de risco nem casos de teste registrados, apesar de o time já manter testes de desenvolvedor em `src/**/*.test.ts`.

## 2. Escopo

### 2.1 Em escopo nesta rodada

- Parser de diagramas ER (`src/core/parser.ts`), incluindo todos os códigos de erro E01–E14 da gramática e o novo aviso **W01** (atualizado) — chave estrangeira sem relacionamento, que não bloqueia a árvore.
- Modelo de dados e árvore semântica (`src/core/model.ts`, `src/core/semanticTree.ts`).
- Textos de narração (`src/core/narration.ts`) e o anúncio de resultado da interpretação, incluindo avisos (`src/ui/announcements.ts`).
- Navegação por teclado na árvore WAI-ARIA Treeview (`src/ui/SemanticTree.tsx`, `src/ui/treeNavigation.ts`), incluindo os novos atalhos Alt+Shift+1/2/3 (ir a um painel) e Shift+Enter (item da árvore → linha no código) **(atualizado)**.
- Integração com React: três painéis, editor de código, lista de erros/avisos, troca de tema (`src/App.tsx`).
- **(atualizado)** Renderização SVG do diagrama, sincronizada com o foco da árvore, zoom de 50% a 400% e modo "Ampliar desenho" (RF05 — `src/ui/DiagramPreview.tsx`, `src/ui/diagramLayout.ts`).
- **(atualizado)** Narração por Web Speech API, com controle de velocidade (RF04 — `src/ui/speech.ts`).
- **(atualizado)** Exportação da descrição do diagrama em Markdown (RF08 — `src/core/markdownExport.ts`).
- Temas Padrão e Alto Contraste (`src/index.css`, `src/ui/preferences.ts`), incluindo persistência da escolha.
- Validação de sintaxe e comunicação de erro em texto, com seleção do trecho exato do problema quando conhecido (RF09 — `src/ui/ErrorList.tsx`, `src/ui/DiagramEditor.tsx`) **(atualizado)**.
- Desempenho do parser (RNF02 — meta de 500 ms), já medido em [`docs/relatorio-desempenho.md`](../docs/relatorio-desempenho.md), agora também no navegador (`src/bench/`).
- Checagem automatizada de acessibilidade com axe-core (estrutura e papéis ARIA; cor fica fora, ver item 2.2).

### 2.2 Fora de escopo nesta rodada (ainda não implementado ou não cobre esta fase)

- Sinais sonoros por tipo de cardinalidade (RF07) — nenhuma implementação encontrada no código após o merge da main (sem `AudioContext`, osciladores ou arquivos de áudio); previsto para a Entrega 6 (08/12/2026).
- Aviso visível quando a Web Speech API existe mas não há nenhuma voz em português (RF04, parcial) — hoje só há aviso quando a API inteira não existe. Ver risco R03 na matriz de risco.
- Diagramas de Sequência, Casos de Uso e Estado, temas Escuro Profundo e Sépia — fora do MVP ER atual.
- Testes de usabilidade com usuários reais de leitor de tela — desejável, não bloqueante, conforme a proposta.
- Suporte a leitores de tela móveis (TalkBack/VoiceOver) — fora de escopo do projeto (RNF04).
- Medição de contraste de cor automatizada — o axe-core roda com a regra `color-contrast` desligada (`src/accessibility.test.tsx`); a verificação é manual (ver matriz de risco).
- Integração contínua (GitHub Actions) — ainda não existe no repositório.

### 2.3 Observação sobre o material de referência

A proposta de projeto e os cenários de persona descrevem diagramas de classes (heranças, métodos, composição/agregação). O que está implementado e documentado em `docs/gramatica-er.md` é o subconjunto `erDiagram` (entidade, atributo, cardinalidade, relacionamento). Os casos de teste deste plano usam a terminologia do produto real (entidade/atributo/relacionamento), adaptando os cenários de persona sem alterar a intenção original (ex.: o cenário de herança do Felipe passa a usar "Enter em um relacionamento leva à entidade de destino"). Esse desvio entre proposta e MVP está registrado na matriz de risco.

## 3. Estratégia de teste

| Camada | Técnica | Onde roda | Responsável |
|---|---|---|---|
| Núcleo (parser → árvore → narração) | Testes automatizados de ponta a ponta (cenário completo, caixa-preta sobre a API pública) | Vitest, em `tests/e2e/` | Vitória (escreve), time (mantém) |
| Núcleo (unidades) | Testes unitários já existentes | Vitest, em `src/core/*.test.ts` | Divaldo / time |
| Interface (comportamento) | Testes de componente (Testing Library) já existentes | Vitest + jsdom, em `src/*.test.tsx` | Ludmila / time |
| Interface (estrutura ARIA, cor desligada) | axe-core automatizado | Vitest + jsdom, `src/accessibility.test.tsx` | time |
| Interface (experiência real) | Roteiros manuais por persona | Chrome, Firefox, Edge (desktop) + NVDA (Windows) | Vitória |
| Desempenho | Benchmark automatizado (meta RNF02 < 500 ms) | Vitest, `src/core/performance.test.ts` | Divaldo / time |

A suíte de ponta a ponta criada nesta entrega (`tests/e2e/`) não repete os testes unitários do parser: ela valida cenários completos — um diagrama real entra, e o resultado esperado é conferido em todas as camadas do núcleo (diagrama, árvore, narração, erro), do jeito que a interface realmente consome essa API.

## 4. Ambiente de teste

- **Automatizado:** Node.js LTS + Vitest 5, com jsdom. Comando: `npm test` (ou `npm run test:watch` durante o desenvolvimento).
- **Manual:** Chrome, Firefox e Edge atualizados, em desktop (conforme RNF04). Leitor de tela: NVDA (gratuito), no Windows, para os roteiros do Lucas.
- **Dados de teste:** o diagrama de exemplo embutido (`src/ui/exampleDiagram.ts`) e diagramas específicos por caso, descritos em cada roteiro/teste.

## 5. Critérios de entrada

- Branch de origem (`feat/interface-arvore-navegavel`) compilando e com `npm test` e `npm run lint` passando.
- Build de desenvolvimento rodando localmente (`npm run dev`).

## 6. Critérios de saída

- Todos os casos de teste automatizados de `tests/e2e/` passando.
- Todos os roteiros manuais executáveis nesta fase (ver `tests/casos-de-teste-frontend.md`) executados ao menos uma vez, com resultado registrado.
- Riscos da matriz com mitigação aplicada ou aceita explicitamente pelo time.
- Pendências bloqueadas (RF04, RF05, RF07, RF08 e roteiro NVDA completo) documentadas para re-execução quando a funcionalidade correspondente for entregue (Entrega 6).

## 7. Papéis

| Nome | Papel no projeto | Papel neste plano |
|---|---|---|
| Vitória Caroline | QA (áudio, teclado, acessibilidade) | Autora do plano, da matriz de risco, dos casos e dos testes de ponta a ponta |
| Ludmila Barbosa | Líder de projeto, front-end | Mantém testes de componente e interface |
| Divaldo Verçosa | Engenharia e arquitetura | Mantém testes unitários do núcleo e desempenho |

## 8. Itens testáveis (rastreabilidade)

| ID requisito | Descrição resumida | Prioridade | Status na Entrega 5 | Cobertura |
|---|---|---|---|---|
| RF01 | Entrada de diagrama em texto (Mermaid `erDiagram`) | Alta | Pronto | Automatizado (núcleo) + manual |
| RF02 | Árvore de navegação semântica HTML/ARIA | Alta | Pronto | Automatizado (núcleo + componente) |
| RF03 | Navegação completa por setas do teclado | Alta | Pronto | Automatizado (componente) + manual |
| RF04 | Narração por síntese de voz | Alta | **Pronto, com ressalva** (sem aviso quando falta voz pt-BR especificamente) | Manual (CT-FE-12, CT-FE-13) |
| RF05 | Sincronização do foco com o SVG | Média | **Pronto** (zoom 50–400%, centralização suave, "ajustar à área") | Manual (CT-FE-09 a CT-FE-11) |
| RF06 | Alternância de temas visuais | Média | Pronto (Padrão/Alto Contraste) | Automatizado + manual |
| RF07 | Sons por tipo de relacionamento | Baixa | Não implementado | Bloqueado |
| RF08 | Exportar estrutura em Markdown | Baixa | **Pronto** | Manual (CT-FE-18) |
| RF09 | Validação de sintaxe com erro textual/sonoro, mais aviso W01 (não bloqueante) | Alta | Pronto (textual, com seleção do trecho exato); sonoro depende de RF04 | Automatizado (núcleo) + manual (textual) |
| RNF01 | WCAG 2.2 AA | Alta | Em andamento | Automatizado (estrutura) + manual (NVDA, contraste de cor) |
| RNF02 | Parsing em menos de 500 ms | Alta | Atendido (ver relatório de desempenho) | Automatizado |
| RNF03 | Independência de mouse | Alta | Pronto | Manual (roteiro Lucas) |
| RNF04 | Compatibilidade Chrome/Firefox/Edge | Média | Em verificação | Manual |

## 9. Entregáveis desta rodada

- [`tests/plano-de-teste.md`](plano-de-teste.md) (este documento)
- [`tests/matriz-de-risco.md`](matriz-de-risco.md)
- [`tests/casos-de-teste-frontend.md`](casos-de-teste-frontend.md)
- [`tests/e2e/interpretacao.test.ts`](e2e/interpretacao.test.ts)
- [`tests/e2e/erros.test.ts`](e2e/erros.test.ts)

> Um terceiro arquivo (`navegacao-semantica.test.ts`) foi escrito e depois removido: comparando
> teste a teste com a suíte do time, toda a cobertura que ele trazia (classificação de
> relacionamentos, autorrelacionamento, destino do Enter, chave composta) já existia em
> `src/core/parser.test.ts`, `src/core/semanticTree.test.ts` e `src/core/narration.test.ts`,
> em alguns casos com o diagrama idêntico. Por critério de qualidade do próprio conjunto de
> testes — evitar duplicidade que aumenta custo de manutenção sem aumentar proteção real —,
> optou-se por não manter esse arquivo.
