import fs from 'fs';
import path from 'path';
import { LEZGI_ALPHABET, RUSSIAN_ALPHABET, TABASARAN_ALPHABET } from './alphabets';

export type Dictionary = {
  name: string;
  url?: string;
  expressionLanguageId: string;
  definitionLanguageId: string;
  dictionary: {
    spelling: string;
    inflection: string;
    definitions: string[];
  }[];
};

/**
 * Function to read a JSON file and return its contents
 *
 * @param {string} filename Path and name of the JSON file to be read
 */
export function readDictionaryFromJSONFile(filename: string): Dictionary {
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
  return jsonContent as Dictionary;
}

/**
 * Function to write a JSON file
 *
 * @param {string} filename Path and name of the JSON file to be written
 * @param {Dictionary} data Dictionary data to be written to the JSON file
 * @param {boolean} prettyPrint Whether to pretty print the JSON file
 */
export function writeJSONFile(filename: string, data: Dictionary, prettyPrint = true) {
  const filePath = path.join(__dirname, filename);
  const fileContent = JSON.stringify(data, null, prettyPrint ? 2 : null);
  fs.writeFileSync(filePath, fileContent);
}

/**
 * This function takes a dictionary object read from file and checks wheather under its `dictionary` property array all its objects
 * are in alphabetical order according to the provided alphabet compared by `spelling` property
 * If not, it prints encountered errors
 *
 * @param {Dictionary} dictionary
 * @param {string[]} alphabet
 */
export function checkDictionaryAlphabeticalOrder(dictionary: Dictionary, alphabet: string[]) {
  let previousSpelling = '';
  let previousStart = {
    letter: '',
    idx: -1,
  };
  let errorCount = 0;
  for (let i = 0; i < dictionary.dictionary.length; i++) {
    const entry = dictionary.dictionary[i];
    const currentSpelling = entry.spelling;
    const doubleLetterIndex = alphabet.indexOf(currentSpelling.slice(0, 2).toUpperCase());
    const singleLetterIndex = alphabet.indexOf(currentSpelling[0].toUpperCase());
    const currentStart =
      doubleLetterIndex !== -1
        ? {
            letter: currentSpelling.slice(0, 2),
            idx: doubleLetterIndex,
          }
        : {
            letter: currentSpelling[0],
            idx: singleLetterIndex,
          };
    if (currentStart.idx === -1) {
      console.log(
        `Error: '${currentStart.letter}' of '${currentSpelling}' is not in the provided alphabet`,
      );
      errorCount++;
    } else if (currentStart.idx < previousStart.idx) {
      console.log(
        `Error: '${currentSpelling}' is not in alphabetical order. Previous spelling: '${previousSpelling}'.\n Current start: '${currentStart.letter}' (${currentStart.idx}), previous start: '${previousStart.letter}' (${previousStart.idx})`,
      );
      errorCount++;
    }
    previousSpelling = currentSpelling;
    previousStart = currentStart;
  }
  if (errorCount === 0) {
    console.log('No errors found');
  } else {
    console.log(`Found ${errorCount} errors`);
  }
}

// const dictionary = readDictionaryFromJSONFile('input/lezgi_rus_dict_babakhanov.json');
// checkDictionaryAlphabeticalOrder(dictionary, LEZGI_ALPHABET);

// const dictionary = readDictionaryFromJSONFile('input/tab_rus_dict_hanmagomedov_shalbuzov.json');
// checkDictionaryAlphabeticalOrder(dictionary, TABASARAN_ALPHABET);

// const dictionary = readDictionaryFromJSONFile('input/lezgi_rus_dict_talibov_hajiyev.json');
// checkDictionaryAlphabeticalOrder(dictionary, LEZGI_ALPHABET);

// const dictionary = readDictionaryFromJSONFile('input/rus_lezgi_dict_hajiyev.json');
// checkDictionaryAlphabeticalOrder(dictionary, RUSSIAN_ALPHABET);
