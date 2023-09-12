import path from 'path';
import { DictionaryV2, DictionaryV2_1 } from '../engine/types';

// import lezRuzBabakhanov from './cleanTagsOutput/lezgi_rus_dict_babakhanov_v2.json';
// import rusLezgiHajyiev from './extractedExamplesOutput/rus_lezgi_dict_hajiyev_v2.json';
import tabRusHanShal from './extractedExamplesOutput/tab_rus_dict_hanmagomedov_shalbuzov_v2.json';
import { writeJSONFile } from '../../utils';

/**
 *
 * @param spelling
 * @example Spelling that looks like "АБАСБИГИ(ЯР)" will become ["АБАСБИГИ", "АБАСБИГИЯР"]
 * @example Spelling that looks like "ККА(Ш)УБ" will become ["ККАУБ", "ККАШУБ"]
 */
function splitParenthesesSpelling(spelling: string): string[] {
  const removedParenthesesContent = spelling.replace(/\([^\)]*\)/gm, '').trim();
  const includedParenthesesContent = spelling.replace(/[\(|\)]/gm, '').trim();
  return [removedParenthesesContent, includedParenthesesContent];
}

const dictionaries: {
  dictionary: DictionaryV2;
  fileName: string;
  split(spelling: string): string[];
}[] = [
  // {
  //   dictionary: lezRuzBabakhanov as DictionaryV2,
  //   fileName: 'lezgi_rus_dict_babakhanov_v2_1.json',
  //   split: (spelling) => {
  //     if (spelling.includes('(')) {
  //       return splitParenthesesSpelling(spelling);
  //     } else {
  //       // Example:
  //       // Spelling that looks like "АБАСИ" will become ["АБАСИ"]
  //       return [spelling];
  //     }
  //   },
  // },
  // {
  //   dictionary: rusLezgiHajyiev as DictionaryV2,
  //   fileName: 'rus_lezgi_dict_hajiyev_v2_1.json',
  //   split: (spelling) => {
  //     if (spelling.includes(',')) {
  //       // Example:
  //       // Spelling that looks like "ЯМКА, ЯМОЧКА", will become ["ЯМКА", "ЯМОЧКА"]
  //       return spelling.split(',').map((s) => s.trim());
  //     } else if (spelling.includes('! ')) {
  //       // Example:
  //       // Spelling that looks like "ОЙ! ОЙ-ОЙ-ОЙ!", will become ["ОЙ!", "ОЙ-ОЙ-ОЙ!"]
  //       return spelling.split(/(?<=!)/g).map((s) => s.trim());
  //     } else {
  //       return [spelling];
  //     }
  //   },
  // },
  {
    dictionary: tabRusHanShal as DictionaryV2,
    fileName: 'tab_rus_dict_hanmagomedov_shalbuzov_v2_1.json',
    split: (spelling) =>
      // Example:
      // Spelling that looks like "АБЦIУБ/АЦIУБ" will become ["АБЦIУБ", "АЦIУБ"]
      spelling.includes('/')
        ? spelling
            .split('/')
            .map((s) => (s.includes('(') ? splitParenthesesSpelling(s) : s.trim()))
            .flat()
        : [spelling],
  },
];

for (const { dictionary, fileName, split } of dictionaries) {
  const newDictionary: DictionaryV2_1 = {
    ...dictionary,
    expressions: [],
  };
  const splittedResults: string[][] = [];
  let totalSpellingsCount = 0;
  for (const expression of dictionary.expressions) {
    const newSpelling = split(expression.spelling);
    if (newSpelling.length > 1) {
      splittedResults.push(newSpelling);
    }
    totalSpellingsCount += newSpelling.length;
    newDictionary.expressions.push({
      spelling: newSpelling,
      details: expression.details,
    });
  }
  console.log(
    `Dictionary: '${fileName}', splitted spellings: ${splittedResults.length}, total spellings: ${totalSpellingsCount}`,
  );
  console.log('Splitted results:', splittedResults);
  console.log(
    'Splitted results with more than 2 spellings:',
    splittedResults.filter((s) => s.length > 2),
  );
  console.log('------------------');

  const resultPath = path.join(__dirname, `./splittedSpellingOutput/${fileName}`);
  writeJSONFile(resultPath, newDictionary);
}

/*
// Regex
("value": ")[^а-яА-ЯёЁ{]*([^а-яА-ЯёЁ{])

// БАБАХАНОВ
  {
        "spelling": [
          "ДЕРДИСЕР"
        ],
        "details": [
          {
            "inflection": "-ди, -да, -рри",
            "definitionDetails": [
              {
                "definitions": [
                  {
                    "value": ".",
                    "tags": [
                      "сущ.",
                      "сущ."
                    ]
                  }
                ]
              },
  
// ГАДЖИЕВ
  {
        "spelling": [
          "НАПОЛНЯТЬ"
        ],
        "details": [
          {
            "definitionDetails": [
              {
                "definitions": [
                  {
                    "value": "",
                    "tags": [
                      "несов."
                    ]
                  },
                  {
                    "value": "{наполнить}",
                    "tags": [
                      "см."
                    ]
*/
