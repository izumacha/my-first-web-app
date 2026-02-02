// Jest テストセットアップ (CommonJS)

// LocalStorage モック
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    })
  };
})();

// グローバル環境のセットアップ
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
  });

  // alert モック
  window.alert = jest.fn();

  // confirm モック
  window.confirm = jest.fn(() => true);
}

// Node.js環境でもlocalStorageをモック
if (typeof global !== 'undefined' && typeof global.localStorage === 'undefined') {
  global.localStorage = localStorageMock;
}

// fetch モック
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({})
  })
);

// navigator.onLine モック
if (typeof global.navigator === 'undefined') {
  global.navigator = {};
}
global.navigator.onLine = true;

// 環境変数のデフォルト
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-encryption-key-for-jest-testing-only-32ch';

// テスト前にストレージをクリア
beforeEach(() => {
  localStorageMock.clear();
  jest.clearAllMocks();
});
