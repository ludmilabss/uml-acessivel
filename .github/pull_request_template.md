## O que mudou
(descreva em 1 ou 2 frases)

## Issue relacionada
Closes #

## Checklist (Definition of Done, `docs/definition-of-done.md`)
- [ ] `npm run lint` passa
- [ ] `npm run format:check` passa
- [ ] `npm test` passa, com testes novos para o que mudou
- [ ] `npm run build` passa
- [ ] Nada em `src/core/` importa React
- [ ] Documentação atualizada, se o comportamento mudou

## Se mexeu na interface
- [ ] Tudo funciona só pelo teclado
- [ ] Foco visível nos dois temas
- [ ] Informação não depende só de cor
- [ ] Nome lido começa pelo texto visível (WCAG 2.5.3)
- [ ] Mudanças importantes anunciadas no `aria-live`
- [ ] axe-core sem violações
- [ ] Zoom de 400% sem rolagem para os lados
- [ ] Testado no VoiceOver e no NVDA
