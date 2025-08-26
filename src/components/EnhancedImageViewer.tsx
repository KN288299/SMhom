import React, { useState } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Alert,
  Platform,
  ToastAndroid,
  StatusBar,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface EnhancedImageViewerProps {
  visible: boolean;
  imageUrl: string;
  onClose: () => void;
}

const EnhancedImageViewer: React.FC<EnhancedImageViewerProps> = ({
  visible,
  imageUrl,
  onClose,
}) => {
  const [imageSize, setImageSize] = useState({ width: screenWidth, height: screenHeight });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 获取图片尺寸
  const getImageSize = (url: string) => {
    if (!url) return;
    
    setLoading(true);
    Image.getSize(
      url,
      (width, height) => {
        // 计算适合屏幕的尺寸，保持宽高比
        const aspectRatio = width / height;
        let newWidth = screenWidth;
        let newHeight = screenWidth / aspectRatio;
        
        if (newHeight > screenHeight - 100) {
          newHeight = screenHeight - 100;
          newWidth = newHeight * aspectRatio;
        }
        
        setImageSize({ width: newWidth, height: newHeight });
        setLoading(false);
      },
      (error) => {
        console.error('获取图片尺寸失败:', error);
        setImageSize({ width: screenWidth, height: screenHeight * 0.7 });
        setLoading(false);
      }
    );
  };

  // 当图片URL变化时获取尺寸
  React.useEffect(() => {
    if (visible && imageUrl) {
      getImageSize(imageUrl);
    }
  }, [visible, imageUrl]);

  // 请求存储权限
  const requestStoragePermission = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        const permission = Platform.Version >= 33 
          ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
          : PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE;
        
        const result = await request(permission);
        return result === RESULTS.GRANTED;
      } else {
        // iOS 不需要特殊权限，CameraRoll 会自动处理
        return true;
      }
    } catch (error) {
      console.error('请求权限失败:', error);
      return false;
    }
  };

  // 保存图片到相册
  const saveImageToGallery = async () => {
    if (!imageUrl) return;
    
    setSaving(true);
    
    try {
      // 请求权限
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('权限不足', '需要存储权限才能保存图片到相册');
        setSaving(false);
        return;
      }

      // 保存图片
      await CameraRoll.save(imageUrl, { type: 'photo' });
      
      if (Platform.OS === 'android') {
        ToastAndroid.show('图片已保存到相册', ToastAndroid.SHORT);
      } else {
        Alert.alert('成功', '图片已保存到相册');
      }
    } catch (error) {
      console.error('保存图片失败:', error);
      if (Platform.OS === 'android') {
        ToastAndroid.show('保存失败', ToastAndroid.SHORT);
      } else {
        Alert.alert('错误', '保存图片失败');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.9)" barStyle="light-content" />
      <View style={styles.container}>
        {/* 顶部工具栏 */}
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.toolbarButton} onPress={onClose}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.toolbarActions}>
            <TouchableOpacity 
              style={styles.toolbarButton} 
              onPress={saveImageToGallery}
              disabled={loading || saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="download" size={24} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 图片显示区域 - 使用ScrollView实现缩放 */}
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          maximumZoomScale={3}
          minimumZoomScale={0.5}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          centerContent
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          ) : (
            <Image
              source={{ uri: imageUrl }}
              style={{
                width: imageSize.width,
                height: imageSize.height,
              }}
              resizeMode="contain"
              onError={(error) => {
                console.error('图片加载错误:', error);
                setLoading(false);
              }}
            />
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  toolbarButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  toolbarActions: {
    flexDirection: 'row',
    gap: 12,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default EnhancedImageViewer;