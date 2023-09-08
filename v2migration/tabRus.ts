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

function removeAllNumeralsFromDefinitionStart(definition: string) {
  let mergeWithExisting = false;
  const trimmedDefinition = definition.trimStart();
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
  return { definitionWithoutAnyNumeral, mergeWithExisting };
}

/**
 *
 * @param definition
 * @param tempInflections
 * @param details
 * @param spelling
 *
 * @returns new definition without inflections
 */
function extractInflections(
  definition: string,
  tempInflections: any[],
  details: ExpressionDetails,
  spelling: string,
): string {
  const inflections = definition
    .match(/^<[^>]*>/gi)
    ?.filter(
      (word) => !word.match(DEFINED_TAGS_REGEX) && !word.match(DEFINED_TAGS_REGEX_WITHOUT_END_DOTS),
    );
  if (inflections && inflections.length > 0) {
    tempInflections.push(...inflections);
    if (!details.inflection) {
      details.inflection = inflections[0].replaceAll('<', '').replaceAll('>', '');
      const definitionWithoutInflection = definition.replace(inflections[0], '').trim();
      const definitionWithoutInflectionAndNumerals = removeAllNumeralsFromDefinitionStart(
        definitionWithoutInflection,
      );
      return definitionWithoutInflectionAndNumerals.definitionWithoutAnyNumeral;
    } else {
      console.error('Multiple inflections', spelling, inflections);
    }
  }
  return definition;
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
    // === Extract tags from the definition ===
    const { definitionWithoutAnyNumeral, mergeWithExisting: mergeCurrentDefWithExisting } =
      removeAllNumeralsFromDefinitionStart(definition);
    if (mergeCurrentDefWithExisting) {
      mergeWithExisting = true;
    }
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
            const definitionWithoutInflection = extractInflections(
              d,
              tempInflections,
              details,
              entry.spelling,
            );
            const definitionResult = createDefinitionObject(definitionWithoutInflection);
            const exampleObj = splitToExampleObject(definitionResult.value);
            if (exampleObj) {
              if (definitionResult.tags && definitionResult.tags.length > 0) {
                exampleObj.tags = definitionResult.tags;
              }
              examples.push(exampleObj);
              isPreviousExample = true;
              return null;
            } else if (
              isPreviousExample &&
              !definitionWithoutInflection.trim().match(/^(<|)см.тж(\.|)(>|)/)
            ) {
              examples[examples.length - 1].trl += `; ${definitionWithoutInflection}`;
              examples[examples.length - 1].raw += `; ${definitionWithoutInflection}`;
              return null;
            }
            isPreviousExample = false;
            return definitionResult;
          })
          .filter((d) => d);

        const resultingDetails = examples.length > 0 ? { definitions, examples } : { definitions };

        details.definitionDetails.push(resultingDetails);
      } else {
        const definitionWithoutInflection = extractInflections(
          definitionWithoutAnyNumeral,
          tempInflections,
          details,
          entry.spelling,
        );
        const definitionResult = createDefinitionObject(definitionWithoutInflection);
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
TODO: MANUAL FIXES
АЬКСИ
ГЪАНШАРДИ
ГЬИЛЛА
КЪАРШУ
КЪАРШУДИ
ПОСЛЕЛОГ
ТЕАТР
ШАЙР


EDGE CASES:
АВЧЙ
АГЬЛИ
БАГАГЬЛУ
АЬЯНДАР
БИКАР
КАР
ШЮРЮКЬЮН
УБГУБ/УРГУБ

// TODO: CHECK FOR DOUBLE INFLECTIONS
БАГАГЬЛУ  
АЬЯНДАР   
БИКАР     
ГАД       
ИГАГ      
КАР       
КЕЛЛЕГЮЗ  
КЕЧЕЛ     
ЛАЛАКI    
МЕРДИМАЗАР
МУТIЛАКЬ  
ТАХСИРКАР 
ТЕВЕКЕР   
УРТАБАБ   
ФАСАД     
ФАГЪЙР    
ХАБАРДАР  
ШЮРЮКЬЮН  

SPOTTING ISSUES IN DEFINITIONS (regex):
        ".*([А-ЯЁ]{2,})+

REPLACE TYPOS EVERYWHERE EXCEPT SPELLING:
example: кймень => камень

example: пбмощь => помощь
  regex:
    ([бвгджзклмнпрстфхцчшщ])б([бвгджзклмнпрстфхцчшщ])
  replace with:
    $1о$2

example: ПБМОЩЬ => ПОМОЩЬ
  regex:
    ([БВГДЖЗКЛМНПРСТФХЦЧШЩ])Б([БВГДЖЗКЛМНПРСТФХЦЧШЩ])
  replace with:
    $1О$2

example 3та => эта

*/

const filePath = path.join(__dirname, './input/tab_rus_dict_hanmagomedov_shalbuzov.json');
const dictV1 = readDictionaryFromJSONFile(filePath);
const dictV2 = convertDictionaryV1ToV2(dictV1, customMapper, {
  authors: 'Ханмагомедов Б.Г.К., Шалбузов К.Т.',
  providedBy: 'Imran Gadzhiev',
  processedBy: 'K.Z. Tadzjibov',
});
const resultPath = path.join(__dirname, './output/tab_rus_dict_hanmagomedov_shalbuzov_v2.json');
writeJSONFile(resultPath, dictV2);
