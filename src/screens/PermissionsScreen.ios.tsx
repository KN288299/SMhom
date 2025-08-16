import React, { useEffect } from 'react';
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
 * 不申请敏感权限，直接跳转到主界面
 * 权限将在用户使用具体功能时按需申请
 */
const PermissionsScreen: React.FC<PermissionsScreenProps> = ({ navigation, route }) => {
  const { phoneNumber, inviteCode } = route.params;

  useEffect(() => {
    console.log('🍎 iOS权限屏幕: 跳过敏感权限申请，直接进入主界面');
    console.log('📱 导航参数:', { phoneNumber, inviteCode });
    
    const navigationFlow = getNavigationFlow();
    const features = getCurrentPlatformFeatures();
    
    console.log('🚀 iOS导航流程:', navigationFlow);
    console.log('⚙️  iOS功能配置:', features);
    
    // iOS版本直接跳转到主界面
    // 不进行敏感权限的批量申请
    const timer = setTimeout(() => {
      if (navigationFlow.afterLogin === 'MainTabs') {
        navigation.replace('MainTabs');
      } else {
        navigation.replace('MainTabs'); // 默认跳转到主界面
      }
    }, 1000); // 短暂显示加载，然后跳转
    
    return () => clearTimeout(timer);
  }, [navigation, phoneNumber, inviteCode]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#ff6b81" />
        <Text style={styles.title}>正在准备应用...</Text>
        <Text style={styles.subtitle}>iOS 合规版本</Text>
        <Text style={styles.description}>
          为了保护您的隐私，本应用采用按需权限申请策略
        </Text>
        <Text style={styles.note}>
          • 拍照时才申请相机权限{'\n'}
          • 选择图片时才申请相册权限{'\n'}
          • 发送位置时才申请位置权限{'\n'}
          • 语音通话时才申请麦克风权限
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
});

export default PermissionsScreen; 