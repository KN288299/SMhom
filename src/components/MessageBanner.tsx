import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Platform, Vibration, StatusBar } from 'react-native';

export interface MessageBannerData {
  conversationId?: string;
  contactId?: string;
  contactName?: string;
  contactAvatar?: string | null;
  previewText: string;
}

interface MessageBannerProps {
  visible: boolean;
  data: MessageBannerData | null;
  onPress: () => void;
  onHide?: () => void;
}

const MessageBanner: React.FC<MessageBannerProps> = ({ visible, data, onPress }) => {
  useEffect(() => {
    if (visible) {
      // 震动提醒（轻触反馈）
      if (Platform.OS === 'ios') {
        // iOS 使用短震动模式
        Vibration.vibrate(50);
      } else {
        // Android 使用更明显的震动
        Vibration.vibrate(80);
      }
    }
  }, [visible]);

  if (!visible || !data) return null;

  const avatarSource = data.contactAvatar
    ? { uri: data.contactAvatar }
    : require('../assets/images/moren.png');

  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.banner}>
        <Image source={avatarSource} style={styles.avatar} />
        <View style={styles.textContainer}>
          <Text numberOfLines={1} style={styles.name}>{data.contactName || '新消息'}</Text>
          <Text numberOfLines={2} style={styles.preview}>{data.previewText}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.select({ ios: 52, android: (StatusBar.currentHeight || 0) + 12 }),
    left: 12,
    right: 12,
    zIndex: 1000,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#ccc',
  },
  textContainer: {
    flex: 1,
  },
  name: {
    color: '#111',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  preview: {
    color: '#444',
    fontSize: 13,
  },
});

export default MessageBanner;


