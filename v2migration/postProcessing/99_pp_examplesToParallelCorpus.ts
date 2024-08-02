import fs from 'fs';
import path from 'path';
import { DictionaryV2, DictionaryV2_1, Example } from '../engine/types';

import lezgiRusBabakhanov from './splittedSpellingOutput/lezgi_rus_dict_babakhanov_v2_1.json';
import rusLezgiHajyiev from './splittedSpellingOutput/rus_lezgi_dict_hajiyev_v2_1.json';

/**
 * Function to write a CSV file
 *
 * @param {string} filePath Absolute path and name of the file to be written
 * @param {Dictionary} data Dictionary data to be written to the file
 */
export function writeCsvFile(filePath: string, data: string) {
  fs.writeFileSync(filePath, data);
}

const dictionaries: { lezRus: DictionaryV2_1; rusLez: DictionaryV2_1 } = {
  lezRus: lezgiRusBabakhanov as DictionaryV2_1,
  rusLez: rusLezgiHajyiev as DictionaryV2_1,
};

type ExampleResult = { lez: string; rus: string };

const regex = /[<]*букв[.]*[>]*|\d\)|;/;

function mapExamples(
  examples: Example[],
  lezKey: 'src' | 'trl',
  rusKey: 'src' | 'trl',
): ExampleResult[] {
  return (
    examples
      ?.filter((ex) => ex.src && ex.trl)
      .map((ex) => {
        const rus = ex[rusKey];
        const lez = ex[lezKey];
        if (rus.match(regex)) {
          return rus
            .split(regex)
            .filter((r) => r && r.trim().length > 0 && !r.includes('см.') && !r.includes('см>'))
            .map((r) => ({ lez, rus: r.replace(/\(|\)/g, '').trim() }));
          // return [
          //   { lez, rus: rus1 },
          //   { lez, rus: rus2 },
          // ];
        }
        return { lez, rus };
      })
      .flat() ?? []
  );
}

function getExamplesFromDictionary(
  dict: DictionaryV2_1,
  lez: 'src' | 'trl',
  rus: 'src' | 'trl',
): ExampleResult[] {
  const result: ExampleResult[] = [];
  for (const expression of dict.expressions) {
    for (const expressionDetails of expression.details) {
      const examples: ExampleResult[] = mapExamples(expressionDetails.examples, lez, rus);
      for (const defDetail of expressionDetails.definitionDetails) {
        examples.push(...mapExamples(defDetail.examples, lez, rus));
      }
      result.push(...examples);
    }
  }
  return result;
}

const csvData: ExampleResult[] = [
  ...getExamplesFromDictionary(dictionaries.lezRus, 'src', 'trl'),
  ...getExamplesFromDictionary(dictionaries.rusLez, 'trl', 'src'),
];

console.log(`Total of ${csvData.length} parallel lez-rus translations`);

const csvFileData = csvData.map((ex) => `${ex.lez};${ex.rus}`).join('\n');

writeCsvFile(path.join(__dirname, 'corpusOutput', 'lez_rus_corpus.csv'), csvFileData);
