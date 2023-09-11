import fs from 'fs';
import path from 'path';
import tags from '../../tags';
import {
  DictionaryV1,
  DictionaryV2,
  Example,
  DefinitionDetails,
  ExpressionV1,
  ExpressionV2,
} from './types';
const DEFINED_TAGS = Object.keys(tags);
export const DEFINED_TAGS_REGEX = new RegExp(
  `(<|^)(${DEFINED_TAGS.join('|').replaceAll('.', '\\.')})(>|$)`,
  'g',
);
export const DEFINED_TAGS_REGEX_WITHOUT_END_DOTS = new RegExp(
  `(<|^)(${DEFINED_TAGS.map((t) => (t.endsWith('.') ? t.slice(0, -1) : t)).join('|')})(>|>.|$)`,
  'g',
);

export const EXAMPLE_START_SYMBOLS = [
  '♦',
  '☼',
  '⦿',
  '▪',
  '▫',
  '◊',
  '○',
  '●',
  '■',
  '□',
  '▲',
  '▼',
  '◆',
  '◇',
  '★',
  '☆',
  '☽',
  '☾',
  '�',
];

/**
 * Reversed array of Roman numerals from 1 to 20
 * Used to detect the numeral at the beginning of a definition
 * Reverse order is used to detect the longest numeral first
 */
export const ROMAN_NUMERALS = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
  'XIII',
  'XIV',
  'XV',
  'XVI',
  'XVII',
  'XVIII',
  'XIX',
  'XX',
].reverse();

/**
 * Function to read a JSON file and return its contents
 *
 * @param {string} filePath Absolute path and name of the JSON file to be read
 */
export function readDictionaryFromJSONFile(filePath: string): DictionaryV1 {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const jsonContent = JSON.parse(fileContent);
  // Check if the jsonContent is a dictionary
  if (
    !jsonContent.name ||
    !jsonContent.expressionLanguageId ||
    !jsonContent.definitionLanguageId ||
    !jsonContent.dictionary
  ) {
    throw new Error('The JSON file does not contain a dictionary');
  }
  return jsonContent as DictionaryV1;
}

/**
 * Extracts tags from a definition and returns them as an array together with the definition without the tags
 * @param {string} definition
 * @returns {{tags: string[], def: string}}
 */
export function extractTagsFromDefinition(definition: string): { tags: string[]; def: string } {
  const tags: string[] = [];
  const def = definition
    .replaceAll(/(>\.|>)/gi, '> ')
    .replaceAll(/ +/gi, ' ')
    .trim()
    .split(' ')
    .map((word, i) => {
      const matches =
        word.match(DEFINED_TAGS_REGEX) || word.match(DEFINED_TAGS_REGEX_WITHOUT_END_DOTS);
      if (!!matches && matches.length > 0 && i === tags.length) {
        tags.push(...matches); //, `i=${i} tags.length=${tags.length}`
        return undefined;
      } else {
        return word;
      }
    })
    .filter((word) => !!word)
    .join(' ');
  return { tags, def };
}

// const tempDefaultInflection = new Set<string>();

/**
 * Create definition object from definition string
 * @param {string} definition string
 * @returns {DefinitionDetails} object with definitions and tags
 * */
export function createDefinitionObject(definition: string): { value: string; tags?: string[] } {
  const { tags, def } = extractTagsFromDefinition(definition);
  const definitionWithoutTags = (def.length > 0 || tags.length > 0 ? def : definition)
    .replace(/^\d(\.|\))/gi, '')
    .trim();
  const definitionResult = {
    value: definitionWithoutTags,
  };
  if (tags.length > 0) {
    definitionResult['tags'] = tags;
  }
  return definitionResult;
}

/**
 * Splits only if string strats with "{" and contains "}" but does not end with "}"
 *
 * @param definition definition string in format "{src} trl"
 * @returns
 */
export function splitToExampleObject(definition: string): Example | undefined {
  const trimmedDefinition = definition.trim();
  if (
    trimmedDefinition.startsWith('{') &&
    trimmedDefinition.includes('}') &&
    !trimmedDefinition.endsWith('}')
  ) {
    const src = trimmedDefinition.slice(1, trimmedDefinition.indexOf('}')).trim();
    const trlWithTags = trimmedDefinition.slice(trimmedDefinition.indexOf('}') + 1).trim();
    const { tags, def: trlWithoutTags } = extractTagsFromDefinition(trlWithTags);
    if (tags.length > 0) {
      return { src, trl: trlWithoutTags, tags, raw: definition };
    }
    return { src, trl: trlWithoutTags, raw: definition };
  }
}

/**
 * Converts a dictionary from version 1 to version 2
 * @param {DictionaryV1} dict
 * @returns {DictionaryV2}
 */
export function convertDictionaryV1ToV2(
  dict: DictionaryV1,
  customMapper: (oldExpression: ExpressionV1) => {
    expression: ExpressionV2;
    mergeWithExisting: boolean;
  },
  meta: {
    authors?: string;
    publicationYear?: string;
    providedBy?: string;
    providedByURL?: string;
    processedBy?: string;
  } = {},
): DictionaryV2 {
  const parsedSpellings = new Set<string>();
  const expressions: ExpressionV2[] = []; //dict.dictionary.map(customMapper);
  for (const oldExpression of dict.dictionary) {
    // // === todo: remove
    // if (oldExpression.inflection) {
    //   oldExpression.inflection = oldExpression.inflection
    //     .trim()
    //     .replace(/.*(,|\.)$/gi, '')
    //     .trim();
    //   tempDefaultInflection.add(oldExpression.inflection);
    // }
    // // ===
    const { expression, mergeWithExisting } = customMapper(oldExpression);
    if (mergeWithExisting || parsedSpellings.has(expression.spelling)) {
      const existingExpression = expressions.find((e) => e.spelling === expression.spelling);
      if (existingExpression) {
        existingExpression.details.push(...expression.details);
      } else {
        expressions.push(expression);
      }
    } else {
      expressions.push(expression);
    }
    parsedSpellings.add(expression.spelling);
  }
  return {
    name: dict.name,
    authors: meta.authors,
    publicationYear: meta.publicationYear,
    providedBy: meta.providedBy,
    providedByURL: meta.providedByURL,
    processedBy: meta.processedBy,
    seeSourceURL: dict.url,
    expressionLanguageId: dict.expressionLanguageId,
    definitionLanguageId: dict.definitionLanguageId,
    expressions,
  };
}
