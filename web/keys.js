/* Pure terminal-key encoders. No DOM, credentials, or transport access. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WebTermKeys = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const ESC = '\x1b';
  function controlCharacter(letter) {
    if (letter === ' ' || letter === '@') return '\x00';
    if (letter === '?') return '\x7f';
    if (typeof letter !== 'string' || letter.length !== 1) return null;
    const upper = letter.toUpperCase().charCodeAt(0);
    return upper >= 64 && upper <= 95 ? String.fromCharCode(upper & 31) : null;
  }
  function encodeKey(key, modes = {}, modifiers = {}) {
    const ctrl = !!modifiers.ctrl;
    const alt = !!modifiers.alt;
    const modifier = 1 + (alt ? 2 : 0) + (ctrl ? 4 : 0);
    const cursor = { ArrowUp: 'A', ArrowDown: 'B', ArrowRight: 'C', ArrowLeft: 'D', Home: 'H', End: 'F' };
    if (cursor[key]) {
      if (modifier > 1) return ESC + '[1;' + modifier + cursor[key];
      return ESC + (modes.applicationCursorKeysMode ? 'O' : '[') + cursor[key];
    }
    const tilde = { PageUp: 5, PageDown: 6, Delete: 3, Insert: 2 };
    if (tilde[key]) return ESC + '[' + tilde[key] + (modifier > 1 ? ';' + modifier : '') + '~';
    const plain = { Tab: '\t', ShiftTab: ESC + '[Z', Enter: '\r', Escape: ESC, Backspace: '\x7f', Space: ' ' };
    let value = Object.prototype.hasOwnProperty.call(plain, key) ? plain[key] : key;
    if (ctrl && value.length === 1) {
      const mapped = controlCharacter(value);
      if (mapped !== null) value = mapped;
    }
    return alt && key !== 'Escape' ? ESC + value : value;
  }
  return Object.freeze({ encodeKey, controlCharacter });
});
