module.exports = {
  dependencies: {
    'react-native-permissions': {
      platforms: {
        ios: {
          // 指定正确的podspec路径
          podspecPath: './node_modules/react-native-permissions/ios/RNPermissions.podspec'
        },
      },
    },
  },
}; 