import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const homeRoot = new URL('../../src/app/screens/member/home/', import.meta.url);

function source(path) {
  return readFileSync(new URL(path, homeRoot), 'utf8');
}

function component(name) {
  return ts.createSourceFile(
    `${name}.tsx`,
    source(`components/${name}.tsx`),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
}

function findAll(root, predicate) {
  const matches = [];
  function visit(node) {
    if (predicate(node)) matches.push(node);
    ts.forEachChild(node, visit);
  }
  visit(root);
  return matches;
}

function jsxTags(root) {
  return findAll(
    root,
    (node) => ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node),
  );
}

function tagged(root, name) {
  const matches = jsxTags(root).filter(
    (node) => node.tagName.getText() === name,
  );
  assert.equal(
    matches.length,
    1,
    `${name} must have exactly one rendered instance`,
  );
  return matches[0];
}

function attribute(node, name) {
  const match = node.attributes.properties.find(
    (prop) => ts.isJsxAttribute(prop) && prop.name.getText() === name,
  );
  assert.ok(match?.initializer, `${node.tagName.getText()} needs ${name}`);
  return match.initializer;
}

function expressionText(node) {
  return (ts.isJsxExpression(node) ? node.expression : node)
    .getText()
    .replace(/\s+/g, '');
}

function assertProps(node, expected) {
  for (const [name, value] of Object.entries(expected)) {
    assert.equal(expressionText(attribute(node, name)), value, name);
  }
}

function classElement(root, className) {
  const matches = jsxTags(root).filter((node) =>
    node.attributes.properties.some(
      (prop) =>
        ts.isJsxAttribute(prop) &&
        prop.name.getText() === 'className' &&
        prop.initializer &&
        ts.isStringLiteral(prop.initializer) &&
        prop.initializer.text === className,
    ),
  );
  assert.equal(matches.length, 1, className);
  return matches[0].parent;
}

function parentExpression(node) {
  let parent = node.parent;
  while (parent && !ts.isJsxExpression(parent)) parent = parent.parent;
  assert.ok(parent, 'Expected a JSX conditional expression');
  return expressionText(parent);
}

// These styles have one desktop media query. Keep its declarations separate
// from base rules so a desktop fix cannot silently become a mobile override.
function styles(path) {
  const css = source(path).replace(/\/\*[\s\S]*?\*\//g, '');
  const media = css.indexOf('@media');
  assert.ok(media >= 0, `${path} needs a desktop media query`);
  assert.match(css.slice(media), /^@media\s*\(min-width:\s*1024px\)/);
  assert.equal(css.indexOf('@media', media + 1), -1);
  return { base: css.slice(0, media), desktop: css.slice(media) };
}

function declarations(css, selector) {
  const result = {};
  for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!selectors.split(',').some((value) => value.trim() === selector))
      continue;
    for (const declaration of body.split(';')) {
      const colon = declaration.indexOf(':');
      if (colon < 0) continue;
      result[declaration.slice(0, colon).trim()] = declaration
        .slice(colon + 1)
        .trim();
    }
  }
  return result;
}

const layout = component('MemberHomeLayout');
const presence = component('HomePresence');
const screen = ts.createSourceFile(
  'MemberHomeScreen.tsx',
  source('MemberHomeScreen.tsx'),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

test('layout keeps one presentation-only mobile-first tree and one copy of each slot', () => {
  const slots = findAll(layout, ts.isJsxExpression)
    .filter((node) => node.expression && ts.isIdentifier(node.expression))
    .map((node) => node.expression.text);
  assert.deepEqual(slots, ['presence', 'study', 'shortcuts', 'children']);
  assert.equal(findAll(layout, ts.isCallExpression).length, 0);

  const body = classElement(layout, 'member-home__body');
  assert.deepEqual(
    jsxTags(body).map((node) => attribute(node, 'className').text),
    [
      'member-home__body',
      'member-home__overview',
      'member-home__study-panel',
      'member-home__content',
    ],
  );
  assert.equal(
    jsxTags(layout).some((node) => node.tagName.getText() === 'HomePresence'),
    false,
  );
});

test('screen mounts presence, QR, study, break controls, shortcuts and plans once', () => {
  for (const name of [
    'MemberHomeLayout',
    'HomePresence',
    'HomeQrPresence',
    'HomeHero',
    'HomeBreakStudy',
    'HomeQuickNav',
    'HomeTodayPlan',
    'HomeWeekSummary',
  ])
    tagged(screen, name);

  const dashboard = tagged(screen, 'MemberHomeLayout');
  const namesInSlot = (name) =>
    jsxTags(attribute(dashboard, name)).map((node) => node.tagName.getText());
  assert.deepEqual(namesInSlot('presence'), ['HomePresence', 'HomeQrPresence']);
  assert.deepEqual(namesInSlot('study'), ['HomeHero', 'HomeBreakStudy']);
  assert.deepEqual(namesInSlot('shortcuts'), ['HomeQuickNav']);
  assert.deepEqual(
    dashboard.parent.children
      .filter(ts.isJsxSelfClosingElement)
      .map((node) => node.tagName.getText()),
    ['HomeTodayPlan', 'HomeWeekSummary'],
  );
});

test('extracted presence and QR retain their original owner-bound data and callbacks', () => {
  assertProps(tagged(screen, 'HomePresence'), {
    checkedIn: 'home.presence.checkedIn',
    checkedInAt: 'home.presence.checkedInAt',
    dateKey: 'home.today.dateKey',
    onPresenceRetry: 'home.presence.onRetry',
    presenceError: 'home.presence.errorMessage',
    presenceLoading: 'home.presence.loading',
  });
  assertProps(tagged(screen, 'HomeQrPresence'), {
    action: 'home.attendance.action',
    errorMessage: 'home.attendance.errorMessage',
    loading: 'home.attendance.loading',
    onReset: 'home.attendance.onReset',
    onSubmit: 'home.attendance.onSubmit',
  });
  const ownerHook = findAll(
    screen,
    (node) =>
      ts.isCallExpression(node) &&
      node.expression.getText() === 'useMemberHome',
  );
  assert.equal(ownerHook.length, 1);
  assert.deepEqual(ownerHook[0].arguments.map(expressionText), [
    'memberId',
    'branchId',
    'queryOwnerKey',
  ]);
});

test('presence keeps loading/error retry, QR guards, timestamp and live elapsed time', () => {
  const liveClock = findAll(
    presence,
    (node) =>
      ts.isCallExpression(node) &&
      node.expression.getText() === 'useLiveElapsedSeconds',
  );
  assert.equal(liveClock.length, 1);
  assert.equal(
    expressionText(liveClock[0].arguments[0]),
    'checkedIn?checkedInAt:null',
  );
  assert.match(
    parentExpression(tagged(presence, 'HomeSectionLoading')),
    /^presenceLoading\?/,
  );
  assertProps(tagged(presence, 'HomeSectionError'), {
    message: 'presenceError',
    onRetry: 'onPresenceRetry',
  });
  assert.match(
    parentExpression(classElement(presence, 'member-home__presence-action')),
    /^!presenceLoading&&presenceError===null&&/,
  );
  const elapsed = classElement(presence, 'member-home__presence-elapsed');
  assert.match(
    parentExpression(elapsed),
    /^!presenceLoading&&presenceError===null&&checkedIn&&\(checkedInTime!==null\|\|elapsedSeconds!==null\)&&/,
  );
  assert.match(elapsed.getText(), /checkedInTime.*입실/);
  assert.match(
    elapsed.getText(),
    /입실 후 경과 \{formatDurationClock\(elapsedSeconds\)\}/,
  );
});

test('study summary and break controls receive unchanged values and action callbacks', () => {
  assertProps(tagged(screen, 'HomeHero'), {
    asOf: 'home.studyTime.asOf',
    dayBlocks: 'home.studyTime.dayBlocks',
    memberName: 'memberName',
    onStudyTimeRetry: 'home.studyTime.onRetry',
    recognizedSeconds: 'home.studyTime.recognizedSeconds',
    recognizedPeriodSeconds: 'home.studyTime.recognizedPeriodSeconds',
    recognizedBreakSeconds: 'home.studyTime.recognizedBreakSeconds',
    studyTimeError: 'home.studyTime.errorMessage',
    studyTimeLoading: 'home.studyTime.loading',
  });
  assertProps(tagged(screen, 'HomeBreakStudy'), {
    actionError: 'home.breakStudy.actionError',
    actionLoading: 'home.breakStudy.actionLoading',
    checkedIn: 'home.presence.checkedIn',
    errorMessage: 'home.breakStudy.errorMessage',
    loading: 'home.breakStudy.loading',
    onRetry: 'home.breakStudy.onRetry',
    onStart: 'home.breakStudy.onStart',
    onStop: 'home.breakStudy.onStop',
    status: 'home.breakStudy.status',
  });
  assert.equal(
    jsxTags(component('HomeHero')).some((node) =>
      ['HomePresence', 'HomeQrPresence'].includes(node.tagName.getText()),
    ),
    false,
  );
});

test('desktop alone places plans left and the independent study/shortcut rail right', () => {
  const { base, desktop } = styles('styles/MemberHomeScreen.css');
  assert.equal(declarations(base, '.member-home').gap, '12px');
  assert.equal(declarations(base, '.member-home__body').gap, '16px');
  assert.equal(declarations(base, '.member-home__study-panel').gap, '12px');
  for (const selector of [
    '.member-home__body',
    '.member-home__overview',
    '.member-home__content',
  ]) {
    const mobile = declarations(base, selector);
    assert.equal(mobile['grid-template-areas'], undefined);
    assert.equal(mobile['grid-template-columns'], undefined);
    assert.equal(mobile['grid-area'], undefined);
  }
  assert.equal(declarations(desktop, '.member-home')['max-width'], '1100px');
  assert.equal(declarations(desktop, '.member-home')['margin-inline'], 'auto');
  assert.equal(
    declarations(desktop, '.member-home__body')['grid-template-areas'],
    "'plans overview'",
  );
  assert.equal(
    declarations(desktop, '.member-home__body')['grid-template-columns'],
    'minmax(0, 1fr) 350px',
  );
  assert.equal(
    declarations(desktop, '.member-home__overview')['grid-area'],
    'overview',
  );
  assert.equal(
    declarations(desktop, '.member-home__content')['grid-area'],
    'plans',
  );
  assert.doesNotMatch(base + desktop, /display:\s*contents/);
});

test('presence desktop alignment does not replace the existing compact mobile strip', () => {
  const { base, desktop } = styles('styles/HomePresence.css');
  assert.equal(
    declarations(base, '.member-home__presence-bar')['min-height'],
    '70px',
  );
  assert.equal(
    declarations(base, '.member-home__presence-bar')['grid-template-columns'],
    'minmax(0, 1fr) auto',
  );
  assert.equal(
    declarations(base, '.member-home__presence-copy').display,
    'grid',
  );
  assert.equal(
    declarations(base, '.member-home__presence-elapsed')['grid-column'],
    '1 / -1',
  );
  assert.equal(
    declarations(desktop, '.member-home__presence-copy').display,
    'flex',
  );
  assert.equal(
    declarations(desktop, '.member-home__presence-action')['grid-column'],
    '2',
  );
  assert.equal(
    declarations(desktop, '.member-home__presence-elapsed')['grid-column'],
    '1',
  );
});
