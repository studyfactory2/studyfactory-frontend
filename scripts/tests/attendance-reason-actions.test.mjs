import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const components = new URL(
  '../../src/app/features/attendances/workspace/components/',
  import.meta.url,
);
const modal = readFileSync(
  new URL('AttendanceReasonModal.tsx', components),
  'utf8',
);
const history = readFileSync(
  new URL('AttendanceReasonHistory.tsx', components),
  'utf8',
);

// These source contracts protect action placement and wiring. They do not
// replace browser checks of footer visibility, focus, or request execution.
function draftFooter() {
  const start = modal.indexOf(
    '<div className="attendance-reason__footer" key="draft-actions">',
  );
  assert.notEqual(start, -1, 'the modal must retain its draft action footer');
  const end = modal.indexOf('\n      }\n    >', start);
  assert.notEqual(
    end,
    -1,
    'the draft action footer must end before modal content',
  );
  return modal.slice(start, end);
}

function cancellationButton() {
  const matches = [...draftFooter().matchAll(/<Button\b[\s\S]*?<\/Button>/g)]
    .map(([button]) => button)
    .filter((button) =>
      button.includes('className="attendance-reason__cancel-selection"'),
    );
  assert.equal(
    matches.length,
    1,
    'show exactly one selected-date cancel action',
  );
  return matches[0];
}

test('source contract: selected-date cancellation is visible in the persistent draft footer', () => {
  const button = cancellationButton();
  assert.match(button, />\s*선택 날짜·교시 휴무 취소\s*<\/Button>/);
  assert.doesNotMatch(button, /aria-hidden|hidden=/);
  assert.doesNotMatch(draftFooter(), /<details\b/);
});

test('source contract: the footer cancellation opens confirmation and never submits directly', () => {
  const button = cancellationButton();
  assert.match(button, /onClick=\{\(\) => openConfirmation\('cancel'\)\}/);
  assert.match(button, /type="button"/);
  assert.doesNotMatch(button, /submitAction|onSubmit|type="submit"|form=/);
});

test('source contract: cancellation requires selected dates and periods, not a reason', () => {
  const button = cancellationButton();
  assert.match(
    button,
    /disabled=\{mode !== 'select' \|\| !hasSelection \|\| pending\}/,
  );
  assert.doesNotMatch(button, /canApply|reason\.trim/);
});

test('source contract: history no longer duplicates or owns bulk selected-date cancellation', () => {
  assert.doesNotMatch(
    history,
    /onRequestBulkCancel|hasSelection|선택 날짜·교시 휴무 취소/,
  );
  assert.doesNotMatch(modal, /onRequestBulkCancel=/);
  assert.equal(
    [...modal.matchAll(/openConfirmation\('cancel'\)/g)].length,
    1,
    'the footer should be the single entry point to bulk cancellation confirmation',
  );
});

test('source contract: individual period deletion remains in leave history', () => {
  assert.match(history, /className="attendance-reason__history-list"/);
  assert.match(history, /historyPeriods\.map\(\(entry\) =>/);
  assert.match(
    history,
    /onRequestOccurrence\(\{\s*dateKey: inspectedDate,\s*entryKey: entry\.entryKey,\s*slot: entry\.slot,\s*label: entry\.label,\s*\}\)/,
  );
  assert.match(
    history,
    /pending \|\|\s*leaves\.deletion\.disabled \|\|\s*!entry\.cancellationSource/,
  );
  assert.match(
    modal,
    /onRequestOccurrence=\{\(target\) => \{\s*setOccurrenceTarget\(target\);\s*openConfirmation\('occurrence'\);/,
  );
});

test('source contract: repeating schedule cancellation remains separate in history', () => {
  assert.match(history, /onClick=\{onRequestStopRule\}/);
  assert.match(history, />\s*반복 일정 중단\s*<\/Button>/);
  assert.match(
    modal,
    /onRequestStopRule=\{\(\) => openConfirmation\('cancel-repeat'\)\}/,
  );
  assert.doesNotMatch(cancellationButton(), /cancel-repeat|onRequestStopRule/);
});

test('source contract: the existing confirmation remains the submission boundary', () => {
  assert.match(
    modal,
    /confirmation === 'occurrence'\s*\? confirmOccurrence\(\)\s*: submitAction\(confirmation\)/,
  );
  assert.match(modal, /onClick=\{closeConfirmation\}/);
  assert.match(
    modal,
    /겹치는 다른 휴무, 반복\s*일정과 실제 출석 기록은 유지됩니다\./,
  );
});

test('source contract: the draft footer summary is neutral for applying and cancelling leave', () => {
  assert.match(draftFooter(), /선택 날짜 \$\{dates\.length\}일/);
  assert.doesNotMatch(draftFooter(), /신청 날짜 \$\{dates\.length\}일/);
});
