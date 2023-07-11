import path from 'path';
import {
  // Definition,
  EXAMPLE_START_SYMBOLS,
  ROMAN_NUMERALS,
  convertDictionaryV1ToV2,
  createDefinitionObject,
  readDictionaryFromJSONFile,
  splitToExampleObject,
  writeJSONFile,
} from './engine';
import { Example, ExpressionDetails, ExpressionV1, ExpressionV2 } from './engine/types';

// function combineExamples(inputs: Definition[]): Definition[] {
//   return inputs.reduce((acc: Definition[], curr: Definition) => {
//     // Check if the current item has text.
//     if (curr.text !== '') {
//       // This is a text item. Add it to the accumulator.
//       acc.push(curr);
//     } else if (curr.examples && acc.length > 0) {
//       // This is an example item and we have a last text item. Add the examples to the last text item.
//       const lastItemWithText = acc[acc.length - 1];
//       lastItemWithText.examples = lastItemWithText.examples || [];
//       lastItemWithText.examples.push(...curr.examples);
//     }
//     return acc;
//   }, []);
// }

const customMapper = (
  entry: ExpressionV1,
): { expression: ExpressionV2; mergeWithExisting: boolean } => {
  let mergeWithExisting = false;
  const details: ExpressionDetails = {
    inflection: entry.inflection,
    definitionDetails: [],
    examples: [],
  };
  for (const definition of entry.definitions) {
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
          } else {
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
combineExamples(definitions)
EDGE CASES:

АБАД
АВАТУН
АКУДУН
АЛУХ
АХЪА

*/

const filePath = path.join(__dirname, './input/lezgi_rus_dict_babakhanov.json');
const dictV1 = readDictionaryFromJSONFile(filePath);
const dictV2 = convertDictionaryV1ToV2(dictV1, customMapper);
const resultPath = path.join(__dirname, './output/lezgi_rus_dict_babakhanov_v2_test3.json');
writeJSONFile(resultPath, dictV2);