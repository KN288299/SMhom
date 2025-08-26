import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import { iOSMessageStyles, isIOS, getPlatformStyles } from '../styles/iOSStyles';
import { DEFAULT_AVATAR } from '../utils/DefaultAvatar';
import ReadStatusIndicator from './ReadStatusIndicator';

// 工具函数
const formatMessageTime = (timestamp: Date): string => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

interface TextMessageItemProps {
  content: string;
  timestamp: Date;
  isMe: boolean;
  contactAvatar?: string | null;
  userAvatar?: string | null;
  isRead?: boolean;
}

const TextMessageItem: React.FC<TextMessageItemProps> = ({
  content,
  timestamp,
  isMe,
  contactAvatar,
  userAvatar,
  isRead = false,
}) => {
  // 渲染头像
  const renderAvatar = () => {
    // 根据消息发送者显示对应的头像
    const avatarUrl = isMe ? userAvatar : contactAvatar;
    if (avatarUrl) {
      return <Image source={{ uri: avatarUrl }} style={styles.avatar} />;
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
        <View style={styles.messageBubbleWithTime}>
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
            {/* 已读状态指示器 */}
            <ReadStatusIndicator 
              isRead={isRead} 
              isMe={isMe}
              style={styles.readStatus}
            />
          </View>
          {/* 时间显示已移除 */}
        </View>
      </View>

      {/* 显示自己头像（自己的消息） */}
      {isMe && (
        <View style={styles.avatarContainer}>
          {renderAvatar()}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 4,
    paddingHorizontal: 16,
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
    marginHorizontal: 8,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  messageContent: {
    maxWidth: '70%',
  },
  messageBubbleWithTime: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    minWidth: 50,
    maxWidth: '100%',
  },
  myBubble: {
    backgroundColor: '#ff6b81',
  },
  otherBubble: {
    backgroundColor: '#f5f5f5',
  },
  messageText: {
    fontSize: 18,
    lineHeight: 24,
  },
  myMessageText: {
    color: '#000',
  },
  otherMessageText: {
    color: '#000',
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
    marginLeft: 8,
    marginRight: 8,
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  myMessageTime: {
    textAlign: 'right',
  },
  otherMessageTime: {
    textAlign: 'left',
  },
  readStatus: {
    position: 'absolute',
    bottom: 4,
    right: 8,
  },
});

// 使用memo优化，避免不必要的重新渲染
export default memo(TextMessageItem, (prevProps, nextProps) => {
  return (
    prevProps.content === nextProps.content &&
    prevProps.timestamp.getTime() === nextProps.timestamp.getTime() &&
    prevProps.isMe === nextProps.isMe &&
    prevProps.contactAvatar === nextProps.contactAvatar &&
    prevProps.userAvatar === nextProps.userAvatar &&
    prevProps.isRead === nextProps.isRead
  );
}); 