import fs from 'fs';
import { Definition, DefinitionType } from './types';
import { DictionaryV2, DictionaryV2_1 } from './v2migration/engine/types';

export function addTagsWithinSpaces(text: string, leftTag: string, rightTag: string) {
  const hasLeftSpace = /^\s/.test(text);
  const hasRightSpace = /\s$/.test(text);
  return (hasLeftSpace ? ' ' : '') + leftTag + text.trim() + rightTag + (hasRightSpace ? ' ' : '');
}

export function aggregateDefinitions(definitions: Definition[]): string[] {
  return [
    definitions
      .map((def) => {
        switch (def.type) {
          case DefinitionType.Example:
            return addTagsWithinSpaces(def.text, '{', '}'); //`{${def.text}}`;
          case DefinitionType.Tag:
            return addTagsWithinSpaces(def.text, '<', '>'); //`<${def.text}>`;
          default:
            if (def.type !== DefinitionType.Plain) {
              console.error(def.type, 'is not of type', DefinitionType.Plain);
            }
            return def.text;
        }
      })
      .join(''),
  ];
}

/**
 * Function to write a JSON file
 *
 * @param {string} filePath Absolute path and name of the JSON file to be written
 * @param {Dictionary} data Dictionary data to be written to the JSON file
 * @param {boolean} prettyPrint Whether to pretty print the JSON file
 */
export function writeJSONFile(
  filePath: string,
  data: DictionaryV2 | DictionaryV2_1,
  prettyPrint = true,
) {
  const fileContent = JSON.stringify(data, null, prettyPrint ? 2 : null);
  fs.writeFileSync(filePath, fileContent);
}
