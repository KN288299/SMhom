const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');
const exclusionList = require('metro-config/src/defaults/exclusionList');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const defaults = getDefaultConfig(__dirname);

const config = {
  // 减少 CI 资源占用
  maxWorkers: 2,
  resolver: {
    // 合并默认的 assetExts，确保包含字体文件
    assetExts: [...defaults.resolver.assetExts, 'ttf', 'otf', 'woff', 'woff2'],
    // 排除超大/不需要被打包监视的目录，避免打包脚本超时或内存占用过高
    blockList: exclusionList([
      /\buploads\/.*/, // 根目录 uploads
      /\bsrc\/uploads\/.*/, // src/uploads（如果存在）
      /\bandroid\/app\/build\/.*/,
      /\bios\/build\/.*/,
    ]),
  },
  transformer: {
    // 启用Hermes引擎的优化
    hermes: {
      emit: 'bytecode',
    },
    // 减少Bundle大小和警告
    minifierConfig: {
      keep_fnames: true,
      mangle: {
        keep_fnames: true,
      },
    },
  },
};

module.exports = mergeConfig(defaults, config);
