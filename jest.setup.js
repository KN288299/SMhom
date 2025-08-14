// Mock AsyncStorage for Jest environment
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock React Native Alert to avoid native calls in tests
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// Mock NetInfo to prevent NativeModule errors in Jest
jest.mock('@react-native-community/netinfo', () => {
  const listeners = new Set();
  return {
    addEventListener: (handler) => {
      listeners.add(handler);
      // Immediately call with connected state for tests
      handler({ type: 'wifi', isConnected: true, isInternetReachable: true });
      return () => listeners.delete(handler);
    },
    fetch: jest.fn().mockResolvedValue({ type: 'wifi', isConnected: true, isInternetReachable: true }),
    useNetInfo: jest.fn(() => ({ type: 'wifi', isConnected: true, isInternetReachable: true })),
  };
});

// Mock react-native-image-picker
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn().mockResolvedValue({ didCancel: true }),
  launchImageLibrary: jest.fn().mockResolvedValue({ didCancel: true }),
}));

// Mock react-native-permissions
jest.mock('react-native-permissions', () => ({
  check: jest.fn().mockResolvedValue('granted'),
  request: jest.fn().mockResolvedValue('granted'),
  RESULTS: { GRANTED: 'granted' },
  PERMISSIONS: {},
}));

// Mock react-native-video
jest.mock('react-native-video', () => {
  const React = require('react');
  return React.forwardRef(() => null);
});

// Mock react-native-fs
jest.mock('react-native-fs', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

// Mock react-native-create-thumbnail
jest.mock('react-native-create-thumbnail', () => ({
  createThumbnail: jest.fn().mockResolvedValue({ path: 'thumb.jpg' }),
}));

// Mock react-native-webrtc
jest.mock('react-native-webrtc', () => ({
  mediaDevices: { getUserMedia: jest.fn() },
}));

// Mock react-native-audio-recorder-player
jest.mock('react-native-audio-recorder-player', () => {
  return function MockAudioRecorderPlayer() {
    return {
      startRecorder: jest.fn().mockResolvedValue('mockPath'),
      stopRecorder: jest.fn().mockResolvedValue('mockPath'),
      addRecordBackListener: jest.fn(() => () => {}),
      removeRecordBackListener: jest.fn(),
      startPlayer: jest.fn().mockResolvedValue('mockPath'),
      stopPlayer: jest.fn().mockResolvedValue('mockPath'),
      addPlayBackListener: jest.fn(() => () => {}),
      removePlayBackListener: jest.fn(),
    };
  };
});

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({ on: jest.fn(), emit: jest.fn(), off: jest.fn(), disconnect: jest.fn() })),
}));

// Mock react-native-webview
jest.mock('react-native-webview', () => {
  const React = require('react');
  const MockWebView = (props) => React.createElement('WebView', props, props.children);
  return { WebView: MockWebView, default: MockWebView };
});

// Mock @react-native-community/geolocation
jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn((success) =>
    success({ coords: { latitude: 0, longitude: 0, accuracy: 1 }, timestamp: Date.now() })
  ),
  watchPosition: jest.fn((success) => {
    const id = Math.floor(Math.random() * 1000);
    success({ coords: { latitude: 0, longitude: 0, accuracy: 1 }, timestamp: Date.now() });
    return id;
  }),
  clearWatch: jest.fn(),
  stopObserving: jest.fn(),
}));

// Mock react-native-incall-manager to avoid ESM parsing and native calls
jest.mock('react-native-incall-manager', () => ({
  start: jest.fn(),
  stop: jest.fn(),
  setSpeakerphoneOn: jest.fn(),
  setForceSpeakerphoneOn: jest.fn(),
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


