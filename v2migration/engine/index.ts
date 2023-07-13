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
const DEFINED_TAGS_REGEX = new RegExp(
  `(<|^)(${DEFINED_TAGS.join('|').replaceAll('.', '\\.')})(>|$)`,
  'g',
);
const DEFINED_TAGS_REGEX_WITHOUT_END_DOTS = new RegExp(
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
 * Function to write a JSON file
 *
 * @param {string} filePath Absolute path and name of the JSON file to be written
 * @param {Dictionary} data Dictionary data to be written to the JSON file
 * @param {boolean} prettyPrint Whether to pretty print the JSON file
 */
export function writeJSONFile(filePath: string, data: DictionaryV2, prettyPrint = true) {
  const fileContent = JSON.stringify(data, null, prettyPrint ? 2 : null);
  fs.writeFileSync(filePath, fileContent);
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
      // if (word === 'фу') {
      //   console.log(definition);
      //   console.log(matches);
      //   console.log(DEFINED_TAGS_REGEX);
      //   console.log(DEFINED_TAGS_REGEX_WITHOUT_END_DOTS);
      // }
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

/**
 * Create definition object from definition string
 * @param {string} definition string
 * @returns {DefinitionDetails} object with definitions and tags
 * */
export function createDefinitionObject(definition: string): { value: string; tags?: string[] } {
  const { tags, def } = extractTagsFromDefinition(definition);
  const definitionWithoutTags = (def.length > 0 || tags.length > 0 ? def : definition).replace(/^\d\./gi, '').trim();
  const definitionResult = {
    value: definitionWithoutTags,
  };
  if (tags.length > 0) {
    definitionResult['tags'] = tags;
  }
  // TODO: remove
  if (definitionResult.value === '' && (tags.includes('фин.') || tags.includes('фин'))) {
    definitionResult.value = 'фин';
    definitionResult['tags'] = tags.filter((t) => t !== 'фин.' && t !== 'фин');
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
): DictionaryV2 {
  const parsedSpellings = new Set<string>();
  const expressions: ExpressionV2[] = []; //dict.dictionary.map(customMapper);
  for (const oldExpression of dict.dictionary) {
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
    url: dict.url,
    expressionLanguageId: dict.expressionLanguageId,
    definitionLanguageId: dict.definitionLanguageId,
    expressions,
  };
}

// const dictV1 = readDictionaryFromJSONFile('./input/lezgi_rus_dict_babakhanov.json');
// const dictV2 = convertDictionaryV1ToV2(dictV1);
// writeJSONFile('./output/lezgi_rus_dict_babakhanov_v2_test2.json', dictV2);

// const dictV1 = readDictionaryFromJSONFile('./input/rus_lezgi_dict_hajiyev.json');
// const dictV2 = convertDictionaryV1ToV2(dictV1);
// writeJSONFile('./output/rus_lezgi_dict_hajiyev_v2.json', dictV2);

// const dictV1 = readDictionaryFromJSONFile('./input/tab_rus_dict_hanmagomedov_shalbuzov.json');
// const dictV2 = convertDictionaryV1ToV2(dictV1);
// writeJSONFile('./output/tab_rus_dict_hanmagomedov_shalbuzov_v2.json', dictV2);
