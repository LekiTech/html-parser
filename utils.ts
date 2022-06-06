import { Definition, DefinitionType } from "./types";

export function addTagsWithinSpaces(text: string, leftTag: string, rightTag: string) {
  const hasLeftSpace = /^\s/.test(text);
  const hasRightSpace = /\s$/.test(text);
  return (hasLeftSpace ? ' ' : '') + leftTag +
    text.trim() +
    rightTag + (hasRightSpace ? ' ' : '');
}

export function aggregateDefinitions(definitions: Definition[]): string[] {
  return [
    definitions.map(def => {
      switch (def.type) {
        case DefinitionType.Example:
          return addTagsWithinSpaces(def.text, '{', '}'); //`{${def.text}}`;
        case DefinitionType.Tag:
          return addTagsWithinSpaces(def.text, '<', '>'); //`<${def.text}>`;
        default:
          if (def.type !== DefinitionType.Plain) {
            console.error(def.type, 'is not of type', DefinitionType.Plain)
          }
          return def.text;
      }
    }).join('')
  ]
}