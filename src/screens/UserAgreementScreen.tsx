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

interface UserAgreementScreenProps {
  navigation: any;
}

const UserAgreementScreen: React.FC<UserAgreementScreenProps> = ({ navigation }) => {
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
        <Text style={styles.headerTitle}>用户协议</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>御足堂APP用户协议</Text>
          
          <Text style={styles.updateDate}>最后更新时间：2024年1月1日</Text>
          
          <Text style={styles.introduction}>
            欢迎您使用御足堂APP！在您开始使用我们的服务之前，请仔细阅读并理解本用户协议（以下简称"本协议"）。本协议是您与御足堂之间关于使用御足堂APP服务的法律协议。
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. 服务说明</Text>
            <Text style={styles.sectionContent}>
              1.1 御足堂APP是一款提供家政服务的移动应用程序，为用户提供专业的家政服务预约、客服咨询、在线交流等功能。
              {'\n\n'}
              1.2 我们致力于为用户提供高质量、安全可靠的家政服务体验。
              {'\n\n'}
              1.3 服务内容可能会根据业务发展需要进行调整，具体以APP内实际提供的服务为准。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. 用户注册与账户</Text>
            <Text style={styles.sectionContent}>
              2.1 用户需要使用手机号码进行注册，确保提供的信息真实、准确、完整。
              {'\n\n'}
              2.2 用户有责任保护自己的账户安全，包括但不限于保管好登录密码和验证码。
              {'\n\n'}
              2.3 如发现账户被他人使用或存在安全漏洞，应立即通知我们。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. 用户行为规范</Text>
            <Text style={styles.sectionContent}>
              3.1 用户在使用服务时应遵守相关法律法规，不得从事任何违法违规活动。
              {'\n\n'}
              3.2 禁止发布违法、有害、威胁、辱骂、骚扰、侵权或不当的内容。
              {'\n\n'}
              3.3 不得恶意攻击、干扰或破坏服务的正常运行。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. 隐私保护</Text>
            <Text style={styles.sectionContent}>
              4.1 我们高度重视用户隐私保护，具体隐私政策请参阅《隐私政策》。
              {'\n\n'}
              4.2 用户同意我们按照隐私政策收集、使用和保护用户信息。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. 知识产权</Text>
            <Text style={styles.sectionContent}>
              5.1 御足堂APP及其相关内容的知识产权归御足堂所有。
              {'\n\n'}
              5.2 未经授权，用户不得复制、修改、传播或商业使用相关内容。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. 免责声明</Text>
            <Text style={styles.sectionContent}>
              6.1 我们努力确保服务的稳定性和安全性，但不承担因网络故障、系统维护等不可控因素导致的服务中断责任。
              {'\n\n'}
              6.2 用户使用第三方服务产生的风险由用户自行承担。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. 协议修改</Text>
            <Text style={styles.sectionContent}>
              7.1 我们保留随时修改本协议的权利，修改后的协议将在APP内公布。
              {'\n\n'}
              7.2 继续使用服务即表示同意修改后的协议。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. 联系我们</Text>
            <Text style={styles.sectionContent}>
              如果您对本协议有任何疑问，请通过以下方式联系我们：
              {'\n\n'}
              邮箱：service@yuzutang.com
              {'\n'}
              客服电话：400-888-8888
              {'\n'}
              地址：中国上海市
            </Text>
          </View>

          <Text style={styles.footer}>
            感谢您选择御足堂APP！
          </Text>
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
    padding: 20,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  updateDate: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  introduction: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  sectionContent: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
  },
  footer: {
    fontSize: 16,
    color: '#ff6b81',
    textAlign: 'center',
    fontWeight: 'bold',
    marginTop: 20,
  },
});

export default UserAgreementScreen; 