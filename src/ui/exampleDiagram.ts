/** Diagrama carregado ao abrir a aplicação, para já ter uma árvore para navegar. */
export const exampleDiagram = `erDiagram
  %% Exemplo: loja virtual
  CLIENTE ||..o{ PEDIDO : faz
  PEDIDO ||--|{ ITEM_PEDIDO : contem
  PRODUTO ||--o{ ITEM_PEDIDO : "aparece em"

  CLIENTE {
    int id PK
    string nome "nome completo"
    string email UK
  }
  PEDIDO {
    int id PK
    int cliente_id FK
    date data
  }
  ITEM_PEDIDO {
    int pedido_id PK, FK
    int produto_id PK, FK
    int quantidade
  }
  PRODUTO {
    int id PK
    string nome
    decimal preco
  }`;
