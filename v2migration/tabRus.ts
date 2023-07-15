import path from 'path';
import {
  DEFINED_TAGS_REGEX,
  DEFINED_TAGS_REGEX_WITHOUT_END_DOTS,
  ROMAN_NUMERALS,
  convertDictionaryV1ToV2,
  createDefinitionObject,
  readDictionaryFromJSONFile,
  splitToExampleObject,
  writeJSONFile,
} from './engine';
import { Example, ExpressionDetails, ExpressionV1, ExpressionV2 } from './engine/types';

function hasOneMoreClosingParenthesis(str: string) {
  return str.split(')').length - str.split('(').length === 1;
}

function mergeTagsWithDefinitions(arr: string[]): string[] {
  const result: string[] = [];
  let tempPrefix: string | undefined = undefined;

  for (const item of arr) {
    if (item.match(/^\d(\.|\))/gi)) {
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
    .map((definition) =>
      definition.replaceAll('~', entry.spelling.toLowerCase().replaceAll('i', 'I')),
    )
    .map((definition) => {
      if (definition.match(/^.+\d(\.|\))/gi)) {
        const splittedByNumbers = definition.split(/(?=\d\.)|(?=\d\))/gi).map((d) => {
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
    // .map((d) => d.split(EXAMPLE_START_SYMBOLS_REGEX).map((d, i) => d.trim()))
    .flat()
    .filter((d) => d && d.length > 0);
  // if (entry.spelling === 'РЯБИТЬ') {
  //   console.log(definitions);
  // }
  const tempInflections = [];
  for (const definition of definitions) {
    const trimmedDefinition = definition.trimStart();
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
    const foundArabicNumeral = definitionWithoutRomanNumeral.match(/^\d+(\.|\))/);
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
            const inflections = d
              .match(/^<[^>]*>/gi)
              ?.filter(
                (word) =>
                  !word.match(DEFINED_TAGS_REGEX) &&
                  !word.match(DEFINED_TAGS_REGEX_WITHOUT_END_DOTS),
              );
            if (inflections && inflections.length > 0) {
              tempInflections.push(...inflections);
            }
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

        const resultingDetails = examples.length > 0 ? { definitions, examples } : { definitions };

        details.definitionDetails.push(resultingDetails);
      } else {
        const inflections = definitionWithoutAnyNumeral
          .match(/^<[^>]*>/gi)
          ?.filter(
            (word) =>
              !word.match(DEFINED_TAGS_REGEX) && !word.match(DEFINED_TAGS_REGEX_WITHOUT_END_DOTS),
          );
        if (inflections && inflections.length > 0) {
          tempInflections.push(...inflections);
        }
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
  if (tempInflections && tempInflections.length > 1) {
    console.log(
      entry.spelling,
      `\t\tINFLECTIONS: `,
      tempInflections,
      'with default inflection',
      details.inflection,
    );
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
АВЧЙ
АГЬЛИI
БАГАГЬЛУ
АЬЯНДАР
БИКАРI
КАР
ШЮРЮКЬЮН
УБГУБ/УРГУБ

// TODO: CHECK FOR DOUBLE INFLECTIONS
БАГАГЬЛУ  
АЬЯНДАР   
БИКАРI.   
ГАД       
ИГАГ      
КАР       
КЕЛЛЕГЮЗ  
КЕЧЕЛI.   
ЛАЛАКII.  
МЕРДИМАЗАР
МУТIЛАКЬ  
ТАХСИРКАР 
ТЕВЕКЕРI. 
УРТАБАБ   
ФАСАД     
ФАГЪЙРI.  
ХАБАРДАР  
ШЮРЮКЬЮН  

SPOTTING ISSUES IN DEFINITIONS (regex):
        ".*([А-ЯЁ]{2,})+



*/

const filePath = path.join(__dirname, './input/tab_rus_dict_hanmagomedov_shalbuzov.json');
const dictV1 = readDictionaryFromJSONFile(filePath);
const dictV2 = convertDictionaryV1ToV2(dictV1, customMapper);
const resultPath = path.join(__dirname, './output/tab_rus_dict_hanmagomedov_shalbuzov_v2.json');
writeJSONFile(resultPath, dictV2);
