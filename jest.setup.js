// Mock AsyncStorage for Jest environment
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// Mock React Native Alert to avoid native calls in tests
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// Basic mocks for React Native native modules which might be referenced
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Platform: { OS: 'ios', select: (obj) => obj.ios },
    StatusBar: RN.View,
  };
});


