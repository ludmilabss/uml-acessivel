import type {
  Attribute,
  AttributeKey,
  Cardinality,
  Diagram,
  Entity,
  ParseError,
  ParseErrorCode,
  ParseResult,
  Relationship,
  RelationshipClassification,
  RelationshipKind,
} from './model';

const ENTITY_PATTERN = '[A-Za-z_][A-Za-z0-9_-]*';
const ATTRIBUTE_NAME_PATTERN = '[A-Za-z_][A-Za-z0-9_]*';
const ATTRIBUTE_TYPE_PATTERN = '[A-Za-z][A-Za-z0-9_]*';
const SIMPLE_LABEL_PATTERN = '[A-Za-z_][A-Za-z0-9_-]*';

const entityExpression = new RegExp(`^(${ENTITY_PATTERN})$`);
const entityBlockExpression = new RegExp(`^(${ENTITY_PATTERN})\\s*\\{$`);
const attributeExpression = new RegExp(
  `^(${ATTRIBUTE_TYPE_PATTERN})\\s+(${ATTRIBUTE_NAME_PATTERN})(?:\\s+(.+))?$`,
);
const relationshipPrefixExpression = new RegExp(
  `^(${ENTITY_PATTERN})\\s+(\\S+)\\s+(${ENTITY_PATTERN})\\s*:(.*)$`,
);
const relationshipWithoutLabelExpression = new RegExp(
  `^${ENTITY_PATTERN}\\s+\\S+\\s+${ENTITY_PATTERN}(?:\\s*:\\s*)?$`,
);
const relationshipOperatorExpression = /^(\|\||\|o|}\||}o)(--|\.\.)(\|\||o\||\|\{|o\{)$/;
const simpleLabelExpression = new RegExp(`^${SIMPLE_LABEL_PATTERN}$`);
const reservedStatementExpression = /^(?:erDiagram|(?:direction|style|classDef|class)\s.*)$/;

const ACCENT_MESSAGE = 'Acentos e ç só são aceitos entre aspas.';
const ACCENTED_LABEL_MESSAGE = 'Rótulo com acento deve ficar entre aspas, por exemplo "contém".';
const UNSUPPORTED_TYPE_MESSAGE =
  'Tipos com colchetes, parênteses ou ?, como varchar(10), não são suportados.';

const leftCardinalities: Readonly<Record<string, Cardinality>> = {
  '||': 'exactlyOne',
  '|o': 'zeroOrOne',
  '}|': 'oneOrMany',
  '}o': 'zeroOrMany',
};

const rightCardinalities: Readonly<Record<string, Cardinality>> = {
  '||': 'exactlyOne',
  'o|': 'zeroOrOne',
  '|{': 'oneOrMany',
  'o{': 'zeroOrMany',
};

interface MutableEntity {
  name: string;
  attributes: Attribute[];
  firstMentionLine: number;
  declarationLine?: number;
}

interface EntityBlockState {
  readonly entityName: string;
  readonly openedAtLine: number;
  readonly hasAttributeLine: boolean;
}

interface ParsedOperator {
  readonly leftCardinality: Cardinality;
  readonly rightCardinality: Cardinality;
  readonly kind: RelationshipKind;
}

/**
 * Interpreta o subconjunto de `erDiagram` definido em docs/gramatica-er.md.
 * O diagrama só é disponibilizado quando nenhuma violação foi encontrada.
 */
export function parseErDiagram(source: string): ParseResult {
  const lines = source.split(/\r?\n/);
  const errors: ParseError[] = [];
  const entities = new Map<string, MutableEntity>();
  const relationships: Relationship[] = [];
  let block: EntityBlockState | undefined;

  const firstUsefulIndex = lines.findIndex((line) => isUsefulLine(line));
  if (firstUsefulIndex === -1 || lines[firstUsefulIndex].trim() !== 'erDiagram') {
    errors.push(
      createError(
        'E01',
        'A primeira linha útil do diagrama deve ser erDiagram.',
        firstUsefulIndex === -1 ? 1 : firstUsefulIndex + 1,
      ),
    );
    return { errors };
  }

  const headerLine = firstUsefulIndex + 1;

  for (let index = firstUsefulIndex + 1; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const content = lines[index].trim();

    if (content === '' || content.startsWith('%%')) {
      continue;
    }

    if (block) {
      if (content === '}') {
        closeEntityBlock(block, errors, lineNumber);
        block = undefined;
      } else {
        parseAttribute(content, block.entityName, lineNumber, entities, errors);
        block = { ...block, hasAttributeLine: true };
      }
      continue;
    }

    const entityBlockMatch = content.match(entityBlockExpression);
    if (entityBlockMatch) {
      const entityName = entityBlockMatch[1];
      const entity = getOrCreateEntity(entities, entityName, lineNumber);

      if (entity.declarationLine !== undefined) {
        errors.push(
          createError(
            'E08',
            `A entidade ${entityName} já foi definida na linha ${entity.declarationLine}.`,
            lineNumber,
          ),
        );
      } else {
        entity.declarationLine = lineNumber;
      }

      block = { entityName, openedAtLine: lineNumber, hasAttributeLine: false };
      continue;
    }

    const reservedStatementReason = describeReservedStatement(content, headerLine);
    if (reservedStatementReason) {
      errors.push(createError('E13', reservedStatementReason, lineNumber));
      continue;
    }

    if (entityExpression.test(content)) {
      getOrCreateEntity(entities, content, lineNumber);
      continue;
    }

    const relationshipMatch = content.match(relationshipPrefixExpression);
    if (relationshipMatch) {
      parseRelationship(relationshipMatch, lineNumber, entities, relationships, errors);
      continue;
    }

    if (relationshipWithoutLabelExpression.test(content)) {
      errors.push(
        createError('E07', 'O relacionamento precisa de um rótulo depois de ":".', lineNumber),
      );
      continue;
    }

    const outsideMvpReason = describeOutsideMvpFeature(content);
    if (outsideMvpReason) {
      errors.push(createError('E13', outsideMvpReason, lineNumber));
    } else {
      errors.push(createError('E02', 'Instrução não reconhecida.', lineNumber));
    }
  }

  if (block) {
    errors.push(
      createError(
        'E03',
        `O bloco da entidade ${block.entityName} não foi fechado.`,
        block.openedAtLine,
      ),
    );
  }

  if (errors.length > 0) {
    return { errors };
  }

  const diagram: Diagram = {
    headerLine,
    entities: Array.from(entities.values(), toEntity),
    relationships,
  };

  return { diagram, errors };
}

function isUsefulLine(line: string): boolean {
  const content = line.trim();
  return content !== '' && !content.startsWith('%%');
}

function getOrCreateEntity(
  entities: Map<string, MutableEntity>,
  name: string,
  line: number,
): MutableEntity {
  const existingEntity = entities.get(name);
  if (existingEntity) {
    return existingEntity;
  }

  const entity: MutableEntity = {
    name,
    attributes: [],
    firstMentionLine: line,
  };
  entities.set(name, entity);
  return entity;
}

function closeEntityBlock(
  block: EntityBlockState,
  errors: ParseError[],
  line: number,
): void {
  if (block.hasAttributeLine) {
    return;
  }

  errors.push(
    createError('E10', `A entidade ${block.entityName} não tem atributos.`, line),
  );
}

function parseAttribute(
  content: string,
  entityName: string,
  line: number,
  entities: Map<string, MutableEntity>,
  errors: ParseError[],
): void {
  if (hasUnsupportedAttributeType(content)) {
    errors.push(createError('E13', UNSUPPORTED_TYPE_MESSAGE, line));
    return;
  }

  const quoteResult = extractQuotedText(content, line, errors);
  if (!quoteResult) {
    return;
  }

  if (hasNonAsciiCharacter(quoteResult.beforeQuote)) {
    errors.push(createError('E13', ACCENT_MESSAGE, line));
    return;
  }

  const attributeMatch = quoteResult.beforeQuote.trim().match(attributeExpression);
  if (!attributeMatch) {
    errors.push(createError('E04', 'O atributo precisa de tipo e nome.', line));
    return;
  }

  const [, type, name, keyText] = attributeMatch;
  const keys = parseKeys(keyText, line, errors);
  if (!keys) {
    return;
  }

  const entity = entities.get(entityName);
  if (!entity) {
    return;
  }

  if (entity.attributes.some((attribute) => attribute.name === name)) {
    errors.push(
      createError('E09', `O atributo '${name}' já existe na entidade ${entityName}.`, line),
    );
    return;
  }

  entity.attributes.push({
    type,
    name,
    keys,
    comment: quoteResult.text,
    line,
  });
}

function extractQuotedText(
  content: string,
  line: number,
  errors: ParseError[],
): { beforeQuote: string; text?: string } | undefined {
  const firstQuote = content.indexOf('"');
  if (firstQuote === -1) {
    return { beforeQuote: content };
  }

  const lastQuote = content.lastIndexOf('"');
  if (firstQuote === lastQuote) {
    errors.push(createError('E11', 'Aspas não fechadas.', line));
    return undefined;
  }

  if (lastQuote !== content.length - 1 || content.indexOf('"', firstQuote + 1) !== lastQuote) {
    errors.push(createError('E02', 'Instrução não reconhecida.', line));
    return undefined;
  }

  const text = content.slice(firstQuote + 1, lastQuote);
  if (text === '') {
    errors.push(createError('E14', 'O texto entre aspas não pode ser vazio.', line));
    return undefined;
  }

  return { beforeQuote: content.slice(0, firstQuote), text };
}

function parseKeys(
  keyText: string | undefined,
  line: number,
  errors: ParseError[],
): AttributeKey[] | undefined {
  if (keyText === undefined) {
    return [];
  }

  const keys = keyText.split(',').map((key) => key.trim());
  const validKeys: AttributeKey[] = [];

  for (const key of keys) {
    if (key !== 'PK' && key !== 'FK' && key !== 'UK') {
      errors.push(
        createError('E05', `Chave '${key}' desconhecida. Use PK, FK ou UK.`, line),
      );
      return undefined;
    }

    if (validKeys.includes(key)) {
      errors.push(createError('E12', `A chave ${key} está repetida.`, line));
      return undefined;
    }

    validKeys.push(key);
  }

  return validKeys;
}

function parseRelationship(
  match: RegExpMatchArray,
  line: number,
  entities: Map<string, MutableEntity>,
  relationships: Relationship[],
  errors: ParseError[],
): void {
  const [, leftEntity, operatorText, rightEntity, rawLabel] = match;
  const label = parseLabel(rawLabel.trim(), line, errors);
  const operator = parseOperator(operatorText, line, errors);

  if (!label || !operator) {
    return;
  }

  getOrCreateEntity(entities, leftEntity, line);
  getOrCreateEntity(entities, rightEntity, line);
  relationships.push({
    leftEntity,
    rightEntity,
    leftCardinality: operator.leftCardinality,
    rightCardinality: operator.rightCardinality,
    kind: operator.kind,
    classification: classifyRelationship(operator.leftCardinality, operator.rightCardinality),
    label,
    line,
  });
}

function parseLabel(rawLabel: string, line: number, errors: ParseError[]): string | undefined {
  if (rawLabel === '') {
    errors.push(
      createError('E07', 'O relacionamento precisa de um rótulo depois de ":".', line),
    );
    return undefined;
  }

  const quoted = extractQuotedText(rawLabel, line, errors);
  if (quoted && quoted.text !== undefined && quoted.beforeQuote.trim() === '') {
    return quoted.text;
  }

  if (rawLabel.includes('"')) {
    if (quoted) {
      errors.push(createError('E02', 'Instrução não reconhecida.', line));
    }
    return undefined;
  }

  if (hasNonAsciiCharacter(rawLabel)) {
    errors.push(createError('E13', ACCENTED_LABEL_MESSAGE, line));
    return undefined;
  }

  if (!simpleLabelExpression.test(rawLabel)) {
    errors.push(createError('E02', 'Instrução não reconhecida.', line));
    return undefined;
  }

  return rawLabel;
}

function parseOperator(
  operatorText: string,
  line: number,
  errors: ParseError[],
): ParsedOperator | undefined {
  const match = operatorText.match(relationshipOperatorExpression);
  if (!match) {
    errors.push(createError('E06', 'Símbolo de cardinalidade inválido.', line));
    return undefined;
  }

  const [, leftMarker, connector, rightMarker] = match;
  return {
    leftCardinality: leftCardinalities[leftMarker],
    rightCardinality: rightCardinalities[rightMarker],
    kind: connector === '--' ? 'identifying' : 'nonIdentifying',
  };
}

function classifyRelationship(
  left: Cardinality,
  right: Cardinality,
): RelationshipClassification {
  const leftIsMany = left === 'oneOrMany' || left === 'zeroOrMany';
  const rightIsMany = right === 'oneOrMany' || right === 'zeroOrMany';

  if (leftIsMany && rightIsMany) {
    return 'manyToMany';
  }

  if (leftIsMany) {
    return 'manyToOne';
  }

  if (rightIsMany) {
    return 'oneToMany';
  }

  return 'oneToOne';
}

/**
 * Palavras reservadas do Mermaid e um segundo cabeçalho não são entidades.
 * Uma linha que forma um relacionamento válido continua sendo relacionamento,
 * pois a gramática não reserva esses nomes para entidades.
 * Devolve o motivo do erro E13, ou undefined quando a linha não é reservada.
 */
function describeReservedStatement(content: string, headerLine: number): string | undefined {
  if (!reservedStatementExpression.test(content)) {
    return undefined;
  }

  const relationshipMatch = content.match(relationshipPrefixExpression);
  if (relationshipMatch && relationshipOperatorExpression.test(relationshipMatch[2])) {
    return undefined;
  }

  if (content === 'erDiagram') {
    return `Só é permitido um diagrama por entrada; o cabeçalho erDiagram já aparece na linha ${headerLine}.`;
  }

  const command = content.split(/\s/)[0];
  return `O comando ${command} não é suportado; recursos visuais estão fora do MVP.`;
}

/** Devolve o motivo do erro E13, ou undefined quando a linha é apenas desconhecida (E02). */
function describeOutsideMvpFeature(content: string): string | undefined {
  if (content.startsWith('---')) {
    return 'Configuração com --- (frontmatter) não é suportada.';
  }

  if (/^subgraph\b/.test(content)) {
    return 'O comando subgraph não é suportado.';
  }

  if (content.startsWith('"')) {
    return 'Nomes de entidade entre aspas não são suportados.';
  }

  if (/^[A-Za-z_][A-Za-z0-9_-]*\[/.test(content)) {
    return 'Alias de entidade, como p[Pessoa], não é suportado.';
  }

  if (hasNonAsciiCharacter(content.split('"')[0])) {
    return ACCENT_MESSAGE;
  }

  if (/\b(one or|zero or|many\(|optionally to\b|\bto\b)/.test(content)) {
    return 'Cardinalidade em texto não é suportada; use os símbolos ||, |o, }o ou }| à esquerda e ||, o|, o{ ou |{ à direita.';
  }

  return undefined;
}

function hasNonAsciiCharacter(text: string): boolean {
  return /[^\p{ASCII}]/u.test(text);
}

function hasUnsupportedAttributeType(content: string): boolean {
  return /^[A-Za-z][A-Za-z0-9_]*(?:\[[^\]]*\]|\([^)]*\)|\?)\s+/.test(content);
}

function createError(code: ParseErrorCode, message: string, line: number): ParseError {
  return { code, message: `Linha ${line}: ${message}`, line };
}

function toEntity(entity: MutableEntity): Entity {
  return {
    name: entity.name,
    attributes: entity.attributes,
    firstMentionLine: entity.firstMentionLine,
    declarationLine: entity.declarationLine,
  };
}
