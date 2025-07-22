import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface SettingsScreenProps {
  navigation: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  // 处理菜单项点击
  const handleMenuPress = (item: string) => {
    switch (item) {
      case 'user_agreement':
        navigation.navigate('UserAgreement');
        break;
      case 'privacy_policy':
        navigation.navigate('PrivacyPolicy');
        break;
      case 'about_app':
        navigation.navigate('AboutApp');
        break;
      default:
        break;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>设置</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 设置菜单 */}
        <View style={styles.menuContainer}>
          {/* 用户协议 */}
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemWithBorder]}
            onPress={() => handleMenuPress('user_agreement')}
          >
            <View style={styles.menuLeft}>
              <Icon name="document-text-outline" size={24} color="#333" />
              <Text style={styles.menuText}>用户协议</Text>
            </View>
            <Icon name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          {/* 隐私政策 */}
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemWithBorder]}
            onPress={() => handleMenuPress('privacy_policy')}
          >
            <View style={styles.menuLeft}>
              <Icon name="shield-checkmark-outline" size={24} color="#333" />
              <Text style={styles.menuText}>隐私政策</Text>
            </View>
            <Icon name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          {/* 关于APP */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleMenuPress('about_app')}
          >
            <View style={styles.menuLeft}>
              <Icon name="information-circle-outline" size={24} color="#333" />
              <Text style={styles.menuText}>关于APP</Text>
            </View>
            <Icon name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    height: 80,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 30, // 为状态栏留出空间
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  menuContainer: {
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  menuItemWithBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
});

export default SettingsScreen; 