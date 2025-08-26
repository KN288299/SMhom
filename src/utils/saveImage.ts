import { Platform, PermissionsAndroid } from 'react-native';
import RNFS from 'react-native-fs';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const isHttpUrl = (uri: string) => /^https?:\/\//i.test(uri);

export const saveImageToGallery = async (imageUri: string): Promise<string> => {
  if (!imageUri) {
    throw new Error('无效的图片地址');
  }

  // 请求必要权限（尽量宽松处理，失败时由 save 抛错）
  try {
    if (Platform.OS === 'ios') {
      const perm = (PERMISSIONS.IOS as any).PHOTO_LIBRARY_ADD_ONLY || PERMISSIONS.IOS.PHOTO_LIBRARY;
      let status = await check(perm);
      if (status !== RESULTS.GRANTED) {
        status = await request(perm);
      }
      if (status !== RESULTS.GRANTED) {
        throw new Error('没有相册写入权限');
      }
    } else if (Platform.OS === 'android') {
      const sdk = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
      if (sdk >= 33) {
        // Android 13+ 可读媒体权限（保存通常不强制，但申请更稳妥）
        await request(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES);
      } else {
        // 旧版本需要写权限
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
      }
    }
  } catch (e) {
    // 忽略权限检查异常，交由 CameraRoll.save 再次验证
  }

  let localPath = imageUri;

  // 如为远程URL，先下载到本地缓存/临时目录
  if (isHttpUrl(imageUri)) {
    const cleanUrl = imageUri.split('?')[0];
    const match = cleanUrl.match(/\.([a-zA-Z0-9]+)$/);
    const ext = match ? match[1] : 'jpg';
    const fileName = `img_${Date.now()}.${ext}`;
    const baseDir = Platform.OS === 'ios' ? RNFS.TemporaryDirectoryPath : RNFS.CachesDirectoryPath;
    const sep = baseDir.endsWith('/') ? '' : '/';
    const destPath = `${baseDir}${sep}${fileName}`;
    const { promise } = RNFS.downloadFile({ fromUrl: imageUri, toFile: destPath });
    await promise;
    localPath = destPath;
  }

  // CameraRoll 需要 file:// 前缀
  const uriToSave = localPath.startsWith('file://') ? localPath : `file://${localPath}`;
  const savedUri = await CameraRoll.save(uriToSave, { type: 'photo', album: 'HomeSM' });
  return savedUri;
};


