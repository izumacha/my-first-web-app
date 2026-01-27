// Jest テストセットアップ

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

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

// alert モック
window.alert = jest.fn();

// confirm モック
window.confirm = jest.fn(() => true);

// fetch モック
global.fetch = jest.fn();

// テスト前にストレージをクリア
beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
});
