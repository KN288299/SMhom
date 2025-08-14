// Mock AsyncStorage for Jest environment
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock React Native Alert to avoid native calls in tests
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// Mock NativeEventEmitter to avoid requiring addListener/removeListeners on native modules
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => {
  return jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
    removeSubscription: jest.fn(),
  }));
});

// Mock NativeSettingsManager which is accessed via TurboModuleRegistry
jest.mock('react-native/Libraries/Settings/NativeSettingsManager', () => ({
  getConstants: () => ({
    AppleInterfaceStyle: 'Light',
    settings: {},
    isHDRSupported: false,
  }),
}));

// Basic mocks for React Native native modules which might be referenced
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Platform: { OS: 'ios', select: (obj) => obj.ios },
    StatusBar: RN.View,
    NativeModules: {
      ...RN.NativeModules,
      SettingsManager: {
        getConstants: () => ({ AppleInterfaceStyle: 'Light', settings: {} }),
      },
      DevSettings: {
        addListener: jest.fn(),
        removeListeners: jest.fn(),
      },
    },
  };
});


