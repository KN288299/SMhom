import React, { memo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  Clipboard,
} from 'react-native';
import { iOSMessageStyles, isIOS, getPlatformStyles } from '../styles/iOSStyles';
import { DEFAULT_AVATAR } from '../utils/DefaultAvatar';
import ReadStatusIndicator from './ReadStatusIndicator';
import MessageActionSheet, { MessageAction } from './MessageActionSheet';

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
  messageId?: string;
  onCopyMessage?: (content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onRecallMessage?: (messageId: string) => void;
}

const TextMessageItem: React.FC<TextMessageItemProps> = ({
  content,
  timestamp,
  isMe,
  contactAvatar,
  userAvatar,
  isRead = false,
  messageId,
  onCopyMessage,
  onDeleteMessage,
  onRecallMessage,
}) => {
  const [showActionSheet, setShowActionSheet] = useState(false);

  // 处理长按事件
  const handleLongPress = () => {
    setShowActionSheet(true);
  };

  // 处理复制消息
  const handleCopyMessage = () => {
    Clipboard.setString(content);
    if (onCopyMessage) {
      onCopyMessage(content);
    }
    Alert.alert('提示', '消息已复制到剪贴板');
  };

  // 处理删除消息
  const handleDeleteMessage = () => {
    if (!messageId) return;
    
    Alert.alert(
      '删除消息',
      '确定要删除这条消息吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            if (onDeleteMessage) {
              onDeleteMessage(messageId);
            }
          },
        },
      ]
    );
  };

  // 处理撤回消息
  const handleRecallMessage = () => {
    if (!messageId) return;
    
    Alert.alert(
      '撤回消息',
      '确定要撤回这条消息吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '撤回',
          style: 'destructive',
          onPress: () => {
            if (onRecallMessage) {
              onRecallMessage(messageId);
            }
          },
        },
      ]
    );
  };

  // 生成操作选项
  const getActions = (): MessageAction[] => {
    const actions: MessageAction[] = [
      {
        label: '复制',
        onPress: handleCopyMessage,
      },
      {
        label: '删除',
        onPress: handleDeleteMessage,
        type: 'destructive',
      },
    ];

    // 只有自己发送的消息才能撤回
    if (isMe) {
      actions.splice(1, 0, {
        label: '撤回',
        onPress: handleRecallMessage,
        type: 'destructive',
      });
    }

    return actions;
  };

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
      
      <View style={[
        styles.messageContent,
        isMe ? styles.messageContentRight : styles.messageContentLeft
      ]}>
        <View style={styles.messageBubbleWithTime}>
          <TouchableOpacity
            style={[
              getPlatformStyles(iOSMessageStyles.messageBubble, styles.messageBubble),
              isMe ? getPlatformStyles(iOSMessageStyles.myBubble, styles.myBubble) : getPlatformStyles(iOSMessageStyles.otherBubble, styles.otherBubble),
              isMe ? styles.bubbleRight : styles.bubbleLeft
            ]}
            onLongPress={handleLongPress}
            delayLongPress={500}
            activeOpacity={0.8}
          >
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
          </TouchableOpacity>
          {/* 时间显示已移除 */}
        </View>
      </View>

      {/* 显示自己头像（自己的消息） */}
      {isMe && (
        <View style={styles.avatarContainer}>
          {renderAvatar()}
        </View>
      )}

      {/* 长按操作菜单 */}
      <MessageActionSheet
        visible={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        actions={getActions()}
        title="消息操作"
      />
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
    marginHorizontal: 4,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  messageContent: {
    maxWidth: '70%',
    flexShrink: 1,
  },
  messageContentRight: {
    alignItems: 'flex-end',
  },
  messageContentLeft: {
    alignItems: 'flex-start',
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
  bubbleRight: {
    alignSelf: 'flex-end',
  },
  bubbleLeft: {
    alignSelf: 'flex-start',
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
    prevProps.isRead === nextProps.isRead &&
    prevProps.messageId === nextProps.messageId &&
    prevProps.onCopyMessage === nextProps.onCopyMessage &&
    prevProps.onDeleteMessage === nextProps.onDeleteMessage &&
    prevProps.onRecallMessage === nextProps.onRecallMessage
  );
}); 