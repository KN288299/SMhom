import { Platform } from 'react-native';
import RNFS from 'react-native-fs';

const NORMALIZED_DIR = `${RNFS.CachesDirectoryPath}/normalized_local_v1`;

const ensureDir = async (): Promise<void> => {
  try {
    const exists = await RNFS.exists(NORMALIZED_DIR);
    if (!exists) {
      await RNFS.mkdir(NORMALIZED_DIR);
    }
  } catch {
    // 忽略目录创建异常
  }
};

const fnv1a32 = (input: string): string => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return ('0000000' + hash.toString(16)).slice(-8);
};

const isLocalUri = (uri: string): boolean => {
  return !!uri && (
    uri.startsWith('file://') ||
    uri.startsWith('ph://') ||
    uri.startsWith('assets-library://') ||
    uri.startsWith('content://')
  );
};

export const normalizeLocalUri = async (uri: string): Promise<string> => {
  try {
    if (!uri || !isLocalUri(uri)) return uri;

    if (Platform.OS === 'ios') {
      // iOS：将相册/资源库URI拷贝成本地可访问的 file:// 路径
      if (uri.startsWith('file://')) return uri;
      if (uri.startsWith('ph://') || uri.startsWith('assets-library://')) {
        await ensureDir();
        const fileName = `ios_${fnv1a32(uri)}.mp4`;
        const destPath = `${NORMALIZED_DIR}/${fileName}`;
        const exists = await RNFS.exists(destPath);
        if (!exists) {
          try {
            const rnfsAny = RNFS as any;
            if (typeof rnfsAny.copyAssetsVideoIOS === 'function') {
              await rnfsAny.copyAssetsVideoIOS(uri, destPath);
            } else if (typeof rnfsAny.copyAssetsFileIOS === 'function') {
              // 退化方案：用图片接口复制，参数为占位，可能失败
              await rnfsAny.copyAssetsFileIOS(uri, destPath, 0, 0, 1.0, 1.0, 'contain');
            }
          } catch {
            // 忽略复制失败
          }
        }

        const finalExists = await RNFS.exists(destPath);
        if (finalExists) {
          return `file://${destPath}`;
        }
        // 复制失败则回退原始URI
        return uri;
      }
      // 其他本地形式直接返回
      return uri;
    }

    // Android：content:// 可被大多数组件直接识别，保持原样
    return uri;
  } catch {
    return uri;
  }
};

export default normalizeLocalUri;


