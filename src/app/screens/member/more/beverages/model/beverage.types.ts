export {
  BEVERAGE_NAME_MAX_LENGTH,
  BEVERAGE_NOTE_MAX_LENGTH,
} from '../../../../../features/beverages/beverage-constraints';

/** Editing an existing drink by list position, or adding a new one. */
export type BeverageEditorTarget =
  { index: number; kind: 'edit'; name: string; note: string } | { kind: 'add' };
