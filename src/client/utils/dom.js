/**
 * DOM操作ユーティリティ - XSS対策を含む安全なDOM操作
 */

/**
 * HTML特殊文字をエスケープ
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const str = String(text);
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * 安全にテキストコンテンツを設定
 * @param {Element} element
 * @param {string} text
 */
export function setText(element, text) {
  if (element) {
    element.textContent = text ?? '';
  }
}

/**
 * 安全にHTML要素を作成
 * @param {string} tag
 * @param {Object} attributes
 * @param {string|Element|Element[]} children
 * @returns {HTMLElement}
 */
export function createElement(tag, attributes = {}, children = null) {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'dataset') {
      for (const [dataKey, dataValue] of Object.entries(value)) {
        element.dataset[dataKey] = dataValue;
      }
    } else if (key.startsWith('on') && typeof value === 'function') {
      const eventName = key.slice(2).toLowerCase();
      element.addEventListener(eventName, value);
    } else if (value !== null && value !== undefined) {
      element.setAttribute(key, value);
    }
  }

  if (children !== null) {
    if (typeof children === 'string') {
      element.textContent = children;
    } else if (Array.isArray(children)) {
      for (const child of children) {
        if (child instanceof Element) {
          element.appendChild(child);
        } else if (typeof child === 'string') {
          element.appendChild(document.createTextNode(child));
        }
      }
    } else if (children instanceof Element) {
      element.appendChild(children);
    }
  }

  return element;
}

/**
 * 要素をクリアして新しい子要素を設定
 * @param {Element} parent
 * @param {Element|Element[]} children
 */
export function replaceChildren(parent, children) {
  if (!parent) return;

  // 既存の子要素を削除
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }

  // 新しい子要素を追加
  if (Array.isArray(children)) {
    for (const child of children) {
      if (child instanceof Element) {
        parent.appendChild(child);
      }
    }
  } else if (children instanceof Element) {
    parent.appendChild(children);
  }
}

/**
 * 要素を取得（型安全）
 * @param {string} selector
 * @returns {HTMLElement|null}
 */
export function $(selector) {
  return document.querySelector(selector);
}

/**
 * 複数要素を取得
 * @param {string} selector
 * @returns {NodeListOf<HTMLElement>}
 */
export function $$(selector) {
  return document.querySelectorAll(selector);
}

/**
 * IDで要素を取得
 * @param {string} id
 * @returns {HTMLElement|null}
 */
export function byId(id) {
  return document.getElementById(id);
}

/**
 * クラスの追加・削除をトグル
 * @param {Element} element
 * @param {string} className
 * @param {boolean} [force]
 */
export function toggleClass(element, className, force) {
  if (element) {
    element.classList.toggle(className, force);
  }
}

/**
 * 要素の表示/非表示
 * @param {Element} element
 * @param {boolean} visible
 */
export function setVisible(element, visible) {
  if (element) {
    element.style.display = visible ? '' : 'none';
  }
}

/**
 * フォームの値を取得
 * @param {HTMLFormElement} form
 * @returns {Object}
 */
export function getFormData(form) {
  const formData = new FormData(form);
  const data = {};

  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }

  return data;
}

/**
 * フォームをリセット
 * @param {HTMLFormElement} form
 */
export function resetForm(form) {
  if (form) {
    form.reset();
  }
}

/**
 * イベントリスナーを安全に追加
 * @param {Element|string} elementOrSelector
 * @param {string} event
 * @param {Function} handler
 * @param {Object} options
 * @returns {Function} リムーバー関数
 */
export function on(elementOrSelector, event, handler, options = {}) {
  const element = typeof elementOrSelector === 'string'
    ? $(elementOrSelector)
    : elementOrSelector;

  if (!element) return () => {};

  element.addEventListener(event, handler, options);

  return () => element.removeEventListener(event, handler, options);
}

/**
 * デリゲートイベントリスナー
 * @param {Element|string} parentOrSelector
 * @param {string} event
 * @param {string} childSelector
 * @param {Function} handler
 */
export function delegate(parentOrSelector, event, childSelector, handler) {
  const parent = typeof parentOrSelector === 'string'
    ? $(parentOrSelector)
    : parentOrSelector;

  if (!parent) return () => {};

  const delegatedHandler = (e) => {
    const target = e.target.closest(childSelector);
    if (target && parent.contains(target)) {
      handler.call(target, e, target);
    }
  };

  parent.addEventListener(event, delegatedHandler);

  return () => parent.removeEventListener(event, delegatedHandler);
}

/**
 * DOMContentLoaded を待つ
 * @param {Function} callback
 */
export function ready(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback);
  } else {
    callback();
  }
}

/**
 * 要素をスムーズにスクロール
 * @param {Element|string} elementOrSelector
 * @param {Object} options
 */
export function scrollTo(elementOrSelector, options = { behavior: 'smooth', block: 'start' }) {
  const element = typeof elementOrSelector === 'string'
    ? $(elementOrSelector)
    : elementOrSelector;

  if (element) {
    element.scrollIntoView(options);
  }
}

/**
 * トースト通知を表示
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} duration
 */
export function showToast(message, type = 'info', duration = 3000) {
  const toast = createElement('div', {
    className: `toast toast-${type}`,
    role: 'alert'
  }, message);

  // スタイルを追加
  Object.assign(toast.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 24px',
    borderRadius: '8px',
    backgroundColor: type === 'success' ? '#10B981'
      : type === 'error' ? '#EF4444'
      : type === 'warning' ? '#F59E0B'
      : '#3B82F6',
    color: 'white',
    fontWeight: '500',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    zIndex: '10000',
    opacity: '0',
    transform: 'translateX(100%)',
    transition: 'all 0.3s ease'
  });

  document.body.appendChild(toast);

  // アニメーション
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  });

  // 自動削除
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * 確認ダイアログを表示（Promiseベース）
 * @param {string} message
 * @returns {Promise<boolean>}
 */
export function confirm(message) {
  return new Promise((resolve) => {
    resolve(window.confirm(message));
  });
}

/**
 * モーダルを表示
 * @param {string} modalId
 */
export function showModal(modalId) {
  const modal = byId(modalId);
  if (modal) {
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
  }
}

/**
 * モーダルを非表示
 * @param {string} modalId
 */
export function hideModal(modalId) {
  const modal = byId(modalId);
  if (modal) {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }
}
