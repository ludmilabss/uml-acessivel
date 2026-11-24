# Casos de teste manuais — Frontend

> Ambientes alvo: Chrome, Firefox e Edge, desktop (RNF04). Casos marcados **NVDA** exigem o leitor de tela NVDA ativo no Windows.
>
> Diagrama de exemplo usado nos casos, salvo indicação contrária (é o que já abre por padrão em `src/ui/exampleDiagram.ts`, e corresponde ao fixture "E-commerce (Cenário 1)" em `src/core/exampleDiagrams.ts`):
>
> ```
> erDiagram
>   CLIENTE ||..o{ PEDIDO : faz
>   PEDIDO ||--|{ ITEM_PEDIDO : contem
>   PRODUTO ||--o{ ITEM_PEDIDO : "aparece em"
>   CLIENTE { int id PK  string nome "nome completo"  string email UK }
>   PEDIDO { int id PK  int cliente_id FK  date data }
>   ITEM_PEDIDO { int pedido_id PK, FK  int produto_id PK, FK  int quantidade }
>   PRODUTO { int id PK  string nome  decimal preco }
> ```

## Legenda de status

| Status | Significado |
|---|---|
| Executável | Pode ser testado nesta branch, funcionalidade já implementada |
| Bloqueado | Depende de funcionalidade ainda não implementada (RF07, ver matriz de risco) |

---

## Persona: Lucas Silveira (cegueira total, usa NVDA)

### CT-FE-01 — Interpretar o diagrama de exemplo e ouvir o resumo

- **Status:** Executável · **NVDA**
- **Requisito:** RF01, RF02, RNF03
- **Pré-condição:** Aplicação aberta (`npm run dev`), NVDA ativo, nenhuma tecla de mouse usada em todo o teste.
- **Passos:**
  1. Com NVDA lendo a página, usar Tab (o primeiro item é o link oculto "Ir para a árvore", que só aparece com foco — WCAG 2.4.1).
  2. Pressionar Alt+Shift+1 para ir direto ao campo "Código do diagrama" de qualquer lugar da página.
  3. Confirmar que o diagrama de exemplo já está preenchido.
  4. Pressionar Ctrl+Enter (ou ativar o botão "Interpretar diagrama" via teclado).
  5. Ouvir o anúncio na região de status.
- **Resultado esperado:** NVDA anuncia algo como "Diagrama interpretado. Diagrama ER com 4 entidades e 3 relacionamentos. A árvore foi atualizada." A árvore do painel 2 passa a ter conteúdo navegável.
- **Navegador:** ____ · **Data:** ____ · **Resultado:** ____

### CT-FE-02 — Navegar a árvore inteira só com teclado

- **Status:** Executável · **NVDA**
- **Requisito:** RF03, RNF03
- **Pré-condição:** Diagrama de exemplo interpretado, foco dentro da árvore (Alt+Shift+2 leva direto a ela).
- **Passos:**
  1. Pressionar Alt+Shift+2 para ir direto à árvore.
  2. Usar seta para baixo repetidamente até o fim da árvore.
  3. Usar seta para cima para voltar ao topo.
  4. Pressionar Home e depois End.
  5. Em um item com filhos, pressionar seta para a direita para expandir e seta para a esquerda para recolher.
  6. Em um item qualquer com linha de origem, pressionar Shift+Enter.
  7. Pressionar Tab uma única vez para sair da árvore.
- **Resultado esperado:** O foco se move item a item, sem pular nem travar. Home vai direto ao primeiro item, End ao último. Shift+Enter seleciona a linha de origem do item no código (painel 1) e anuncia "Linha X do código: ...". Tab sai da árvore em uma única parada (roving tabindex).
- **Navegador:** ____ · **Data:** ____ · **Resultado:** ____

### CT-FE-03 — Enter em um relacionamento leva à entidade de destino

- **Status:** Executável · **NVDA**
- **Requisito:** RF02, RF03
- **Pré-condição:** Diagrama de exemplo interpretado.
- **Passos:**
  1. Navegar até o relacionamento "faz" (CLIENTE → PEDIDO).
  2. Pressionar Enter.
- **Resultado esperado:** O foco salta para o nó da entidade PEDIDO, expandindo os grupos ancestrais necessários. NVDA anuncia a entidade de destino; se a voz estiver ligada (CT-FE-12), ela também fala o item.
- **Navegador:** ____ · **Data:** ____ · **Resultado:** ____

### CT-FE-04 — Erro de sintaxe anunciado em texto, com seleção do trecho exato

- **Status:** Executável · **NVDA**
- **Requisito:** RF09, RNF03
- **Pré-condição:** Campo de código focado.
- **Passos:**
  1. Trocar a chave `PK` de um atributo por `XK` (chave desconhecida).
  2. Interpretar (Ctrl+Enter).
  3. Ouvir o anúncio na região de status.
  4. Navegar por Tab até a lista de erros e ativar o item do erro.
- **Resultado esperado:** Anúncio informa quantidade de erros, a mensagem do primeiro (linha e motivo) e o código (ex.: E05). Ativar o item do erro seleciona **só o trecho exato** `XK` no código (não a linha inteira), pois o parser agora devolve coluna e tamanho do problema. A árvore não é exibida.
- **Navegador:** ____ · **Data:** ____ · **Resultado:** ____

### CT-FE-05 — Fluxo completo sem uso de mouse (RNF03)

- **Status:** Executável · **NVDA**
- **Requisito:** RNF03
- **Pré-condição:** Mouse/trackpad desconectado ou não utilizado durante todo o teste.
- **Passos:** Repetir CT-FE-01 a CT-FE-04 e CT-FE-12 usando exclusivamente teclado.
- **Resultado esperado:** Nenhuma ação do fluxo depende de clique de mouse.
- **Navegador:** ____ · **Data:** ____ · **Resultado:** ____

---

## Persona: Lucas / geral — Narração por voz (RF04)

### CT-FE-12 — Ouvir a narração do item focado

- **Status:** Executável
- **Requisito:** RF04
- **Pré-condição:** Navegador com suporte a `speechSynthesis` (Chrome, Firefox e Edge atuais suportam).
- **Passos:**
  1. Ativar o botão "Voz" na barra superior.
  2. Navegar pela árvore com som ligado e volume audível.
  3. Testar o seletor de "Velocidade" (0,75 / 1 / 1,25 / 1,5 / 2) e ouvir a mudança.
  4. Pressionar Esc enquanto a voz está falando.
- **Resultado esperado:** O navegador narra em voz o texto do item focado a cada mudança de foco na árvore. A velocidade muda perceptivelmente. Esc interrompe a fala imediatamente, sem travar a navegação.
- **Navegador:** ____ · **Data:** ____ · **Resultado:** ____

### CT-FE-13 — Aviso visível quando não há voz pt-BR

- **Status:** Executável, mas **risco identificado** (ver matriz de risco R03)
- **Requisito:** RF04
- **Pré-condição:** Dois cenários a testar separadamente:
  - (a) navegador sem nenhum suporte a Web Speech API;
  - (b) navegador com Web Speech API, mas sem nenhuma voz em português instalada no sistema operacional.
- **Passos:** Em cada cenário, abrir a aplicação e observar a barra superior de controles.
- **Resultado esperado esperado pela proposta:** Aviso visível informando a limitação em ambos os cenários.
- **Resultado real observado no código:** No cenário (a), aparece o texto "Voz indisponível neste navegador" (confirmar). No cenário (b), **não há aviso**: `pickVoice()` (em `src/ui/speech.ts`) cai silenciosamente para a voz padrão do sistema, sem nenhum texto informando a ausência de voz em pt-BR. **Se confirmado, registrar como falha/bug, não ajustar a expectativa** — é uma divergência real do requisito.
- **Navegador:** ____ · **Data:** ____ · **Resultado:** ____

---

## Persona: Marcela Andrade (baixa visão, fotofobia)

### CT-FE-06 — Alternar para Alto Contraste e medir a razão de contraste

- **Status:** Executável
- **Requisito:** RF06, RNF01
- **Pré-condição:** Aplicação aberta no tema Padrão.
- **Passos:**
  1. No seletor "Tema", escolher "Alto contraste".
  2. Confirmar visualmente o fundo preto com texto amarelo.
  3. Recarregar a página (F5).
  4. Usar o [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) para medir a razão entre `#ffd600` (texto/borda) e `#000000` (fundo), e entre as cores do tema Padrão.
- **Resultado esperado:** Tema lembrado após recarregar. Alto Contraste ≥ 7:1. Tema Padrão ≥ 4,5:1 (WCAG 2.2 AA).
- **Navegador:** ____ · **Data:** ____ · **Resultado:** ____

### CT-FE-07 — Indicador de foco expandido

- **Status:** Executável
- **Requisito:** RNF01 (requisito de UX cita contorno de 4px)
- **Pré-condição:** Diagrama de exemplo interpretado.
- **Passos:**
  1. Navegar por Tab/setas até qualquer item com foco visível.
  2. Inspecionar a borda de foco via DevTools.
- **Resultado esperado:** Contorno nitidamente visível. **Atenção:** o CSS (`src/index.css`, inalterado neste merge) usa `outline: 3px`/`border-[3px]`, não 4px. Registrar o valor real; se divergir de 4px, é falha (risco R05), não se ajusta a expectativa.
- **Navegador:** ____ · **Data:** ____ · **Resultado:** ____

### CT-FE-08 — Zoom do navegador sem quebra de layout

- **Status:** Executável
- **Requisito:** RNF01
- **Passos:** Usar o zoom do navegador (Ctrl + "+") até 200% e 400%, navegando pela árvore e controles em cada nível.
- **Resultado esperado:** Sem rolagem horizontal desordenada; controles continuam operáveis por teclado.
- **Navegador:** ____ · **Data:** ____ · **Resultado:** ____

### CT-FE-09 — Contorno visível no elemento focado do SVG

- **Status:** Executável
- **Requisito:** RF05
- **Pré-condição:** Diagrama de exemplo interpretado, painel "Visualização (SVG)" visível (botão "Mostrar visualização").
- **Passos:**
  1. Navegar a árvore até uma entidade ou relacionamento.
  2. Observar o elemento correspondente no painel 3 (SVG).
- **Resultado esperado:** O elemento correspondente no SVG é destacado (`highlight` em `src/ui/DiagramPreview.tsx`). Medir a espessura e a cor do contorno (o requisito original pede amarelo fluorescente de 4px — confirmar se bate, mesma ressalva do CT-FE-07).
- **Navegador:** ____ · **Data:** ____ · **Resultado:** ____

### CT-FE-10 — Centralização suave do elemento focado

- **Status:** Executável
- **Requisito:** RF05
- **Pré-condição:** Diagrama de exemplo interpretado, zoom do SVG **diferente** de "ajustar à área" (ex.: 150%), de forma que nem todo o diagrama caiba na tela.
- **Passos:** Navegar na árvore para um elemento fora da área visível do SVG.
- **Resultado esperado:** A área do SVG rola suavemente até centralizar o elemento (`scrollIntoContainer`, em `src/ui/DiagramPreview.tsx`). Com o zoom em "ajustar à área" (padrão), não deve haver rolagem, pois o diagrama inteiro já está visível — confirmar que esse caso não quebra nada.
- **Navegador:** ____ · **Data:** ____ · **Resultado:** ____

### CT-FE-11 — Zoom vetorial do SVG até 400% e modo "Ampliar desenho"

- **Status:** Executável
- **Requisito:** RF05
- **Pré-condição:** Painel do SVG visível.
- **Passos:**
  1. Usar os controles de zoom próprios da aplicação (não o do navegador) para passar pelos níveis 50%, 75%, 100%, 125%, 150%, 200%, 250%, 300% e 400%.
  2. Tentar ir além de 400% e abaixo de 50%; conferir o anúncio de "zoom máximo/mínimo".
  3. Usar "ajustar à área" para voltar ao diagrama inteiro visível.
  4. Ativar "Ampliar desenho": o código deve ficar oculto e o SVG ganhar mais espaço.
- **Resultado esperado:** Sem pixelização (é vetorial) nem rolagem horizontal desordenada em nenhum nível. Anúncios de zoom corretos. "Ampliar desenho" esconde o painel 1 e amplia o 3, sem perder o foco atual (ao desativar, o foco pendente volta ao código, se havia uma linha selecionada).
- **Navegador:** ____ · **Data:** ____ · **Resultado:** ____

---

## Persona: Felipe Santos (TDAH)

### CT-FE-14 — Recolher grupos para reduzir a carga visual

- **Status:** Executável
- **Requisito:** RF02, RF03
- **Passos:**
  1. Recolher o grupo "Entidades" e os grupos de atributos/relacionamentos de cada entidade.
  2. Observar a árvore reduzida só aos nomes das entidades.
  3. Expandir novamente apenas a entidade de interesse.
- **Resultado esperado:** É possível ver só os nomes de entidades sem detalhes. Expandir/recolher não altera o foco de forma inesperada.
- **Navegador:** ____ · **Data:** ____ · **Resultado:** ____

### CT-FE-15 — Ir direto à entidade relacionada sem procurar no desenho

- **Status:** Executável
- **Requisito:** RF02, RF03
- **Passos:**
  1. Localizar um relacionamento (ex.: "contem", PEDIDO → ITEM_PEDIDO).
  2. Pressionar Enter.
  3. Conferir o texto "Foco: ..." no rodapé.
- **Resultado esperado:** O foco pula diretamente para ITEM_PEDIDO. O texto do rodapé reflete exatamente o item com foco. Se o painel do SVG estiver visível, ele também destaca e centraliza o elemento (ver CT-FE-09/CT-FE-10) — menos carga visual do que procurar a linha no desenho.
- **Navegador:** ____ · **Data:** ____ · **Resultado:** ____

---

## Geral — Exportação em Markdown (RF08)

### CT-FE-18 — Exportar a estrutura em Markdown

- **Status:** Executável
- **Requisito:** RF08
- **Pré-condição:** Diagrama de exemplo interpretado (sem erros).
- **Passos:**
  1. Clicar/ativar "Exportar descrição (.md)".
  2. Abrir o arquivo `diagrama-er.md` baixado.
  3. Repetir com o código tendo erros de sintaxe.
- **Resultado esperado:** Arquivo Markdown com título "# Diagrama ER", seção "## Entidades" (cada entidade com seus atributos e relacionamentos narrados) e "## Relacionamentos", usando as mesmas frases da árvore (`describeEntity`, `describeAttribute`, `describeRelationship`). Com erros de sintaxe, a exportação não ocorre e a aplicação anuncia "Não há descrição para exportar: corrija os erros de sintaxe."
- **Navegador:** ____ · **Data:** ____ · **Resultado:** ____

---

## Geral — Aviso de qualidade de modelagem (W01, novo)

### CT-FE-20 — Aviso de chave estrangeira sem relacionamento

- **Status:** Executável (novo)
- **Requisito:** RF09 (adjacente — é um aviso, não um erro de sintaxe)
- **Pré-condição:** Campo de código vazio ou com outro diagrama.
- **Passos:**
  1. Digitar um diagrama com uma entidade que tenha um atributo `FK`, mas que não apareça em nenhum relacionamento, por exemplo:
     ```
     erDiagram
     PEDIDO {
       int id PK
       int cliente_id FK
     }
     ```
  2. Interpretar.
- **Resultado esperado:** O diagrama é interpretado normalmente (a árvore aparece, não é um erro). Abaixo do campo, surge uma lista de avisos com estilo neutro (ícone "ⓘ", não vermelho), diferente da lista de erros. O anúncio em aria-live menciona o aviso depois do resumo do diagrama. Ativar o aviso seleciona a linha do atributo `cliente_id`.
- **Navegador:** ____ · **Data:** ____ · **Resultado:** ____

---

## Persona: Prof. Gustavo Pinheiro (sem necessidades específicas — fumaça multi-navegador)

### CT-FE-16 — Fluxo mínimo em Chrome, Firefox e Edge

- **Status:** Executável
- **Requisito:** RNF04
- **Passos (repetir em cada navegador):**
  1. Abrir a aplicação; confirmar diagrama de exemplo interpretado, painéis visíveis.
  2. Editar o código e interpretar com Ctrl+Enter.
  3. Abrir o diálogo de atalhos (`ShortcutsDialog`) e conferir que os atalhos aparecem por extenso, incluindo os novos Alt+Shift+1/2/3 e Shift+Enter.
  4. Ocultar e mostrar "Visualização" e "Ampliar desenho", conferindo que o foco e os grupos abertos da árvore não se perdem.
  5. Ligar a voz e exportar o Markdown.
- **Resultado esperado:** Comportamento idêntico nos três navegadores, sem erros no console.
- **Navegador:** Chrome ____ / Firefox ____ / Edge ____ · **Data:** ____ · **Resultado:** ____

---

## Funcionalidades ainda bloqueadas (RF07 — Entrega 6)

### CT-FE-17 — Som distinto por tipo de cardinalidade/relação (RF07)

- **Status:** Bloqueado — nenhuma implementação encontrada no código (sem `AudioContext`, osciladores ou arquivos de áudio) após o merge da main
- **Requisito:** RF07
- **Passos (a executar quando disponível):** Navegar por relacionamentos de diferentes classificações e ouvir o som correspondente.
- **Resultado esperado:** Sons distintos e consistentes por tipo.
- **Navegador:** ____ · **Data:** ____ · **Resultado:** Bloqueado

### CT-FE-19 — Roteiro NVDA completo (navegação + voz + sons)

- **Status:** Parcialmente desbloqueado — navegação e voz já são executáveis (CT-FE-01 a CT-FE-05, CT-FE-12); falta só a parte de sons (RF07)
- **Requisito:** RNF01, RF04, RF07
- **Passos:** Repetir CT-FE-01 a CT-FE-05 com a narração por voz ativa, verificando que NVDA e a narração própria da aplicação não se sobrepõem de forma confusa. A parte de sons de relacionamento fica bloqueada até RF07 existir.
- **Resultado esperado:** NVDA e a voz da aplicação convivem sem sobreposição confusa.
- **Navegador:** ____ · **Data:** ____ · **Resultado:** Parcial

---

## Resumo de execução

| ID | Persona | Requisito | Status | Resultado |
|---|---|---|---|---|
| CT-FE-01 | Lucas | RF01, RF02, RNF03 | Executável | |
| CT-FE-02 | Lucas | RF03, RNF03 | Executável | |
| CT-FE-03 | Lucas | RF02, RF03 | Executável | |
| CT-FE-04 | Lucas | RF09, RNF03 | Executável | |
| CT-FE-05 | Lucas | RNF03 | Executável | |
| CT-FE-06 | Marcela | RF06, RNF01 | Executável | |
| CT-FE-07 | Marcela | RNF01 | Executável | |
| CT-FE-08 | Marcela | RNF01 | Executável | |
| CT-FE-09 | Marcela | RF05 | Executável | |
| CT-FE-10 | Marcela | RF05 | Executável | |
| CT-FE-11 | Marcela | RF05 | Executável | |
| CT-FE-12 | Lucas/geral | RF04 | Executável | |
| CT-FE-13 | Lucas/geral | RF04 | Executável · risco identificado | |
| CT-FE-14 | Felipe | RF02, RF03 | Executável | |
| CT-FE-15 | Felipe | RF02, RF03 | Executável | |
| CT-FE-16 | Gustavo | RNF04 | Executável | |
| CT-FE-17 | geral | RF07 | Bloqueado | |
| CT-FE-18 | geral | RF08 | Executável | |
| CT-FE-19 | Lucas | RNF01, RF04, RF07 | Parcial | |
| CT-FE-20 | geral | RF09 (W01) | Executável (novo) | |
