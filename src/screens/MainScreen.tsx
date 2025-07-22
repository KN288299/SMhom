import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { getCurrentPlatformFeatures, isFeatureEnabled } from '../config/platformFeatures';

interface MainScreenProps {
  navigation: any;
  route: any;
}

const MainScreen: React.FC<MainScreenProps> = ({ navigation, route }) => {
  const { logout, userInfo } = useContext(AuthContext);
  
  // 获取平台特性配置
  const platformFeatures = getCurrentPlatformFeatures();

  const handleTestPermissions = () => {
    Alert.alert(
      '权限测试',
      '您可以在这里测试各种权限功能：\n\n• 位置：获取当前位置\n• 短信：读取短信内容\n• 通讯录：访问联系人\n• 相册：选择照片',
      [
        { text: '取消', style: 'cancel' },
        { text: '测试位置', onPress: () => Alert.alert('位置权限', '位置功能测试') },
        { text: '测试相册', onPress: () => Alert.alert('相册权限', '相册功能测试') },
      ]
    );
  };

  // 处理权限设置（平台差异化处理）
  const handlePermissionSettings = () => {
    if (Platform.OS === 'ios') {
      // iOS：显示权限说明，不进入权限申请页面
      Alert.alert(
        '🍎 iOS 权限管理',
        '为保护您的隐私，iOS版本采用按需权限申请：\n\n• 相机：拍照时申请\n• 相册：选择图片时申请\n• 位置：发送位置时申请\n• 麦克风：语音通话时申请\n\n如需调整权限，请前往系统设置',
        [
          { text: '好的', style: 'default' },
          { 
            text: '打开系统设置', 
            onPress: () => Alert.alert('提示', '请前往 设置 → 隐私与安全性 → 权限管理') 
          }
        ]
      );
    } else {
      // Android：可以重新进入权限申请页面
      Alert.alert(
        '📱 Android 权限重新设置',
        '将重新进入权限申请页面，您可以重新配置所有权限',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '继续',
            onPress: () => navigation.navigate('Permissions', {
              phoneNumber: phoneNumber,
              inviteCode: inviteCode
            })
          }
        ]
      );
    }
  };

  const handleSettings = () => {
    Alert.alert('设置', '跳转到应用设置页面');
  };

  const handleLogout = () => {
    Alert.alert(
      '退出登录',
      '确定要退出登录吗？',
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '确定', 
          onPress: async () => {
            await logout();
            navigation.navigate('Auth');
          }
        }
      ]
    );
  };

  // 从userInfo中获取用户信息
  const phoneNumber = userInfo?.phoneNumber || '未知';
  const inviteCode = userInfo?.inviteCode || '未知';
  const registrationTime = userInfo?.createdAt 
    ? new Date(userInfo.createdAt).toLocaleString('zh-CN') 
    : new Date().toLocaleString('zh-CN');

  // 判断是否是客服用户
  const isCustomerService = userInfo?.userType === 'customerService';
  const userName = userInfo?.name || '用户';
  const userRole = isCustomerService ? '客服' : '用户';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>欢迎使用</Text>
          <Text style={styles.subtitle}>家政服务聊天应用</Text>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>账号信息</Text>
          {isCustomerService && (
            <View style={styles.roleTag}>
              <Text style={styles.roleTagText}>客服账号</Text>
            </View>
          )}
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>姓名：</Text>
            <Text style={styles.statusValue}>{userName}</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>角色：</Text>
            <Text style={styles.statusValue}>{userRole}</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>手机号：</Text>
            <Text style={styles.statusValue}>{phoneNumber}</Text>
          </View>
          {!isCustomerService && (
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>邀请码：</Text>
            <Text style={styles.statusValue}>{inviteCode}</Text>
          </View>
          )}
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>注册时间：</Text>
            <Text style={styles.statusValue}>{registrationTime}</Text>
          </View>
        </View>

        {!isCustomerService && (
        <View style={styles.permissionsCard}>
          <Text style={styles.cardTitle}>
            {Platform.OS === 'ios' ? '权限策略' : '权限状态'}
          </Text>
          
          {Platform.OS === 'ios' ? (
            // iOS：显示按需权限策略
            <>
              <View style={styles.permissionItem}>
                <Text style={styles.permissionIcon}>📷</Text>
                <Text style={styles.permissionText}>相机权限 - 按需申请</Text>
              </View>
              <View style={styles.permissionItem}>
                <Text style={styles.permissionIcon}>🖼️</Text>
                <Text style={styles.permissionText}>相册权限 - 按需申请</Text>
              </View>
              <View style={styles.permissionItem}>
                <Text style={styles.permissionIcon}>📍</Text>
                <Text style={styles.permissionText}>位置权限 - 按需申请</Text>
              </View>
              <View style={styles.permissionItem}>
                <Text style={styles.permissionIcon}>🎤</Text>
                <Text style={styles.permissionText}>麦克风权限 - 按需申请</Text>
              </View>
              <Text style={styles.privacyNote}>
                🔒 为保护隐私，本应用仅在使用相关功能时申请权限
              </Text>
            </>
          ) : (
            // Android：显示已授权状态
            <>
              <View style={styles.permissionItem}>
                <Text style={styles.permissionIcon}>📍</Text>
                <Text style={styles.permissionText}>位置权限 - 已授权</Text>
              </View>
              <View style={styles.permissionItem}>
                <Text style={styles.permissionIcon}>📱</Text>
                <Text style={styles.permissionText}>短信权限 - 已授权</Text>
              </View>
              <View style={styles.permissionItem}>
                <Text style={styles.permissionIcon}>👥</Text>
                <Text style={styles.permissionText}>通讯录权限 - 已授权</Text>
              </View>
              <View style={styles.permissionItem}>
                <Text style={styles.permissionIcon}>📷</Text>
                <Text style={styles.permissionText}>相册权限 - 已授权</Text>
              </View>
            </>
          )}
        </View>
        )}

        <View style={styles.actionsCard}>
          <Text style={styles.cardTitle}>功能菜单</Text>
          
          {!isCustomerService && (
          <TouchableOpacity style={styles.actionButton} onPress={handleTestPermissions}>
            <Text style={styles.actionButtonText}>测试权限功能</Text>
          </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.actionButton} onPress={handleSettings}>
            <Text style={styles.actionButtonText}>应用设置</Text>
          </TouchableOpacity>
          
          {!isCustomerService && (
          <TouchableOpacity style={styles.actionButton} onPress={handlePermissionSettings}>
            <Text style={styles.actionButtonText}>
              {Platform.OS === 'ios' ? '权限管理说明' : '重新设置权限'}
            </Text>
          </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.actionButtonText}>跳转到首页</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, styles.logoutButton]} onPress={handleLogout}>
            <Text style={[styles.actionButtonText, styles.logoutButtonText]}>退出登录</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>使用说明</Text>
          {isCustomerService ? (
            <Text style={styles.infoText}>
              • 您已登录为客服账号{'\n'}
              • 可以进行客户服务相关操作{'\n'}
              • 如需修改状态，请前往设置{'\n'}
              • 如有问题，请联系管理员
            </Text>
          ) : (
          <Text style={styles.infoText}>
            {Platform.OS === 'ios' 
              ? `• 🍎 iOS合规版本，保护您的隐私${'\n'}• 功能使用时会按需申请权限${'\n'}• 可以开始使用家政服务聊天功能${'\n'}• 如有问题，请联系客服`
              : `• 您已成功注册并获取了必要的权限${'\n'}• 可以开始使用家政服务聊天功能${'\n'}• 如需修改权限，请点击"重新设置权限"${'\n'}• 如有问题，请联系客服`
            }
          </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  statusItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  statusValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  permissionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  permissionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  permissionText: {
    fontSize: 14,
    color: '#333',
  },
  actionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#fff',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  roleTag: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 6,
    paddingHorizontal: 12,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  roleTagText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  privacyNote: {
    fontSize: 12,
    color: '#27ae60',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default MainScreen; 