/** The drink name column is varchar(255); the note column is text. */
export const BEVERAGE_NAME_MAX_LENGTH = 100;
export const BEVERAGE_NOTE_MAX_LENGTH = 200;

/** Editing an existing drink by list position, or adding a new one. */
export type BeverageEditorTarget =
  { index: number; kind: 'edit'; name: string; note: string } | { kind: 'add' };
