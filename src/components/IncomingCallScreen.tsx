import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
  Image,
  Animated,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DEFAULT_AVATAR } from '../utils/DefaultAvatar';

interface IncomingCallScreenProps {
  contactName: string;
  contactAvatar?: string;
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallScreen: React.FC<IncomingCallScreenProps> = ({
  contactName,
  contactAvatar,
  onAccept,
  onReject
}) => {
  // 动画值
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // 头像加载状态
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  
  // 设置头像脉动动画
  useEffect(() => {
    console.log('IncomingCallScreen - 组件挂载');
    console.log('IncomingCallScreen - 联系人头像:', contactAvatar);
    
    const pulse = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.1,
        duration: 800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      })
    ]);
    
    // 创建无限循环动画
    Animated.loop(pulse).start();
    
    // 清理函数
    return () => {
      console.log('IncomingCallScreen - 组件卸载');
      pulseAnim.stopAnimation();
    };
  }, [pulseAnim]);

  // 处理接听按钮点击
  const handleAccept = () => {
    console.log('IncomingCallScreen - 接听按钮点击');
    onAccept();
  };
  
  // 处理拒绝按钮点击
  const handleReject = () => {
    console.log('IncomingCallScreen - 拒绝按钮点击');
    onReject();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      <View style={styles.callContainer}>
        <View style={styles.avatarContainer}>
          <Animated.View 
            style={{
              transform: [{ scale: pulseAnim }],
              borderRadius: 50,
              borderWidth: 2,
              borderColor: 'rgba(255, 255, 255, 0.3)',
            }}
          >
            <Image 
              source={contactAvatar && !avatarLoadError ? { uri: contactAvatar } : DEFAULT_AVATAR} 
              style={styles.avatar}
              onLoad={() => console.log('来电界面 - 头像加载成功:', contactAvatar || '默认头像')}
              onError={(e) => {
                console.error('来电界面 - 头像加载失败:', contactAvatar, e.nativeEvent.error);
                setAvatarLoadError(true);
              }}
            />
          </Animated.View>
          <Text style={styles.contactName}>{contactName}</Text>
          <Text style={styles.callTypeText}>语音通话</Text>
          <Text style={styles.callingText}>来电响铃...</Text>
        </View>
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.callButtonWrapper} onPress={handleReject}>
            <View style={[styles.callButton, styles.rejectButton]}>
              <Icon name="call" size={26} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </View>
            <Text style={styles.buttonLabel}>拒绝</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.callButtonWrapper} onPress={handleAccept}>
            <View style={[styles.callButton, styles.acceptButton]}>
              <Icon name="call" size={26} color="#fff" />
            </View>
            <Text style={styles.buttonLabel}>接听</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1a1a1a',
    zIndex: 9999,
  },
  callContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  contactName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  callTypeText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 10,
  },
  callingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 30,
    marginBottom: 40,
  },
  callButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 14,
  },
  acceptButton: {
    backgroundColor: '#4CD964',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
});

export default IncomingCallScreen; 