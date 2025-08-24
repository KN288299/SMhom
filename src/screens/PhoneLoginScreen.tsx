import React, {useState, useContext} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import Input from '../components/Input';
import Button from '../components/Button';

import axios from 'axios';
import { API_URL, API_ENDPOINTS } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { getNavigationFlow } from '../config/platformFeatures';

interface PhoneLoginScreenProps {
  navigation: any;
}

interface ApiErrorResponse {
  message: string;
}

const {height} = Dimensions.get('window');

const PhoneLoginScreen: React.FC<PhoneLoginScreenProps> = ({navigation}) => {
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
      });

      console.log('登录成功:', response.data);

      // 使用AuthContext保存用户信息和令牌
      await login(response.data.token, {
        ...response.data,
        userType: isCustomerService ? 'customerService' : 'user', // 添加用户类型标识
      });

      setLoading(false);

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
    <ImageBackground
      source={require('../assets/images/bg.png')}
      style={styles.backgroundImage}
      resizeMode="cover">
      <StatusBar translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>返回</Text>
            </TouchableOpacity>

            <View style={styles.header}>
              <Text style={styles.title}>手机号登录/注册</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.phoneInputContainer}>
                <Text style={styles.inputLabel}>+86</Text>
                <View style={styles.divider} />
                <Input
                  placeholder="请输入手机号"
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
                  value={inviteCode}
                  onChangeText={text => {
                    setInviteCode(text);
                    if (errors.inviteCode) {
                      validateInviteCode();
                    }
                  }}
                  error={errors.inviteCode}
                  containerStyle={styles.fullWidthInput}
                  inputStyle={styles.input}
                />
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
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
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
  backButton: {
    marginTop: 20,
    marginLeft: 10,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  header: {
    alignItems: 'center',
    marginTop: height * 0.1,
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  form: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 20,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
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
  },
  inviteCodeContainer: {
    marginBottom: 20,
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
    marginTop: 20,
    alignItems: 'center',
  },
  policyTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  policyText: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
  },
  policyLink: {
    color: '#FF6B6B',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  policyLinkContainer: {
    padding: 5,
  },
});

export default PhoneLoginScreen;
