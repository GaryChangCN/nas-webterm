const test = require('node:test');
const assert = require('node:assert/strict');
const { encodeKey, controlCharacter } = require('../web/keys.js');

test('normal and application cursor keys use the correct escape sequences', () => {
  for (const [key, suffix] of [['ArrowUp', 'A'], ['ArrowDown', 'B'], ['ArrowRight', 'C'], ['ArrowLeft', 'D'], ['Home', 'H'], ['End', 'F']]) {
    assert.equal(encodeKey(key), '\x1b[' + suffix);
    assert.equal(encodeKey(key, { applicationCursorKeysMode: true }), '\x1bO' + suffix);
    assert.equal(encodeKey(key, {}, { ctrl: true }), '\x1b[1;5' + suffix);
    assert.equal(encodeKey(key, {}, { alt: true }), '\x1b[1;3' + suffix);
    assert.equal(encodeKey(key, {}, { ctrl: true, alt: true }), '\x1b[1;7' + suffix);
  }
});
test('basic keys and navigation match terminal conventions', () => {
  for (const [key, expected] of [['Tab', '\t'], ['ShiftTab', '\x1b[Z'], ['Escape', '\x1b'], ['Enter', '\r'], ['Backspace', '\x7f'], ['Space', ' '], ['Delete', '\x1b[3~'], ['PageUp', '\x1b[5~'], ['PageDown', '\x1b[6~']]) assert.equal(encodeKey(key), expected);
  assert.equal(encodeKey('PageUp', {}, { ctrl: true }), '\x1b[5;5~');
});
test('Ctrl letters, punctuation, EOF and interrupt are real control characters', () => {
  for (let n = 0; n < 26; n++) {
    assert.equal(controlCharacter(String.fromCharCode(97 + n)), String.fromCharCode(n + 1));
    assert.equal(controlCharacter(String.fromCharCode(65 + n)), String.fromCharCode(n + 1));
  }
  assert.equal(encodeKey('c', {}, { ctrl: true }), '\x03');
  assert.equal(encodeKey('d', {}, { ctrl: true }), '\x04');
  assert.equal(encodeKey('z', {}, { ctrl: true }), '\x1a');
  assert.equal(controlCharacter('['), '\x1b');
  assert.equal(controlCharacter(' '), '\x00');
  assert.equal(controlCharacter('?'), '\x7f');
  assert.equal(controlCharacter('中'), null);
  assert.equal(controlCharacter('ab'), null);
});
test('Alt prefixes ESC once and modifiers do not corrupt ordinary Unicode', () => {
  assert.equal(encodeKey('b', {}, { alt: true }), '\x1bb');
  assert.equal(encodeKey('c', {}, { alt: true, ctrl: true }), '\x1b\x03');
  assert.equal(encodeKey('中'), '中');
  assert.equal(encodeKey('Escape', {}, { alt: true }), '\x1b');
});
