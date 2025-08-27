import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import Video from 'react-native-video';
import Input from '../components/Input';
import Button from '../components/Button';
import axios from 'axios';
import { API_URL, API_ENDPOINTS } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { getNavigationFlow } from '../config/platformFeatures';


interface AuthScreenProps {
  navigation: any;
}

interface ApiErrorResponse {
  message: string;
}

const {width, height} = Dimensions.get('window');

const AuthScreen: React.FC<AuthScreenProps> = ({navigation}) => {
  const { login } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [inviteCode, setInviteCode] = useState('6969');
  const [errors, setErrors] = useState<{
    phoneNumber?: string;
    inviteCode?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  const validatePhone = () => {
    if (!phoneNumber) {
      setErrors(prev => ({...prev, phoneNumber: '请输入手机号码'}));
      return false;
    } else if (!/^1\d{10}$/.test(phoneNumber)) {
      setErrors(prev => ({...prev, phoneNumber: '请输入有效的手机号码'}));
      return false;
    }
    setErrors(prev => ({...prev, phoneNumber: undefined}));
    return true;
  };

  const validateInviteCode = () => {
    if (!inviteCode) {
      setErrors(prev => ({...prev, inviteCode: '请输入邀请码'}));
      return false;
    } else if (inviteCode.length < 4) {
      setErrors(prev => ({...prev, inviteCode: '邀请码格式不正确'}));
      return false;
    }
    setErrors(prev => ({...prev, inviteCode: undefined}));
    return true;
  };

  const handleLogin = async () => {
    if (!validatePhone() || !validateInviteCode()) {
      return;
    }

    setLoading(true);

    try {
      console.log('开始登录请求...');

      // 检查是否为客服登录 - 使用特定邀请码 1332
      const isCustomerService = inviteCode === '1332';
      const loginEndpoint = isCustomerService
        ? API_ENDPOINTS.CUSTOMER_SERVICE_LOGIN
        : API_ENDPOINTS.USER_LOGIN;

      console.log('API URL:', `${API_URL}${loginEndpoint}`);
      console.log('请求数据:', { phoneNumber, inviteCode });
      console.log('登录类型:', isCustomerService ? '客服登录' : '用户登录');

      // 调用登录API
      const response = await axios.post(`${API_URL}${loginEndpoint}`, {
        phoneNumber,
        password: '1332', // 客服登录使用固定密码
        inviteCode,
        devicePlatform: Platform.OS === 'ios' ? 'ios' : 'android',
      });

      console.log('登录成功:', response.data);

      // 使用AuthContext保存用户信息和令牌
      await login(response.data.token, {
        ...response.data,
        userType: isCustomerService ? 'customerService' : 'user', // 添加用户类型标识
      });

      setLoading(false);

      // iOS用户登录成功，不再配置推送通知
      if (Platform.OS === 'ios') {
        console.log('🍎 iOS用户登录成功，跳过推送通知配置');
      }

      // 获取平台特定的导航流程
      const navigationFlow = getNavigationFlow();
      console.log('🚀 平台导航流程:', navigationFlow);
      console.log('📱 平台:', Platform.OS);

      // 所有用户都直接进入主页，不再区分平台
      console.log('🚀 用户登录成功，直接进入主页');
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } catch (error: any) {
      setLoading(false);

      console.log('登录失败:', error);
      console.log('错误详情:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
      });

      // 处理错误
      if (axios.isAxiosError(error) && error.response) {
        // API返回的错误
        const errorResponse = error.response.data as ApiErrorResponse;
        const errorMessage = errorResponse.message || '登录失败，请重试';
        Alert.alert('登录失败', errorMessage);
      } else {
        // 网络错误或其他错误
        Alert.alert('登录失败', `网络错误或服务器未响应，请稍后重试\n错误信息: ${error.message}`);
      }
    }
  };

  // 处理用户协议点击
  const handleUserAgreementPress = () => {
    navigation.navigate('UserAgreement');
  };

  // 处理隐私政策点击
  const handlePrivacyPolicyPress = () => {
    navigation.navigate('PrivacyPolicy');
  };

  return (
    <View style={styles.backgroundImage}>
      <Video
        source={require('../assets/videos/login.mp4')}
        style={styles.backgroundVideo}
        muted={true}
        repeat={true}
        resizeMode="cover"
        rate={1.0}
        ignoreSilentSwitch="obey"
        paused={false}
      />
      <StatusBar translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            
            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={styles.title}>HOMESM</Text>
                <Text style={styles.subtitle}>在线选妃 你想要的这全都有</Text>
              </View>

              <View style={styles.form}>
                <View style={styles.phoneInputContainer}>
                  <Text style={styles.inputLabel}>+86</Text>
                  <View style={styles.divider} />
                  <Input
                    placeholder="请输入手机号"
                    placeholderTextColor="#DDDDDD"
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={text => {
                      setPhoneNumber(text);
                      if (errors.phoneNumber) {
                        validatePhone();
                      }
                    }}
                    error={errors.phoneNumber}
                    containerStyle={styles.phoneInput}
                    inputStyle={styles.input}
                  />
                </View>

                <View style={styles.inviteCodeContainer}>
                  <Input
                    placeholder="请输入邀请码"
                    placeholderTextColor="#DDDDDD"
                    value={inviteCode}
                    onChangeText={text => {
                      setInviteCode(text);
                      if (errors.inviteCode) {
                        validateInviteCode();
                      }
                    }}
                    error={errors.inviteCode}
                    containerStyle={styles.inviteCodeInput}
                    inputStyle={styles.input}
                  />
                  <Text style={styles.inviteCodeHint}>默认邀请码：6969</Text>
                </View>

                <View style={styles.loginButtonContainer}>
                  <Button
                    title="登录/注册"
                    onPress={handleLogin}
                    loading={loading}
                    style={styles.loginButton}
                    textStyle={styles.loginButtonText}
                  />
                </View>
              </View>

              <View style={styles.policyContainer}>
                <View style={styles.policyTextRow}>
                  <Text style={styles.policyText}>登录即代表您已阅读并同意 </Text>
                  <TouchableOpacity
                    onPress={handleUserAgreementPress}
                    style={styles.policyLinkContainer}
                  >
                    <Text style={styles.policyLink}>《用户协议》</Text>
                  </TouchableOpacity>
                  <Text style={styles.policyText}> 和 </Text>
                  <TouchableOpacity
                    onPress={handlePrivacyPolicyPress}
                    style={styles.policyLinkContainer}
                  >
                    <Text style={styles.policyLink}>《隐私政策》</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: -1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: height * 0.15,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: 5,
  },
  form: {
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 0,
    marginVertical: 20,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 20,
  },
  inputLabel: {
    paddingHorizontal: 15,
    color: '#333',
    fontSize: 16,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: '#DDDDDD',
  },
  phoneInput: {
    flex: 1,
    marginBottom: 0,
  },
  input: {
    borderWidth: 0,
    height: 50,
    backgroundColor: 'transparent',
    color: '#333',
  },
  inviteCodeContainer: {
    marginBottom: 20,
    marginHorizontal: 20,
  },
  inviteCodeHint: {
    fontSize: 12,
    color: '#CCCCCC',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  inviteCodeInput: {
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  fullWidthInput: {
    marginBottom: 0,
  },
  loginButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButton: {
    backgroundColor: '#FF6B6B',
    marginTop: 10,
    height: 50,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  policyContainer: {
    marginTop: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  policyTextRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  policyText: {
    color: '#CCCCCC',
    fontSize: 12,
    textAlign: 'center',
  },
  policyLinkContainer: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  policyLink: {
    color: '#6495ED',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});

export default AuthScreen;
