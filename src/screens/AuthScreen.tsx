import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ImageBackground,
  StatusBar,
  Dimensions,
} from 'react-native';

interface AuthScreenProps {
  navigation: any;
}

const {width, height} = Dimensions.get('window');

const AuthScreen: React.FC<AuthScreenProps> = ({navigation}) => {
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
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>御足堂交友</Text>
            <Text style={styles.subtitle}>遇见你需要的那个她</Text>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => navigation.navigate('PhoneLogin')}>
              <Text style={styles.loginButtonText}>手机号登录/注册</Text>
            </TouchableOpacity>

            <View style={styles.policyContainer}>
              <View style={styles.policyTextRow}>
                <Text style={styles.policyText}>登录注册即表示同意 </Text>
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
        </View>
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
  footer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: height * 0.15 + 30, // 向上移动15%的屏幕高度
  },
  loginButton: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 15,
  },
  loginButtonText: {
    color: '#333333',
    fontSize: 16,
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
