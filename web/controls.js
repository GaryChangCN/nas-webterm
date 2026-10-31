/* NAS WebTerm controls. Uses ttyd's existing authenticated xterm input path. */
(function () {
  'use strict';
  if (window.__nasWebTermControls) return;
  window.__nasWebTermControls = true;
  document.documentElement.classList.add('nt-enhanced');

  const state = { connection: 'connecting', term: null, ctrl: false, alt: false, expanded: false, keyboard: false };
  const prefsKey = 'nas-webterm.ui.v1';
  const coarse = () => window.matchMedia('(pointer: coarse)').matches;
  let ui, toastTimer, fitFrame, savedFont, appliedTerm;
  let userRequestedKeyboard = false;
  try {
    const prefs = JSON.parse(localStorage.getItem(prefsKey) || '{}');
    if (Number.isFinite(prefs.fontSize) && prefs.fontSize >= 10 && prefs.fontSize <= 28) savedFont = prefs.fontSize;
  } catch (_) { /* Preferences are optional; no credentials or terminal text are stored. */ }

  // Observe only ttyd's same-origin connection. Do not alter payloads or authentication.
  const OriginalWebSocket = window.WebSocket;
  if (OriginalWebSocket) {
    window.WebSocket = class extends OriginalWebSocket {
      constructor(url, protocols) {
        if (protocols === undefined) super(url); else super(url, protocols);
        const target = new URL(url, window.location.href);
        const list = Array.isArray(protocols) ? protocols : [protocols];
        if (target.host !== window.location.host || !target.pathname.endsWith('/ws') || !list.includes('tty')) return;
        setConnection('connecting');
        this.addEventListener('message', event => {
          const data = event.data;
          const first = typeof data === 'string' ? data.charCodeAt(0) : data instanceof ArrayBuffer ? new Uint8Array(data)[0] : -1;
          if (first === 48 || first === 49 || first === 50) {
            if (state.connection !== 'connected') {
              setConnection('connected');
              setTimeout(attachTerminal, 0);
            }
            // Stock preferences can arrive after the title frame; apply UI font last.
            if (first === 50) setTimeout(attachTerminal, 0);
          }
        });
        this.addEventListener('close', () => setConnection('disconnected'));
        this.addEventListener('error', () => setConnection('disconnected'));
      }
    };
  }

  function node(tag, className, text) {
    const result = document.createElement(tag);
    if (className) result.className = className;
    if (text !== undefined) result.textContent = text;
    return result;
  }
  const icons = {
    terminal: '<path d="m5 7 5 5-5 5m8 0h6"/>',
    paste: '<rect x="7" y="5" width="13" height="16" rx="2"/><path d="M16 5V3H4v14h3"/>',
    copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
    keyboard: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M10 13h.01M14 13h.01M18 13h.01M7 16h10"/>',
    more: '<path d="M5 6h14M5 12h14M5 18h14"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="18" r="2"/>',
    fullscreen: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>'
  };
  function icon(name) {
    const span = node('span', 'nt-icon');
    span.setAttribute('aria-hidden', 'true');
    span.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + icons[name] + '</svg>';
    return span;
  }
  function button(label, className, action, iconName) {
    const b = node('button', className || 'nt-button');
    b.type = 'button';
    b.title = label;
    b.setAttribute('aria-label', label);
    if (iconName) b.append(icon(iconName));
    b.append(node('span', 'nt-button-label', label));
    // Keep the current textarea focus when using helper keys, including on iOS.
    b.addEventListener('pointerdown', event => {
      if (!b.hasAttribute('data-allow-focus')) event.preventDefault();
    });
    b.addEventListener('click', action);
    return b;
  }
  function keyButton(label, key, description, mods) {
    const b = button(label, 'nt-key', () => sendKey(key, mods));
    b.dataset.key = key;
    b.dataset.terminalKey = 'true';
    b.title = description || label;
    b.setAttribute('aria-label', description || label);
    return b;
  }
  function toast(message) {
    if (!ui) return;
    clearTimeout(toastTimer);
    ui.toast.textContent = message;
    ui.toast.hidden = false;
    toastTimer = setTimeout(() => { ui.toast.hidden = true; }, 2800);
  }
  function setConnection(connection) {
    state.connection = connection;
    if (connection !== 'connected') { state.ctrl = false; state.alt = false; }
    renderState();
  }
  function renderState() {
    if (!ui) return;
    ui.status.dataset.state = state.connection;
    ui.statusLabel.textContent = { connecting: '连接中', connected: '已连接', disconnected: '已断开' }[state.connection];
    ui.reconnect.hidden = state.connection !== 'disconnected';
    document.querySelectorAll('[data-terminal-key]').forEach(b => { b.disabled = state.connection !== 'connected'; });
    ui.ctrl.setAttribute('aria-pressed', String(state.ctrl));
    ui.alt.setAttribute('aria-pressed', String(state.alt));
    ui.more.setAttribute('aria-expanded', String(state.expanded || state.ctrl || state.alt));
    ui.extra.hidden = !(state.expanded || state.ctrl || state.alt);
    ui.picker.hidden = !(state.ctrl || state.alt);
    ui.pickerLabel.textContent = '选择 ' + (state.ctrl ? 'Ctrl' : '') + (state.ctrl && state.alt ? ' + ' : '') + (state.alt ? 'Alt' : '') + ' 组合键';
    ui.keyboard.setAttribute('aria-pressed', String(state.keyboard));
    ui.keyboard.title = state.keyboard ? '收起系统键盘' : '打开系统键盘';
    scheduleFit();
  }
  function activeTerm() {
    const term = window.term;
    return term && typeof term.input === 'function' && typeof term.fit === 'function' ? term : null;
  }
  function attachTerminal() {
    const term = activeTerm();
    if (!term) return;
    state.term = term;
    if (appliedTerm !== term || state.connection === 'connected') {
      term.options.fontSize = savedFont || (window.innerWidth <= 640 ? 13 : 15);
      appliedTerm = term;
    }
    if (coarse() && term.textarea && document.activeElement === term.textarea && !userRequestedKeyboard) term.blur();
    scheduleFit();
  }
  function sendKey(key, explicitMods) {
    const term = activeTerm();
    if (!term || state.connection !== 'connected') { toast('连接尚未就绪，请稍后重试'); return; }
    const modifiers = explicitMods || { ctrl: state.ctrl, alt: state.alt };
    const data = window.WebTermKeys.encodeKey(key, term.modes || {}, modifiers);
    term.input(data, true);
    state.ctrl = false;
    state.alt = false;
    renderState();
    if (!coarse()) term.focus();
  }
  function toggleModifier(name) {
    if (state.connection !== 'connected') return;
    state[name] = !state[name];
    renderState();
  }
  function changeFont(delta) {
    const term = activeTerm();
    if (!term) return;
    savedFont = Math.max(10, Math.min(28, Number(term.options.fontSize || 15) + delta));
    term.options.fontSize = savedFont;
    try { localStorage.setItem(prefsKey, JSON.stringify({ fontSize: savedFont })); } catch (_) { /* optional */ }
    scheduleFit();
    toast('终端字号 ' + savedFont + ' px');
  }
  function updateViewport() {
    const view = window.visualViewport;
    const height = view ? view.height : window.innerHeight;
    const top = view ? view.offsetTop : 0;
    document.documentElement.style.setProperty('--nt-app-height', Math.round(height) + 'px');
    document.documentElement.style.setProperty('--nt-app-top', Math.round(top) + 'px');
    if (ui) {
      document.documentElement.style.setProperty('--nt-header-h', ui.header.offsetHeight + 'px');
      document.documentElement.style.setProperty('--nt-dock-h', ui.dock.offsetHeight + 'px');
    }
  }
  function scheduleFit() {
    if (fitFrame) return;
    fitFrame = requestAnimationFrame(() => {
      fitFrame = null;
      updateViewport();
      const term = activeTerm();
      if (term && term.element && term.element.getBoundingClientRect().height > 0) {
        try { term.fit(); } catch (_) { /* terminal may still be mounting */ }
      }
    });
  }
  function toggleKeyboard() {
    const term = activeTerm();
    if (!term) return;
    state.keyboard = !state.keyboard;
    userRequestedKeyboard = state.keyboard;
    if (state.keyboard) term.focus(); else term.blur();
    renderState();
  }
  async function copySelection() {
    const term = activeTerm();
    const text = term && term.getSelection();
    if (!text) { toast('先长按或拖动选中终端文字'); return; }
    try { await navigator.clipboard.writeText(text); toast('已复制选中文字'); }
    catch (_) { toast('请使用浏览器或系统菜单复制选中文字'); }
  }
  function openPaste() {
    if (state.connection !== 'connected') return;
    ui.pasteInput.value = '';
    ui.pasteConfirm.checked = false;
    updatePaste();
    ui.dialog.showModal();
    ui.pasteInput.focus();
  }
  function closePaste() {
    ui.dialog.close();
    ui.pasteInput.value = '';
    if (!coarse()) activeTerm()?.focus();
  }
  function updatePaste() {
    const text = ui.pasteInput.value;
    const risky = /[\r\n\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text);
    ui.pasteWarning.hidden = !risky;
    ui.pasteConfirmRow.hidden = !risky;
    const disabled = !text || (risky && !ui.pasteConfirm.checked);
    ui.pasteSend.disabled = disabled;
    ui.pasteRun.disabled = disabled;
  }
  function pasteText(enter) {
    const term = activeTerm();
    if (!term || state.connection !== 'connected') { toast('连接已断开，文本未发送'); return; }
    const text = ui.pasteInput.value;
    if (!text || (/[\r\n\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text) && !ui.pasteConfirm.checked)) return;
    // xterm.paste respects bracketed paste mode; never turn clipboard text into HTML.
    term.paste(text);
    if (enter) term.input('\r', true);
    closePaste();
    toast(enter ? '文本已发送并回车' : '文本已发送，未额外回车');
  }
  function buildUI() {
    if (document.getElementById('nt-header')) return;
    const header = node('header', 'nt-header'); header.id = 'nt-header';
    const brand = node('div', 'nt-brand');
    const logo = node('span', 'nt-logo'); logo.append(icon('terminal'));
    const brandCopy = node('div', 'nt-brand-copy');
    brandCopy.append(node('strong', '', 'NAS WEBTERM'), node('small', '', 'TERMINAL WORKSPACE'));
    brand.append(logo, brandCopy);
    const status = node('div', 'nt-status'); status.setAttribute('role', 'status');
    status.append(node('span', 'nt-status-dot'));
    const statusLabel = node('span'); statusLabel.id = 'nt-status-label'; status.append(statusLabel);
    const reconnect = button('重新连接', 'nt-button', () => window.location.reload()); reconnect.id = 'nt-reconnect'; reconnect.hidden = true;
    const actions = node('div', 'nt-top-actions');
    const keyboard = button('键盘', 'nt-button nt-icon-button nt-touch-only', toggleKeyboard, 'keyboard');
    keyboard.id = 'nt-keyboard';
    const more = button('更多', 'nt-button nt-icon-button', () => {
      state.expanded = !(state.expanded || state.ctrl || state.alt);
      state.ctrl = false; state.alt = false; renderState();
    }, 'more'); more.id = 'nt-more'; more.setAttribute('aria-controls', 'nt-extra');
    const paste = button('粘贴', 'nt-button nt-icon-button', openPaste, 'paste'); paste.dataset.terminalKey = 'true'; paste.id = 'nt-paste';
    const copy = button('复制', 'nt-button nt-icon-button nt-desktop-only', copySelection, 'copy');
    const fontDown = button('A−', 'nt-button nt-desktop-only', () => changeFont(-1)); fontDown.dataset.font = 'decrease'; fontDown.setAttribute('aria-label', '减小字号');
    const fontUp = button('A+', 'nt-button nt-desktop-only', () => changeFont(1)); fontUp.dataset.font = 'increase'; fontUp.setAttribute('aria-label', '增大字号');
    const fullscreen = button('全屏', 'nt-button nt-icon-button nt-desktop-only', async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
        else toast('当前浏览器不支持全屏');
      } catch (_) { toast('当前浏览器无法进入全屏'); }
    }, 'fullscreen');
    actions.append(fontDown, fontUp, copy, paste, keyboard, more, fullscreen);
    header.append(brand, status, reconnect, actions);

    const dock = node('footer', 'nt-dock'); dock.id = 'nt-dock'; dock.setAttribute('aria-label', '终端辅助键盘');
    const main = node('div', 'nt-dock-main');
    const modifiers = node('div', 'nt-key-group nt-modifiers');
    const ctrl = button('Ctrl', 'nt-key', () => toggleModifier('ctrl')); ctrl.dataset.terminalKey = 'true'; ctrl.id = 'nt-ctrl'; ctrl.setAttribute('aria-controls', 'nt-modifier-picker');
    const alt = button('Alt', 'nt-key', () => toggleModifier('alt')); alt.dataset.terminalKey = 'true'; alt.id = 'nt-alt'; alt.setAttribute('aria-controls', 'nt-modifier-picker');
    modifiers.append(ctrl, alt, keyButton('Esc', 'Escape', 'Escape 键'), keyButton('Tab', 'Tab', 'Tab 补全'), keyButton('⇤ Tab', 'ShiftTab', 'Shift + Tab'));
    const arrows = node('div', 'nt-key-group nt-arrows');
    for (const [label, key, title] of [['←', 'ArrowLeft', '向左'], ['↑', 'ArrowUp', '向上 / 上一条历史'], ['↓', 'ArrowDown', '向下 / 下一条历史'], ['→', 'ArrowRight', '向右']]) arrows.append(keyButton(label, key, title));
    const edit = node('div', 'nt-key-group nt-edit');
    const enter = keyButton('Enter ↵', 'Enter', 'Enter 回车'); enter.classList.add('nt-key-primary');
    edit.append(keyButton('⌫', 'Backspace', 'Backspace 退格'), enter);
    main.append(modifiers, arrows, edit);
    const extra = node('div', 'nt-extra'); extra.id = 'nt-extra'; extra.hidden = true;
    const picker = node('div', 'nt-modifier-picker'); picker.id = 'nt-modifier-picker'; picker.hidden = true;
    const pickerLabel = node('p', 'nt-picker-label');
    const letters = node('div', 'nt-letter-grid');
    for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
      const b = keyButton(letter, letter.toLowerCase(), '组合键 ' + letter); b.classList.add('nt-letter'); letters.append(b);
    }
    picker.append(pickerLabel, letters);
    const shortcuts = node('div', 'nt-shortcuts');
    for (const [letter, title] of [['c', '中断当前命令'], ['d', '发送 EOF / 退出'], ['z', '挂起当前进程'], ['l', '清屏'], ['a', '行首'], ['e', '行尾'], ['u', '删除光标前内容'], ['r', '搜索历史']]) shortcuts.append(keyButton('Ctrl+' + letter.toUpperCase(), letter, title, { ctrl: true }));
    for (const key of ['Home', 'End', 'PageUp', 'PageDown']) shortcuts.append(keyButton(key === 'PageUp' ? 'PgUp' : key === 'PageDown' ? 'PgDn' : key, key));
    for (const [label, delta] of [['A−', -1], ['A+', 1]]) {
      const b = button(label, 'nt-key nt-mobile-only', () => changeFont(delta)); b.dataset.font = delta < 0 ? 'decrease' : 'increase'; shortcuts.append(b);
    }
    extra.append(picker, shortcuts, node('p', 'nt-hint', 'Ctrl / Alt：点选字母或方向键组合 · 断线保留任务请先运行 tmux'));
    dock.append(main, extra);
    const toastNode = node('div', 'nt-toast'); toastNode.id = 'nt-toast'; toastNode.hidden = true; toastNode.setAttribute('role', 'status');

    const dialog = node('dialog', 'nt-dialog'); dialog.id = 'nt-paste-dialog'; dialog.setAttribute('aria-labelledby', 'nt-paste-title');
    const dialogHeader = node('header', 'nt-dialog-header');
    const title = node('h2', '', '粘贴到终端'); title.id = 'nt-paste-title';
    dialogHeader.append(title, button('关闭', 'nt-button nt-icon-button', closePaste, 'close'));
    const description = node('p', 'nt-dialog-description', '先检查内容，再决定是否回车执行。文本只在当前页面处理，不会保存。');
    const pasteInput = node('textarea'); pasteInput.id = 'nt-paste-input'; pasteInput.rows = 5; pasteInput.placeholder = '在这里粘贴命令或文本…'; pasteInput.spellcheck = false;
    pasteInput.setAttribute('aria-label', '待发送文本'); pasteInput.setAttribute('autocapitalize', 'off'); pasteInput.setAttribute('autocorrect', 'off');
    const pasteWarning = node('p', 'nt-warning', '包含换行或控制字符：发送后可能执行多条命令，请确认内容可信。'); pasteWarning.id = 'nt-paste-warning'; pasteWarning.hidden = true;
    const pasteConfirmRow = node('label', 'nt-confirm'); pasteConfirmRow.id = 'nt-paste-confirm-row'; pasteConfirmRow.hidden = true;
    const pasteConfirm = node('input'); pasteConfirm.type = 'checkbox'; pasteConfirm.id = 'nt-paste-confirm';
    pasteConfirmRow.append(pasteConfirm, node('span', '', '我确认发送这些多行或含控制字符的内容'));
    const dialogActions = node('div', 'nt-dialog-actions');
    const readClipboard = button('读取剪贴板', 'nt-button', async () => {
      try { ui.pasteInput.value = await navigator.clipboard.readText(); ui.pasteConfirm.checked = false; updatePaste(); }
      catch (_) { toast('无法读取剪贴板，请在文本框中长按或使用系统粘贴'); ui.pasteInput.focus(); }
    });
    const pasteSend = button('发送文本', 'nt-button', () => pasteText(false)); pasteSend.id = 'nt-paste-send';
    const pasteRun = button('发送并回车', 'nt-button nt-button-primary', () => pasteText(true)); pasteRun.id = 'nt-paste-run';
    dialogActions.append(button('取消', 'nt-button', closePaste), readClipboard, pasteSend, pasteRun);
    dialog.append(dialogHeader, description, pasteInput, pasteWarning, pasteConfirmRow, dialogActions);
    pasteInput.addEventListener('input', () => { pasteConfirm.checked = false; updatePaste(); });
    pasteConfirm.addEventListener('change', updatePaste);
    dialog.addEventListener('close', () => { pasteInput.value = ''; if (!coarse()) activeTerm()?.focus(); });
    ui = { header, dock, status, statusLabel, reconnect, ctrl, alt, more, extra, picker, pickerLabel, keyboard, toast: toastNode, dialog, pasteInput, pasteWarning, pasteConfirmRow, pasteConfirm, pasteSend, pasteRun };
    document.body.append(header, dock, toastNode, dialog);
    new ResizeObserver(scheduleFit).observe(header);
    new ResizeObserver(scheduleFit).observe(dock);
    window.addEventListener('resize', scheduleFit);
    window.visualViewport?.addEventListener('resize', scheduleFit);
    window.visualViewport?.addEventListener('scroll', scheduleFit);
    document.addEventListener('fullscreenchange', scheduleFit);
    document.addEventListener('pointerdown', event => {
      if (event.target.closest && event.target.closest('#terminal-container')) userRequestedKeyboard = true;
    }, true);
    document.addEventListener('focusin', event => {
      if (event.target === activeTerm()?.textarea) { state.keyboard = true; renderState(); }
    });
    document.addEventListener('focusout', event => {
      if (event.target === activeTerm()?.textarea) { state.keyboard = false; renderState(); }
    });
    document.addEventListener('keydown', event => {
      if (dialog.open || event.isComposing || !(state.ctrl || state.alt)) return;
      if (/^[a-zA-Z]$/.test(event.key) && !event.ctrlKey && !event.metaKey) {
        event.preventDefault(); event.stopImmediatePropagation(); sendKey(event.key);
      } else if (event.key === 'Escape') {
        event.preventDefault(); event.stopImmediatePropagation(); state.ctrl = false; state.alt = false; renderState();
      }
    }, true);
    renderState();
    let attempts = 0;
    const timer = setInterval(() => {
      if (activeTerm()) { attachTerminal(); clearInterval(timer); }
      else if (++attempts >= 120) { clearInterval(timer); toast('终端初始化较慢，请检查网络后重新连接'); }
    }, 250);
    attachTerminal();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildUI, { once: true });
  else buildUI();
})();
