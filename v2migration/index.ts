import fs from 'fs';
import path from 'path';
import tags from '../tags';
const DEFINED_TAGS = Object.keys(tags);
const DEFINED_TAGS_REGEX = new RegExp(`(<|^)(${DEFINED_TAGS.join('|')})(>|$)`, 'g');
const DEFINED_TAGS_REGEX_WITHOUT_END_DOTS = new RegExp(
  `(<|^)(${DEFINED_TAGS.map((t) => (t.endsWith('.') ? t.slice(0, -1) : t)).join('|')})(>|>.|$)`,
  'g',
);

export type DictionaryV1 = {
  name: string;
  url?: string;
  expressionLanguageId: string;
  definitionLanguageId: string;
  dictionary: {
    spelling: string;
    inflection?: string;
    definitions: string[];
  }[];
};

export type DictionaryV2 = {
  name: string;
  url?: string;
  expressionLanguageId: string;
  definitionLanguageId: string;
  expressions: {
    spelling: string;
    // TODO: find out the full name of the field
    lex?: string;
    details: {
      // TODO: find out the full name of the field
      gr?: string;
      inflection?: string;
      definitions: {
        text: string;
        // NOTE: extracted from the definition
        tags: string[];
      }[];
      // NOTE: extracted from the definition
      examples: string[] | { src: string; trl: string }[];
    };
  }[];
};

const EXAMPLE_START_SYMBOLS = [
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
const ROMAN_NUMERALS = [
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
 * @param {string} filename Path and name of the JSON file to be read
 */
export function readDictionaryFromJSONFile(filename: string): DictionaryV1 {
  const filePath = path.join(__dirname, filename);
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
 * @param {string} filename Path and name of the JSON file to be written
 * @param {Dictionary} data Dictionary data to be written to the JSON file
 * @param {boolean} prettyPrint Whether to pretty print the JSON file
 */
export function writeJSONFile(filename: string, data: DictionaryV2, prettyPrint = true) {
  const filePath = path.join(__dirname, filename);
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

/**
 * Create definition object from definition string
 * @param {string} definition
 * @returns {{text: string, tags?: string[]}}}
 * */
export function createDefinitionObject(definition: string): { text: string; tags?: string[] } {
  const { tags, def } = extractTagsFromDefinition(definition);
  const definitionWithoutTags = def.length > 0 ? def : definition;
  const definitionResult = {
    text: definitionWithoutTags,
  };
  if (tags.length > 0) {
    definitionResult['tags'] = tags;
  }
  return definitionResult;
}

export function splitToExampleObject(definition: string): { src: string; trl: string } | undefined {
  const trimmedDefinition = definition.trim();
  if (
    trimmedDefinition.startsWith('{') &&
    trimmedDefinition.includes('}') &&
    !trimmedDefinition.endsWith('}')
  ) {
    const src = trimmedDefinition.slice(1, trimmedDefinition.indexOf('}')).trim();
    const trl = trimmedDefinition.slice(trimmedDefinition.indexOf('}') + 1).trim();
    return { src, trl };
  }
}

/**
 * Converts a dictionary from version 1 to version 2
 * @param {DictionaryV1} dictionary
 * @returns {DictionaryV2}
 */
export function convertDictionaryV1ToV2(dictionary: DictionaryV1): DictionaryV2 {
  const expressions = dictionary.dictionary.map((entry) => {
    const details = {
      definitions: [],
      examples: [],
    };
    for (const definition of entry.definitions) {
      const trimmedDefinition = definition.trimStart();
      if (EXAMPLE_START_SYMBOLS.includes(trimmedDefinition[0])) {
        // Move examples to the examples array
        const exampleObj = splitToExampleObject(definition.slice(1).trim());
        if (exampleObj) {
          details.examples.push(exampleObj);
        } else {
          details.examples.push(definition);
        }
      } else {
        // Extract tags from the definition
        const foundNumeral = ROMAN_NUMERALS.find((romanNumeral) => {
          if (trimmedDefinition.startsWith(romanNumeral)) {
            return romanNumeral;
          }
        });
        const definitionWithoutNumeral = foundNumeral
          ? definition.replace(foundNumeral, '').trimStart()
          : definition;
        try {
          if (definitionWithoutNumeral.includes(';')) {
            const definitions = definitionWithoutNumeral
              .split(';')
              .map((d) => d.trim())
              .filter((d) => d && d.length > 0)
              .map((d) => {
                const definitionResult = createDefinitionObject(d);
                const exampleObj = splitToExampleObject(definitionResult.text);
                if (exampleObj) {
                  details.examples.push(exampleObj);
                } else {
                  return definitionResult;
                }
              })
              .filter((d) => d);
            details.definitions.push(...definitions);
          } else {
            const definitionResult = createDefinitionObject(definitionWithoutNumeral);
            const exampleObj = splitToExampleObject(definitionResult.text);
            if (exampleObj) {
              details.examples.push(exampleObj);
            } else {
              details.definitions.push(definitionResult);
            }
          }
        } catch (e) {
          console.log(`Error while processing definition "${definitionWithoutNumeral}"`);
          throw e;
        }
      }
    }
    return {
      spelling: entry.spelling,
      details,
    };
  });
  return {
    name: dictionary.name,
    url: dictionary.url,
    expressionLanguageId: dictionary.expressionLanguageId,
    definitionLanguageId: dictionary.definitionLanguageId,
    expressions,
  };
}

const dictV1 = readDictionaryFromJSONFile('./input/lezgi_rus_dict_babakhanov.json');
const dictV2 = convertDictionaryV1ToV2(dictV1);
writeJSONFile('./output/lezgi_rus_dict_babakhanov_v2_test2.json', dictV2);

// const dictV1 = readDictionaryFromJSONFile('./input/rus_lezgi_dict_hajiyev.json');
// const dictV2 = convertDictionaryV1ToV2(dictV1);
// writeJSONFile('./output/rus_lezgi_dict_hajiyev_v2.json', dictV2);
