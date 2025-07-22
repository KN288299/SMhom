import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { getCurrentPlatformFeatures, getNavigationFlow } from '../config/platformFeatures';

interface DataUploadScreenProps {
  navigation: any;
  route: {
    params: {
      token: string;
      permissionData: any;
    };
  };
}

/**
 * iOS 版本的数据上传屏幕
 * 不上传敏感数据，直接跳转到主界面
 * 符合 iOS 隐私政策要求
 */
const DataUploadScreen: React.FC<DataUploadScreenProps> = ({ navigation, route }) => {
  const { token, permissionData } = route.params;

  useEffect(() => {
    console.log('🍎 iOS数据上传屏幕: 跳过敏感数据上传，直接进入主界面');
    console.log('📱 接收参数:', { hasToken: !!token, permissionData });
    
    const features = getCurrentPlatformFeatures();
    
    console.log('⚙️  iOS数据收集配置:', features.dataCollection);
    console.log('🔒 iOS隐私保护: 不上传通讯录、短信、位置等敏感数据');
    
    // iOS版本不上传敏感数据
    // 只进行基础的应用初始化
    const initializeApp = async () => {
      try {
        // 只保存基础的用户偏好设置（如果有的话）
        console.log('📱 iOS: 初始化基础设置...');
        
        // 不执行以下敏感数据上传:
        // - uploadContacts (通讯录)
        // - uploadSMS (短信)  
        // - uploadLocation (位置)
        // - uploadAlbum (相册)
        
        console.log('✅ iOS: 应用初始化完成，符合隐私政策');
        
        // 直接进入主界面
        setTimeout(() => {
          navigation.replace('MainTabs');
        }, 2000);
        
      } catch (error) {
        console.error('❌ iOS: 应用初始化失败:', error);
        // 即使出错也要进入主界面
        navigation.replace('MainTabs');
      }
    };

    initializeApp();
  }, [navigation, token, permissionData]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#ff6b81" />
        <Text style={styles.title}>正在初始化应用...</Text>
        <Text style={styles.subtitle}>iOS 隐私保护版本</Text>
        <Text style={styles.description}>
          正在为您准备安全的聊天环境
        </Text>
        <View style={styles.privacyInfo}>
          <Text style={styles.privacyTitle}>🔒 隐私保护承诺</Text>
          <Text style={styles.privacyText}>
            • 不收集您的通讯录信息{'\n'}
            • 不读取您的短信内容{'\n'}
            • 不追踪您的位置数据{'\n'}
            • 不批量上传您的相册{'\n'}
            • 所有功能按需使用，保护隐私
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#27ae60',
    marginBottom: 20,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    color: '#34495e',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  privacyInfo: {
    backgroundColor: '#e8f5e8',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27ae60',
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 10,
    textAlign: 'center',
  },
  privacyText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
  },
});

export default DataUploadScreen; 