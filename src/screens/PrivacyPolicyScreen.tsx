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

interface PrivacyPolicyScreenProps {
  navigation: any;
}

const PrivacyPolicyScreen: React.FC<PrivacyPolicyScreenProps> = ({ navigation }) => {
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
        <Text style={styles.headerTitle}>隐私政策</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>御足堂APP隐私政策</Text>
          
          <Text style={styles.updateDate}>最后更新时间：2024年1月1日</Text>
          
          <Text style={styles.introduction}>
            御足堂非常重视用户的隐私保护。本隐私政策详细说明了我们如何收集、使用、存储和保护您的个人信息。请您仔细阅读本政策，以便充分了解我们的隐私处理方式。
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. 信息收集</Text>
            <Text style={styles.sectionContent}>
              1.1 我们可能收集以下类型的信息：
              {'\n'}
              • 注册信息：手机号码、姓名等基本信息
              {'\n'}
              • 设备信息：设备型号、操作系统版本、设备标识符
              {'\n'}
              • 使用信息：APP使用记录、服务偏好、交互行为
              {'\n'}
              • 位置信息：在您授权的情况下收集位置信息以提供更好的服务
              {'\n\n'}
              1.2 我们仅在提供服务必需的范围内收集您的个人信息，遵循最小化原则。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. 信息使用</Text>
            <Text style={styles.sectionContent}>
              2.1 我们使用收集的信息用于：
              {'\n'}
              • 提供、维护和改进我们的服务
              {'\n'}
              • 处理您的服务请求和预约
              {'\n'}
              • 发送服务相关通知和重要信息
              {'\n'}
              • 个性化推荐和改善用户体验
              {'\n'}
              • 防范欺诈和确保服务安全
              {'\n\n'}
              2.2 我们不会将您的个人信息用于营销推广，除非获得您的明确同意。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. 信息共享</Text>
            <Text style={styles.sectionContent}>
              3.1 我们不会向第三方出售、租赁或以其他方式转让您的个人信息。
              {'\n\n'}
              3.2 在以下情况下，我们可能会共享您的信息：
              {'\n'}
              • 获得您的明确同意
              {'\n'}
              • 法律法规要求或司法机关要求
              {'\n'}
              • 为提供服务而与合作伙伴共享必要信息
              {'\n'}
              • 紧急情况下保护用户或公众安全
              {'\n\n'}
              3.3 与第三方共享时，我们会确保其具备相应的数据保护能力。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. 信息存储</Text>
            <Text style={styles.sectionContent}>
              4.1 我们会采用行业标准的安全措施保护您的个人信息安全。
              {'\n\n'}
              4.2 您的个人信息主要存储在中国境内的服务器上。
              {'\n\n'}
              4.3 我们仅在实现本政策所述目的所必需的期间内保留您的个人信息。
              {'\n\n'}
              4.4 当个人信息不再需要时，我们会及时删除或匿名化处理。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. 您的权利</Text>
            <Text style={styles.sectionContent}>
              5.1 您对自己的个人信息享有以下权利：
              {'\n'}
              • 访问权：了解我们处理您个人信息的情况
              {'\n'}
              • 更正权：要求更正不准确的个人信息
              {'\n'}
              • 删除权：要求删除您的个人信息
              {'\n'}
              • 撤回同意：撤回您对个人信息处理的同意
              {'\n\n'}
              5.2 如需行使上述权利，请通过本政策提供的联系方式与我们联系。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Cookie和类似技术</Text>
            <Text style={styles.sectionContent}>
              6.1 我们可能使用Cookie和类似技术来改善您的用户体验。
              {'\n\n'}
              6.2 您可以通过设备设置管理或禁用Cookie，但这可能影响某些功能的使用。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. 未成年人保护</Text>
            <Text style={styles.sectionContent}>
              7.1 我们不会故意收集14岁以下儿童的个人信息。
              {'\n\n'}
              7.2 如果您是14岁以下儿童的监护人，请在使用我们的服务前仔细阅读本政策。
              {'\n\n'}
              7.3 如发现我们无意中收集了儿童的个人信息，我们会尽快删除相关信息。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. 政策更新</Text>
            <Text style={styles.sectionContent}>
              8.1 我们可能会不时更新本隐私政策。
              {'\n\n'}
              8.2 重大变更时，我们会在APP内显著位置发布通知。
              {'\n\n'}
              8.3 继续使用我们的服务即表示您同意更新后的隐私政策。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. 联系我们</Text>
            <Text style={styles.sectionContent}>
              如果您对本隐私政策有任何疑问或需要行使您的权利，请通过以下方式联系我们：
              {'\n\n'}
              邮箱：privacy@yuzutang.com
              {'\n'}
              客服电话：400-888-8888
              {'\n'}
              地址：中国上海市
            </Text>
          </View>

          <Text style={styles.footer}>
            感谢您信任御足堂APP！
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

export default PrivacyPolicyScreen; 