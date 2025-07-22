import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Linking,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface AboutAppScreenProps {
  navigation: any;
}

const AboutAppScreen: React.FC<AboutAppScreenProps> = ({ navigation }) => {
  const handleContactPress = (type: string) => {
    switch (type) {
      case 'phone':
        Linking.openURL('tel:400-888-8888');
        break;
      case 'email':
        Linking.openURL('mailto:service@yuzutang.com');
        break;
      case 'website':
        Linking.openURL('https://www.yuzutang.com');
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
        <Text style={styles.headerTitle}>关于APP</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* APP信息 */}
          <View style={styles.appInfoSection}>
            <View style={styles.appIcon}>
              <Icon name="home-outline" size={48} color="#ff6b81" />
            </View>
            <Text style={styles.appName}>御足堂</Text>
            <Text style={styles.appVersion}>版本 1.0.0</Text>
            <Text style={styles.appDescription}>
              专业的家政服务平台，为您提供优质的家政服务体验
            </Text>
          </View>

          {/* 功能介绍 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>主要功能</Text>
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Icon name="chatbubble-outline" size={24} color="#ff6b81" />
                <View style={styles.featureContent}>
                  <Text style={styles.featureName}>在线咨询</Text>
                  <Text style={styles.featureDesc}>与专业客服实时沟通</Text>
                </View>
              </View>
              <View style={styles.featureItem}>
                <Icon name="calendar-outline" size={24} color="#ff6b81" />
                <View style={styles.featureContent}>
                  <Text style={styles.featureName}>服务预约</Text>
                  <Text style={styles.featureDesc}>快速预约各类家政服务</Text>
                </View>
              </View>
              <View style={styles.featureItem}>
                <Icon name="call-outline" size={24} color="#ff6b81" />
                <View style={styles.featureContent}>
                  <Text style={styles.featureName}>语音通话</Text>
                  <Text style={styles.featureDesc}>支持高质量语音通话</Text>
                </View>
              </View>
              <View style={styles.featureItem}>
                <Icon name="shield-checkmark-outline" size={24} color="#ff6b81" />
                <View style={styles.featureContent}>
                  <Text style={styles.featureName}>安全保障</Text>
                  <Text style={styles.featureDesc}>全程安全保障，放心使用</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 联系我们 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>联系我们</Text>
            <View style={styles.contactList}>
              <TouchableOpacity style={styles.contactItem} onPress={() => handleContactPress('phone')}>
                <Icon name="call-outline" size={24} color="#333" />
                <View style={styles.contactContent}>
                  <Text style={styles.contactLabel}>客服电话</Text>
                  <Text style={styles.contactValue}>400-888-8888</Text>
                </View>
                <Icon name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.contactItem} onPress={() => handleContactPress('email')}>
                <Icon name="mail-outline" size={24} color="#333" />
                <View style={styles.contactContent}>
                  <Text style={styles.contactLabel}>客服邮箱</Text>
                  <Text style={styles.contactValue}>service@yuzutang.com</Text>
                </View>
                <Icon name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.contactItem} onPress={() => handleContactPress('website')}>
                <Icon name="globe-outline" size={24} color="#333" />
                <View style={styles.contactContent}>
                  <Text style={styles.contactLabel}>官方网站</Text>
                  <Text style={styles.contactValue}>www.yuzutang.com</Text>
                </View>
                <Icon name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            </View>
          </View>

          {/* 公司信息 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>公司信息</Text>
            <View style={styles.companyInfo}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>公司名称：</Text>
                <Text style={styles.infoValue}>御足堂科技有限公司</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>注册地址：</Text>
                <Text style={styles.infoValue}>中国上海市</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>成立时间：</Text>
                <Text style={styles.infoValue}>2023年</Text>
              </View>
            </View>
          </View>

          {/* 版权信息 */}
          <View style={styles.copyrightSection}>
            <Text style={styles.copyrightText}>
              © 2024 御足堂科技有限公司
            </Text>
            <Text style={styles.copyrightText}>
              保留所有权利
            </Text>
          </View>
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
  content: {
    padding: 16,
  },
  appInfoSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    marginBottom: 16,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#fff5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#ffe5e5',
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  appVersion: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  appDescription: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  featureList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureContent: {
    marginLeft: 16,
    flex: 1,
  },
  featureName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: '#666',
  },
  contactList: {
    gap: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    overflow: 'hidden',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  contactContent: {
    marginLeft: 16,
    flex: 1,
  },
  contactLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 14,
    color: '#666',
  },
  companyInfo: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    width: 80,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  copyrightSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  copyrightText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
});

export default AboutAppScreen; 