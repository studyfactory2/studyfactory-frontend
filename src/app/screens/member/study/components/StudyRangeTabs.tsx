import { STUDY_RANGE_OPTIONS } from '../model/study.labels';
import type { StudyRangeKey } from '../model/study.types';
import '../styles/StudyRangeTabs.css';

export type StudyRangeTabsProps = {
  onSelect: (range: StudyRangeKey) => void;
  value: StudyRangeKey;
};

export function StudyRangeTabs({ onSelect, value }: StudyRangeTabsProps) {
  return (
    <div
      aria-label="조회 기간 선택"
      className="member-study__tabs"
      role="group"
    >
      {STUDY_RANGE_OPTIONS.map((option) => (
        <button
          aria-pressed={option.key === value}
          className={option.key === value ? 'is-active' : ''}
          key={option.key}
          onClick={() => onSelect(option.key)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
