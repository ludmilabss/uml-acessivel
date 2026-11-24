# Definition of Done e checklist de acessibilidade

> Uma tarefa só está **pronta** quando cumpre todos os itens que se aplicam a ela. A base de acessibilidade é a **WCAG 2.2, nível AA**.

## 1. Para toda tarefa

- [ ] Ligada a uma issue (o PR tem `Closes #N`)
- [ ] `npm run lint` passa (inclui as regras de acessibilidade do jsx-a11y)
- [ ] `npm run format:check` passa
- [ ] `npm test` passa, com testes novos para o que mudou
- [ ] `npm run build` passa
- [ ] Nada em `src/core/` importa React; a interface importa o núcleo só por `src/core/index.ts`
- [ ] Documentação atualizada, quando o comportamento muda (gramática, documentação técnica, README)
- [ ] PR revisado e aprovado por outra pessoa da equipe

## 2. Para mudanças no parser ou na narração

- [ ] Gramática (`docs/gramatica-er.md`) atualizada antes do código, se a sintaxe muda
- [ ] Cada erro novo tem código, linha e motivo em texto claro, documentado na seção 9 da gramática
- [ ] Frases novas de narração conferidas em voz alta (leitor de tela ou voz própria)
- [ ] Meta de desempenho mantida (o teste de 500 ms passa)

## 3. Checklist de acessibilidade (para mudanças na interface)

**Teclado**

- [ ] Tudo funciona só pelo teclado, sem mouse
- [ ] A ordem do Tab segue a ordem visual, e não há armadilha de foco
- [ ] Atalhos novos não conflitam com VoiceOver (Ctrl + Option), NVDA (Insert ou Caps Lock) nem com o navegador, e aparecem no diálogo "Atalhos de teclado"

**Foco e visual**

- [ ] Foco sempre visível, nos dois temas (Padrão e Alto contraste)
- [ ] Contraste do texto de pelo menos 4,5:1 (o projeto usa 6:1 ou mais) e de bordas e foco de pelo menos 3:1
- [ ] Informação não depende só de cor (texto, ícone, forma ou espessura junto)
- [ ] Texto com pelo menos 16 px
- [ ] Zoom do navegador em 400% sem rolagem para os lados (WCAG 1.4.10)

**Leitor de tela**

- [ ] Todo controle tem nome; o nome lido começa pelo texto visível (WCAG 2.5.3)
- [ ] Estados anunciados (expandido/recolhido, pressionado, inválido)
- [ ] Mudanças importantes (resultado, erros, trocas de modo) são anunciadas na região `aria-live`, sem roubar o foco
- [ ] Elementos só visuais escondidos do leitor (`aria-hidden`), sem paradas extras
- [ ] Teste automático com axe-core sem violações (`src/accessibility.test.tsx`)
- [ ] Testado no **VoiceOver** (Safari) e no **NVDA** (Chrome ou Firefox no Windows)

## 4. Roteiro rápido de teste manual

1. Recarregue a página e use só o teclado: Tab até a árvore, setas, Enter num relacionamento, Shift + Enter para ir ao código.
2. Provoque um erro de sintaxe, interprete com Ctrl + Enter (Cmd + Enter no Mac) e ouça o anúncio; ative o erro e confira onde o cursor para.
3. Troque o tema para Alto contraste e confira foco e contraste.
4. Amplie o navegador para 400% e confira que não há rolagem para os lados.
5. Repita os passos 1 e 2 com VoiceOver e com NVDA.
