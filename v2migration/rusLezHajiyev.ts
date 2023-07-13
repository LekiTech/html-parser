import path from 'path';
import {
  EXAMPLE_START_SYMBOLS,
  ROMAN_NUMERALS,
  convertDictionaryV1ToV2,
  createDefinitionObject,
  readDictionaryFromJSONFile,
  splitToExampleObject,
  writeJSONFile,
} from './engine';
import { Example, ExpressionDetails, ExpressionV1, ExpressionV2 } from './engine/types';

const EXAMPLE_START_SYMBOLS_REGEX = new RegExp(`(?=${EXAMPLE_START_SYMBOLS.join('|')})`, 'g');

function hasOneMoreClosingParenthesis(str: string) {
  return str.split(')').length - str.split('(').length === 1;
}

function mergeTagsWithDefinitions(arr: string[]): string[] {
  const result: string[] = [];
  let tempPrefix: string | undefined = undefined;

  for (const item of arr) {
    if (item.match(/^\d\./gi)) {
      result.push(tempPrefix ? tempPrefix + ' ' + item : item);
      tempPrefix = undefined;
    } else {
      tempPrefix = tempPrefix ? tempPrefix + ' ' + item : item;
    }
  }
  if (tempPrefix) {
    result.push(tempPrefix);
  }
  return result;
}

const customMapper = (
  entry: ExpressionV1,
): { expression: ExpressionV2; mergeWithExisting: boolean } => {
  let mergeWithExisting = false;
  const details: ExpressionDetails = {
    inflection: entry.inflection,
    definitionDetails: [],
    examples: [],
  };
  // prepare definitions
  const definitions = entry.definitions
    .map((definition) => {
      if (definition.match(/^.+\d\./gi)) {
        const splittedByNumbers = definition.split(/(?=\d\.)/gi).map((d) => {
          const result = d.replace(/\($/gi, '').trim();
          if (hasOneMoreClosingParenthesis(result)) {
            if (result.endsWith(')')) {
              return result.slice(0, -1);
            } else if (result.endsWith(').')) {
              return result.slice(0, -2);
            }
          }
          return result;
        });
        const merged = mergeTagsWithDefinitions(splittedByNumbers);
        // if (definition.startsWith('1. <филос.> абсолютный (масадав')) {
        //   console.log(splittedByNumbers);
        //   console.log(merged);
        // }
        return merged;
        // return splittedByNumbers;
      }
      return definition;
    })
    .flat()
    .filter((d) => d && d.length > 0)
    .map((d) => d.split(EXAMPLE_START_SYMBOLS_REGEX).map((d, i) => d.trim()))
    .flat()
    .filter((d) => d && d.length > 0);
  // if (entry.spelling === 'РЯБИТЬ') {
  //   console.log(definitions);
  // }

  for (const definition of definitions) {
    const trimmedDefinition = definition.trimStart();
    if (EXAMPLE_START_SYMBOLS.includes(trimmedDefinition[0])) {
      // Move examples to the examples array
      // const exampleObj = splitToExampleObject(definition.slice(1).trim());
      let didPushExampleObj = false;
      definition
        .slice(1)
        .trim()
        .split(';')
        .forEach((exStr, i) => {
          const exampleObj = splitToExampleObject(exStr.trim());
          if (exampleObj) {
            details.examples.push(exampleObj);
            didPushExampleObj = true;
          } else if (didPushExampleObj) {
            details.examples[details.examples.length - 1].trl += `; ${exStr.trim()}`;
            details.examples[details.examples.length - 1].raw += `; ${exStr.trim()}`;
          } else if (exStr.trim().length > 0) {
            details.examples.push({ raw: exStr });
          }
        });
    } else {
      // === Extract tags from the definition ===
      // Check if the definition starts with a roman numeral
      const foundRomanNumeral = ROMAN_NUMERALS.find((romanNumeral) => {
        if (trimmedDefinition.startsWith(romanNumeral)) {
          return romanNumeral;
        }
      });
      if (foundRomanNumeral) {
        mergeWithExisting = true;
      }
      const definitionWithoutRomanNumeral = foundRomanNumeral
        ? definition.replace(foundRomanNumeral, '').trimStart()
        : definition;
      // Check if the definition starts with an arabic numeral
      const foundArabicNumeral = definitionWithoutRomanNumeral.match(/^\d+\./);
      const definitionWithoutAnyNumeral = foundArabicNumeral
        ? definitionWithoutRomanNumeral.replace(foundArabicNumeral[0], '').trimStart()
        : definitionWithoutRomanNumeral;

      try {
        if (definitionWithoutAnyNumeral.includes(';')) {
          const examples = [] as Example[];
          // hack to find out whether the splitted part is a part of the definition or an example
          let isPreviousExample = false;
          const definitions = definitionWithoutAnyNumeral
            .split(';')
            .map((d) => d.trim())
            .filter((d) => d && d.length > 0)
            .map((d) => {
              const definitionResult = createDefinitionObject(d);
              const exampleObj = splitToExampleObject(definitionResult.value);
              if (exampleObj) {
                if (definitionResult.tags && definitionResult.tags.length > 0) {
                  exampleObj.tags = definitionResult.tags;
                }
                examples.push(exampleObj);
                isPreviousExample = true;
                return null;
              } else if (isPreviousExample && !d.trim().match(/^(<|)см.тж(\.|)(>|)/)) {
                examples[examples.length - 1].trl += `; ${d}`;
                examples[examples.length - 1].raw += `; ${d}`;
                return null;
              }
              isPreviousExample = false;
              return definitionResult;
            })
            .filter((d) => d);

          const resultingDetails =
            examples.length > 0 ? { definitions, examples } : { definitions };

          details.definitionDetails.push(resultingDetails);
        } else {
          const definitionResult = createDefinitionObject(definitionWithoutAnyNumeral);
          const exampleObj = splitToExampleObject(definitionResult.value);
          if (exampleObj) {
            if (definitionResult.tags && definitionResult.tags.length > 0) {
              exampleObj.tags = definitionResult.tags;
            }
            details.examples.push(exampleObj);
          } else {
            details.definitionDetails.push({ definitions: [definitionResult] });
          }
        }
      } catch (e) {
        console.log(`Error while processing definition "${definitionWithoutAnyNumeral}"`);
        throw e;
      }
    }
  }

  // cleanup
  if (!details.inflection) {
    delete details.inflection;
  }
  if (details.examples.length === 0) {
    delete details.examples;
  }

  return {
    expression: {
      spelling: entry.spelling,
      details: [details],
    },
    mergeWithExisting,
  };
};

/*

EDGE CASES:

АБСОЛЮТНЫЙ
АКАДЕМИЧЕСКИЙ
АКАЦИЯ
"УМ"
УСТРОИТЬ
РЯБИТЬ
ТЮФЯК
ШЕСТВИЕ
"НА"

*/

const filePath = path.join(__dirname, './input/rus_lezgi_dict_hajiyev.json');
const dictV1 = readDictionaryFromJSONFile(filePath);
const dictV2 = convertDictionaryV1ToV2(dictV1, customMapper);
const resultPath = path.join(__dirname, './output/rus_lezgi_dict_hajiyev_v2.json');
writeJSONFile(resultPath, dictV2);
