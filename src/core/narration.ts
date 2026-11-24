import type {
  Attribute,
  AttributeKey,
  Cardinality,
  Diagram,
  Entity,
  Relationship,
  RelationshipClassification,
  RelationshipKind,
} from './model';

const cardinalityTexts: Readonly<Record<Cardinality, string>> = {
  exactlyOne: 'exatamente um',
  zeroOrOne: 'zero ou um',
  oneOrMany: 'um ou muitos',
  zeroOrMany: 'zero ou muitos',
};

const classificationTexts: Readonly<Record<RelationshipClassification, string>> = {
  oneToOne: 'um para um',
  oneToMany: 'um para muitos',
  manyToOne: 'muitos para um',
  manyToMany: 'muitos para muitos',
};

const relationshipKindTexts: Readonly<Record<RelationshipKind, string>> = {
  identifying: 'identificador',
  nonIdentifying: 'não identificador',
};

const keyTexts: Readonly<Record<AttributeKey, string>> = {
  PK: 'chave primária',
  FK: 'chave estrangeira',
  UK: 'chave única',
};

export function describeCardinality(cardinality: Cardinality): string {
  return cardinalityTexts[cardinality];
}

export function describeClassification(classification: RelationshipClassification): string {
  return classificationTexts[classification];
}

export function describeRelationshipKind(kind: RelationshipKind): string {
  return relationshipKindTexts[kind];
}

export function describeKey(key: AttributeKey): string {
  return keyTexts[key];
}

export function describeDiagram(diagram: Diagram): string {
  const entityCount = countText(diagram.entities.length, 'entidade', 'entidades');
  const relationshipCount = countText(
    diagram.relationships.length,
    'relacionamento',
    'relacionamentos',
  );
  return `Diagrama ER com ${entityCount} e ${relationshipCount}.`;
}

/** Ex.: "3 entidades." O nome do grupo já aparece no texto visível do nó. */
export function describeGroup(itemCount: number, singular: string, plural: string): string {
  return `${countText(itemCount, singular, plural)}.`;
}

/**
 * Formato sugerido no cronograma: "Entidade: PEDIDO. 2 atributos, 1 relacionamento."
 * Um autorrelacionamento conta uma única vez.
 */
export function describeEntity(entity: Entity, relationshipCount: number): string {
  const attributeCount = countText(entity.attributes.length, 'atributo', 'atributos');
  const relationshipText = countText(relationshipCount, 'relacionamento', 'relacionamentos');
  return `Entidade: ${entity.name}. ${attributeCount}, ${relationshipText}.`;
}

/**
 * Segue a forma do diagrama ER ("nome: tipo"). Não repete "atributo", pois o grupo
 * "Atributos" já dá o contexto. Ex.: "id: int, chave primária."
 */
export function describeAttribute(attribute: Attribute): string {
  const keys = attribute.keys.length > 0 ? `, ${joinWithAnd(attribute.keys.map(describeKey))}` : '';
  const text = `${attribute.name}: ${attribute.type}${keys}.`;
  return attribute.comment === undefined ? text : `${text} Comentário: ${attribute.comment}.`;
}

/**
 * Segue o exemplo de docs/gramatica-er.md (seção 6.4): cada cardinalidade é
 * lida logo após a entidade a que se refere, preservando a ordem da linha original.
 */
export function describeRelationship(relationship: Relationship): string {
  const left = `${relationship.leftEntity}, ${describeCardinality(relationship.leftCardinality)}`;
  const right = `${relationship.rightEntity}, ${describeCardinality(relationship.rightCardinality)}`;
  const classification = describeClassification(relationship.classification);
  const kind = describeRelationshipKind(relationship.kind);
  return `${left}, ${relationship.label} ${right}. Relacionamento ${classification}, ${kind}.`;
}

function countText(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function joinWithAnd(items: readonly string[]): string {
  if (items.length <= 1) {
    return items.join('');
  }

  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}
