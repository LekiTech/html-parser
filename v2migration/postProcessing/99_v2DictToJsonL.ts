import fs from 'fs';
import path from 'path';
import { DictionaryV2 } from '../engine/types';

import rusLezgiHajyiev from './splittedSpellingOutput/rus_lezgi_dict_hajiyev_v2_1.json';
import lezRuzBabakhanov from './splittedSpellingOutput/lezgi_rus_dict_babakhanov_v2_1.json';

const dictionaries: { dictionary: DictionaryV2; fileName: string }[] = [
  { dictionary: rusLezgiHajyiev as DictionaryV2, fileName: 'rus_lezgi_dict_hajiyev_v2_1.jsonl' },
  {
    dictionary: lezRuzBabakhanov as DictionaryV2,
    fileName: 'lezgi_rus_dict_babakhanov_v2_1.jsonl',
  },
];

const langMapper = {
  lez: 'lezgi',
  rus: 'russian',
  eng: 'english',
  tab: 'tabasaran',
};

for (const { dictionary, fileName } of dictionaries) {
  const resultArray = [];
  const spellingLang = langMapper[dictionary.expressionLanguageId];
  const definitionLang = langMapper[dictionary.definitionLanguageId];
  for (const expression of dictionary.expressions) {
    const expObj = {
      spellingLang,
      definitionLang,
      ...expression,
    };
    resultArray.push(expObj);
  }
  const result = resultArray.map((expObj) => JSON.stringify(expObj)).join('\n');
  const resultPath = path.join(__dirname, `./jsonl/${fileName}`);
  // writeJSONFile(resultPath, dictionary);
  fs.writeFileSync(resultPath, result);
}
