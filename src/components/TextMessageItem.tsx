import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import { iOSMessageStyles, isIOS, getPlatformStyles } from '../styles/iOSStyles';
import { DEFAULT_AVATAR } from '../utils/DefaultAvatar';

// 工具函数
const formatMessageTime = (timestamp: Date): string => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

interface TextMessageItemProps {
  content: string;
  timestamp: Date;
  isMe: boolean;
  contactAvatar?: string | null;
}

const TextMessageItem: React.FC<TextMessageItemProps> = ({
  content,
  timestamp,
  isMe,
  contactAvatar,
}) => {
  // 渲染头像
  const renderAvatar = () => {
    if (contactAvatar) {
      return <Image source={{ uri: contactAvatar }} style={styles.avatar} />;
    } else {
      return <Image source={DEFAULT_AVATAR} style={styles.avatar} />;
    }
  };

  return (
    <View style={[
      getPlatformStyles(iOSMessageStyles.messageContainer, styles.messageContainer), 
      isMe ? styles.myMessage : styles.otherMessage
    ]}>
      {/* 显示对方头像（非自己的消息） */}
      {!isMe && (
        <View style={styles.avatarContainer}>
          {renderAvatar()}
        </View>
      )}
      
      <View style={styles.messageContent}>
        <View style={[
          getPlatformStyles(iOSMessageStyles.messageBubble, styles.messageBubble),
          isMe ? getPlatformStyles(iOSMessageStyles.myBubble, styles.myBubble) : getPlatformStyles(iOSMessageStyles.otherBubble, styles.otherBubble)
        ]}>
          <Text style={[
            getPlatformStyles(
              isMe ? iOSMessageStyles.myMessageText : iOSMessageStyles.otherMessageText,
              isMe ? styles.myMessageText : styles.otherMessageText
            )
          ]}>
            {content}
          </Text>
        </View>
        <Text style={[
          getPlatformStyles(
            isMe ? iOSMessageStyles.myMessageTime : iOSMessageStyles.otherMessageTime,
            isMe ? styles.myMessageTime : styles.otherMessageTime
          )
        ]}>
          {formatMessageTime(timestamp)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 2,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  myMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    marginBottom: 4,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  messageContent: {
    flex: 1,
    maxWidth: '75%',
  },
  messageBubble: {
    paddingHorizontal: 16, // 增加水平内边距
    paddingVertical: 12,   // 增加垂直内边距
    borderRadius: 18,
    minWidth: 60,
  },
  myBubble: {
    backgroundColor: '#ff6b81',
  },
  otherBubble: {
    backgroundColor: '#f0f0f0',
  },
  messageText: {
    fontSize: 18, // 增大消息文字字体
    lineHeight: 22,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  myMessageTime: {
    textAlign: 'right',
  },
  otherMessageTime: {
    textAlign: 'left',
  },
});

// 使用memo优化，避免不必要的重新渲染
export default memo(TextMessageItem, (prevProps, nextProps) => {
  return (
    prevProps.content === nextProps.content &&
    prevProps.timestamp.getTime() === nextProps.timestamp.getTime() &&
    prevProps.isMe === nextProps.isMe &&
    prevProps.contactAvatar === nextProps.contactAvatar
  );
}); 