
export enum DefinitionType {
  Plain = 'Plain',
  Tag = 'Tag',
  Example = 'Example',
}

export type Definition = {
  text: string;
  type: DefinitionType;
}

export type Expression = {
  spelling: string;
  inflection?: string;
  definitions: Definition[]
}