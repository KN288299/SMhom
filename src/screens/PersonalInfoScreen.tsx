import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  StatusBar,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { launchImageLibrary } from 'react-native-image-picker';
import { DEFAULT_AVATAR } from '../utils/DefaultAvatar';

interface PersonalInfoScreenProps {
  navigation: any;
}

const PersonalInfoScreen: React.FC<PersonalInfoScreenProps> = ({ navigation }) => {
  const { logout, userInfo, isCustomerService, refreshUserInfo } = useAuth();
  const [avatarSource, setAvatarSource] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 检查VIP是否有效（未过期）
  const isVipValid = () => {
    if (!userInfo?.isVip) return false;
    if (!userInfo?.vipExpiryDate) return true; // 如果没有过期时间，视为永久有效
    return new Date(userInfo.vipExpiryDate) > new Date();
  };

  // 生成VIP卡号（基于用户ID的固定4位数字）
  const getVipCardNumber = () => {
    if (!userInfo?._id) return '8888';
    // 基于用户ID生成固定的4位数字
    const hash = userInfo._id.slice(-4);
    let number = '';
    for (let i = 0; i < 4; i++) {
      const char = hash.charCodeAt(i % hash.length);
      number += (char % 10).toString();
    }
    return number;
  };

  // 刷新用户信息
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const success = await refreshUserInfo();
      if (!success) {
        Alert.alert('刷新失败', '无法获取最新信息，请稍后重试');
      }
    } catch (error) {
      console.error('刷新用户信息失败:', error);
      Alert.alert('刷新失败', '无法获取最新信息，请稍后重试');
    } finally {
      setRefreshing(false);
    }
  };

  // 处理头像选择
  const handleAvatarPress = () => {
    Alert.alert(
      '选择头像',
      '请选择获取头像的方式',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '从相册选择',
          onPress: () => {
            launchImageLibrary(
              {
                mediaType: 'photo',
                quality: 0.8,
                maxWidth: 300,
                maxHeight: 300,
              },
              (response) => {
                if (response.assets && response.assets[0]) {
                  setAvatarSource(response.assets[0].uri || null);
                }
              }
            );
          },
        },
      ]
    );
  };

  // 处理菜单项点击
  const handleMenuPress = (item: string) => {
    switch (item) {
      case 'orders':
        navigation.navigate('Order');
        break;
      case 'customer_service':
        navigation.navigate('Message');
        break;
      case 'settings':
        navigation.navigate('Settings');
        break;
      default:
        break;
    }
  };

  // 处理退出登录
  const handleLogout = () => {
    Alert.alert(
      '退出登录',
      '确定要退出登录吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Auth' }],
            });
          },
        },
      ]
    );
  };

  // 获取用户信息
  const phoneNumber = userInfo?.phoneNumber || '未知';
  const userName = userInfo?.name || '用户';
  const userRole = isCustomerService() ? '客服' : '用户';
  
  // 处理头像显示，区分本地资源和网络图片
  const getAvatarSource = () => {
    if (avatarSource) {
      return { uri: avatarSource };
    }
    if (userInfo?.avatar) {
      return { uri: userInfo.avatar };
    }
    // 使用本地默认头像
    return DEFAULT_AVATAR;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent />
      
      {/* 优化的背景 */}
      <View style={styles.backgroundContainer}>
        {/* 主背景渐变 */}
        <View style={styles.primaryGradient} />
        
                 {/* 装饰性元素 */}
         <View style={styles.decorativeElements}>
           <View style={[styles.circle, styles.circle1]} />
           <View style={[styles.circle, styles.circle2]} />
           <View style={[styles.circle, styles.circle3]} />
           <View style={[styles.circle, styles.circle4]} />
           <View style={[styles.circle, styles.circle5]} />
           <View style={[styles.wave, styles.wave1]} />
           <View style={[styles.wave, styles.wave2]} />
           <View style={[styles.dot, styles.dot1]} />
           <View style={[styles.dot, styles.dot2]} />
           <View style={[styles.dot, styles.dot3]} />
         </View>
        
        {/* 底部背景 */}
        <View style={styles.bottomSection} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#666']} // Android
              tintColor="#666" // iOS
              title="下拉刷新" // iOS
              titleColor="#666" // iOS
            />
          }
        >
          {/* 标题 */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>个人信息</Text>
          </View>

          {/* 用户信息卡片 */}
          <View style={styles.userCard}>
            {/* 头像 */}
            <TouchableOpacity style={styles.avatarContainer} onPress={handleAvatarPress}>
              <Image source={getAvatarSource()} style={styles.avatar} />
              <View style={styles.cameraIcon}>
                <Icon name="camera" size={16} color="#666" />
              </View>
            </TouchableOpacity>

            {/* 手机号 */}
            <Text style={styles.phoneNumber}>{phoneNumber}</Text>

            {/* 职业 */}
            <Text style={styles.userRole}>{userRole}</Text>

            {/* VIP状态 */}
            {isVipValid() ? (
              // VIP会员卡
              <View style={styles.vipCard}>
                <View style={styles.vipCardHeader}>
                  <Text style={styles.vipCardTitle}>御足堂会员</Text>
                  <Text style={styles.vipCardNumber}>NO:{getVipCardNumber()}</Text>
                </View>
                
                <View style={styles.vipCardCenter}>
                  <View style={styles.vipStars}>
                    <Text style={styles.star}>★</Text>
                    <Text style={styles.star}>★</Text>
                  </View>
                  <View style={styles.crownContainer}>
                    <Text style={styles.crown}>👑</Text>
                  </View>
                  <View style={styles.vipStars}>
                    <Text style={styles.star}>★</Text>
                    <Text style={styles.star}>★</Text>
                  </View>
                </View>
                
                <View style={styles.vipLargeText}>
                  <Text style={styles.vipMainText}>VIP</Text>
                  <Text style={styles.vipCardType}>会员卡</Text>
                </View>
                
                <Text style={styles.vipCardSlogan}>只做最高端服务</Text>
                
                <Text style={styles.vipCardExpiry}>
                  到期时间: {userInfo?.vipExpiryDate ? new Date(userInfo.vipExpiryDate).toLocaleDateString() : '永久'}
                </Text>
              </View>
            ) : (
              // 普通VIP状态显示
              <View style={styles.vipContainer}>
                <View style={styles.vipBadge}>
                  <Icon name="close" size={16} color="#fff" />
                  <Text style={styles.vipText}>御足堂VIP未开通</Text>
                </View>
                <Text style={styles.vipDescription}>联系客服开通会员</Text>
              </View>
            )}
          </View>

          {/* 菜单列表 */}
          <View style={styles.menuContainer}>
            {/* 我的订单 */}
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemWithBorder]}
              onPress={() => handleMenuPress('orders')}
            >
              <View style={styles.menuLeft}>
                <Icon name="heart-outline" size={24} color="#333" />
                <Text style={styles.menuText}>我的订单</Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>

            {/* 联系客服 */}
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemWithBorder]}
              onPress={() => handleMenuPress('customer_service')}
            >
              <View style={styles.menuLeft}>
                <Icon name="chatbubble-outline" size={24} color="#333" />
                <Text style={styles.menuText}>联系客服</Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>

            {/* 设置 */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuPress('settings')}
            >
              <View style={styles.menuLeft}>
                <Icon name="settings-outline" size={24} color="#333" />
                <Text style={styles.menuText}>设置</Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          </View>

          {/* 退出登录按钮 */}
          <View style={styles.logoutContainer}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>退出登录</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  // 优化的背景样式
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  primaryGradient: {
    height: 350,
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    // 添加轻微的阴影效果
    shadowColor: '#e0e0e0',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  decorativeElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 350,
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
  },
  circle1: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    top: -50,
    right: -80,
  },
  circle2: {
    width: 150,
    height: 150,
    backgroundColor: 'rgba(160, 160, 160, 0.08)',
    top: 100,
    left: -60,
  },
  circle3: {
    width: 100,
    height: 100,
    backgroundColor: 'rgba(180, 180, 180, 0.12)',
    top: 200,
    right: 50,
  },
  circle4: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(140, 140, 140, 0.09)',
    top: 50,
    left: 30,
  },
  circle5: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(190, 190, 190, 0.06)',
    top: 280,
    left: width - 150,
  },
  wave: {
    position: 'absolute',
    width: width + 100,
    height: 60,
    backgroundColor: 'rgba(200, 200, 200, 0.15)',
    borderRadius: 30,
    transform: [{ rotate: '-15deg' }],
  },
  wave1: {
    top: 150,
    left: -50,
  },
  wave2: {
    top: 220,
    left: -80,
    transform: [{ rotate: '10deg' }],
    backgroundColor: 'rgba(170, 170, 170, 0.12)',
  },
  dot: {
    position: 'absolute',
    borderRadius: 999,
  },
  dot1: {
    width: 12,
    height: 12,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
    top: 80,
    right: 100,
  },
  dot2: {
    width: 8,
    height: 8,
    backgroundColor: 'rgba(160, 160, 160, 0.25)',
    top: 180,
    left: 80,
  },
  dot3: {
    width: 10,
    height: 10,
    backgroundColor: 'rgba(140, 140, 140, 0.18)',
    top: 250,
    right: 40,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 350,
    backgroundColor: '#ffffff',
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingVertical: 40,
    paddingHorizontal: 25,
    alignItems: 'center',
    marginBottom: 30,
    marginTop: -20, // 让卡片稍微重叠背景
    shadowColor: '#ccc',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(220, 220, 220, 0.3)',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  phoneNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  userRole: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  vipContainer: {
    alignItems: 'center',
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5a3c',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 10,
  },
  vipText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  vipDescription: {
    fontSize: 14,
    color: '#ff6b81',
    textAlign: 'center',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 8,
    marginBottom: 30,
    shadowColor: '#ddd',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(200, 200, 200, 0.2)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuItemWithBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
    fontWeight: '500',
  },
  logoutContainer: {
    paddingBottom: 40,
  },
  logoutButton: {
    backgroundColor: '#ff6b81',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#ff6b81',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // VIP豪华卡片样式
  vipCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingVertical: 30,
    paddingHorizontal: 25,
    marginVertical: 20,
    borderWidth: 2,
    borderColor: '#d4af37',
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  vipCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  vipCardTitle: {
    color: '#d4af37',
    fontSize: 16,
    fontWeight: '600',
  },
  vipCardNumber: {
    color: '#d4af37',
    fontSize: 14,
    fontWeight: '500',
  },
  vipCardCenter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    paddingHorizontal: 20,
  },
  vipStars: {
    flexDirection: 'row',
  },
  star: {
    color: '#d4af37',
    fontSize: 20,
    marginHorizontal: 2,
  },
  crownContainer: {
    alignItems: 'center',
  },
  crown: {
    fontSize: 30,
  },
  vipLargeText: {
    alignItems: 'center',
    marginBottom: 20,
  },
  vipMainText: {
    color: '#d4af37',
    fontSize: 60,
    fontWeight: 'bold',
    letterSpacing: 8,
    textShadowColor: 'rgba(212, 175, 55, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  vipCardType: {
    color: '#d4af37',
    fontSize: 14,
    marginTop: -5,
    letterSpacing: 2,
  },
  vipCardSlogan: {
    color: '#d4af37',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 1,
    opacity: 0.8,
  },
  vipCardExpiry: {
    color: '#ff6b81',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.9,
  },
});

export default PersonalInfoScreen; 