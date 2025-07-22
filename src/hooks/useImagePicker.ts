import { useState } from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { 
  launchImageLibrary, 
  launchCamera, 
  ImagePickerResponse, 
  MediaType 
} from 'react-native-image-picker';

interface UseImagePickerReturn {
  isImagePickerVisible: boolean;
  showImagePicker: () => void;
  hideImagePicker: () => void;
  pickImageFromLibrary: () => void;
  pickImageFromCamera: () => void;
  pickVideoFromLibrary: () => void;
  pickVideoFromCamera: () => void;
}

interface UseImagePickerProps {
  onImageSelected: (response: ImagePickerResponse) => void;
  onVideoSelected: (response: ImagePickerResponse) => void;
  onError: (error: any, message: string) => void;
}

export const useImagePicker = ({
  onImageSelected,
  onVideoSelected,
  onError,
}: UseImagePickerProps): UseImagePickerReturn => {
  const [isImagePickerVisible, setIsImagePickerVisible] = useState(false);

  // 显示图片选择器
  const showImagePicker = () => {
    setIsImagePickerVisible(true);
  };

  // 隐藏图片选择器
  const hideImagePicker = () => {
    setIsImagePickerVisible(false);
  };

  // 请求相机权限
  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: '相机权限',
            message: '应用需要访问您的相机来拍照',
            buttonNeutral: '稍后询问',
            buttonNegative: '拒绝',
            buttonPositive: '同意',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('请求相机权限失败:', err);
        return false;
      }
    }
    return true;
  };

  // 从相册选择图片
  const pickImageFromLibrary = () => {
    const options = {
      mediaType: 'photo' as MediaType,
      quality: 0.8 as const,
      maxWidth: 1024,
      maxHeight: 1024,
      includeBase64: false,
      selectionLimit: 1,
    };

    launchImageLibrary(options, (response) => {
      hideImagePicker();
      
      if (response.didCancel) {
        console.log('用户取消选择图片');
        return;
      }

      if (response.errorMessage) {
        console.error('选择图片失败:', response.errorMessage);
        onError(new Error(response.errorMessage), '选择图片失败');
        return;
      }

      if (response.assets && response.assets.length > 0) {
        onImageSelected(response);
      }
    });
  };

  // 使用相机拍照
  const pickImageFromCamera = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      hideImagePicker();
      Alert.alert('权限不足', '需要相机权限才能拍照');
      return;
    }

    const options = {
      mediaType: 'photo' as MediaType,
      quality: 0.8 as const,
      maxWidth: 1024,
      maxHeight: 1024,
      includeBase64: false,
      saveToPhotos: false,
    };

    launchCamera(options, (response) => {
      hideImagePicker();
      
      if (response.didCancel) {
        console.log('用户取消拍照');
        return;
      }

      if (response.errorMessage) {
        console.error('拍照失败:', response.errorMessage);
        onError(new Error(response.errorMessage), '拍照失败');
        return;
      }

      if (response.assets && response.assets.length > 0) {
        onImageSelected(response);
      }
    });
  };

  // 从相册选择视频
  const pickVideoFromLibrary = () => {
    const options = {
      mediaType: 'video' as MediaType,
      quality: 0.8 as const,
      videoQuality: 'medium' as const,
      durationLimit: 30, // 30秒限制
      includeBase64: false,
      selectionLimit: 1,
    };

    launchImageLibrary(options, (response) => {
      hideImagePicker();
      
      if (response.didCancel) {
        console.log('用户取消选择视频');
        return;
      }

      if (response.errorMessage) {
        console.error('选择视频失败:', response.errorMessage);
        onError(new Error(response.errorMessage), '选择视频失败');
        return;
      }

      if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        
        // 检查视频大小（限制为500MB）
        if (asset.fileSize && asset.fileSize > 500 * 1024 * 1024) {
          Alert.alert('提示', '视频文件过大，请选择小于500MB的视频');
          return;
        }

        // 检查视频时长（限制为30秒）
        if (asset.duration && asset.duration > 30) {
          Alert.alert('提示', '视频时长过长，请选择30秒以内的视频');
          return;
        }

        onVideoSelected(response);
      }
    });
  };

  // 使用相机录制视频
  const pickVideoFromCamera = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      hideImagePicker();
      Alert.alert('权限不足', '需要相机权限才能录制视频');
      return;
    }

    const options = {
      mediaType: 'video' as MediaType,
      quality: 0.8 as const,
      videoQuality: 'medium' as const,
      durationLimit: 30, // 30秒限制
      includeBase64: false,
      saveToPhotos: false,
    };

    launchCamera(options, (response) => {
      hideImagePicker();
      
      if (response.didCancel) {
        console.log('用户取消录制视频');
        return;
      }

      if (response.errorMessage) {
        console.error('录制视频失败:', response.errorMessage);
        onError(new Error(response.errorMessage), '录制视频失败');
        return;
      }

      if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        
        // 检查视频大小（限制为500MB）
        if (asset.fileSize && asset.fileSize > 500 * 1024 * 1024) {
          Alert.alert('提示', '视频文件过大，请重新录制');
          return;
        }

        onVideoSelected(response);
      }
    });
  };

  return {
    isImagePickerVisible,
    showImagePicker,
    hideImagePicker,
    pickImageFromLibrary,
    pickImageFromCamera,
    pickVideoFromLibrary,
    pickVideoFromCamera,
  };
}; 