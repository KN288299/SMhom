module.exports = {
  dependencies: {
    'react-native-vector-icons': {
      platforms: {
        ios: {
          sourceDir: '../node_modules/react-native-vector-icons/ios',
          project: 'RNVectorIcons.xcodeproj',
        },
      },
    },
  },
  assets: ['./assets/fonts/', './node_modules/react-native-vector-icons/Fonts/'],
};
