import fs from 'fs';
import path from 'path';
import { DefinitionDetails, DictionaryV2, ExpressionV2 } from '../engine/types';
import {
  DEFINED_TAGS_REGEX,
  DEFINED_TAGS_REGEX_WITHOUT_END_DOTS,
  splitToExampleObject,
} from '../engine';
import tags from '../../tags';

// import rusLezgiHajyiev from './cleanTagsOutput/rus_lezgi_dict_hajiyev_v2.json';
import tabRusHanShal from './cleanTagsOutput/tab_rus_dict_hanmagomedov_shalbuzov_v2.json';

/**
 * Function to write a CSV file
 *
 * @param {string} filePath Absolute path and name of the file to be written
 * @param {Dictionary} data Dictionary data to be written to the file
 */
export function writeCsvFile(filePath: string, data: string) {
  fs.writeFileSync(filePath, data);
}

const dictionaries: { dictionary: DictionaryV2; fileName: string }[] = [
  // { dictionary: rusLezgiHajyiev as DictionaryV2, fileName: 'rus_lezgi_dict_hajiyev_v2.json' },
  {
    dictionary: tabRusHanShal as DictionaryV2,
    fileName: 'tab_rus_dict_hanmagomedov_shalbuzov_v2.json',
  },
];

function writeJSONFile(filePath: string, data: DictionaryV2, prettyPrint = true) {
  const fileContent = JSON.stringify(data, null, prettyPrint ? 2 : null);
  fs.writeFileSync(filePath, fileContent);
  console.log(`File '${filePath}' has been written`);
}

for (const { dictionary, fileName } of dictionaries) {
  let extractedExamplesCount = 0;
  for (const expression of dictionary.expressions) {
    for (const expressionDetails of expression.details) {
      for (const defDetail of expressionDetails.definitionDetails) {
        const found = [];
        for (const def of defDetail.definitions) {
          // Find examples stored as definitions
          if (
            def.value.match(/^\{.*\}[^"]+/) &&
            (def.tags === undefined ||
              def.tags?.length === 0 ||
              def.tags.filter((t) => t.includes('см')).length === 0)
          ) {
            // console.log('Found example in definition', expression.spelling, '-', `"${def.value}"`);
            const example = splitToExampleObject(def.value);
            if (example !== null) {
              // console.log('example', example);
              defDetail.examples = defDetail.examples
                ? [...defDetail.examples, example]
                : [example];
              // console.log('------------------');
              found.push(def);
              extractedExamplesCount++;
            }
          }
        }
        if (found.length > 0) {
          defDetail.definitions = defDetail.definitions.filter((d) => !found.includes(d));
          // console.log(defDetail);
          // console.log('==================');
        }
      }
    }
  }

  console.log(`Extracted ${extractedExamplesCount} examples from '${fileName}'`);

  const resultPath = path.join(__dirname, `./extractedExamplesOutput/${fileName}`);
  writeJSONFile(resultPath, dictionary);
}
