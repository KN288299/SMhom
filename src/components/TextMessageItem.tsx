import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

// 工具函数
const formatMessageTime = (timestamp: Date): string => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

interface TextMessageItemProps {
  content: string;
  timestamp: Date;
  isMe: boolean;
}

const TextMessageItem: React.FC<TextMessageItemProps> = ({
  content,
  timestamp,
  isMe,
}) => {
  return (
    <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.otherMessage]}>
      <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}>
        <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
          {content}
        </Text>
      </View>
      <Text style={[styles.messageTime, isMe ? styles.myMessageTime : styles.otherMessageTime]}>
        {formatMessageTime(timestamp)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 2,
    paddingHorizontal: 12,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    maxWidth: '75%',
    minWidth: 60,
  },
  myBubble: {
    backgroundColor: '#ff6b81',
  },
  otherBubble: {
    backgroundColor: '#f0f0f0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
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
    prevProps.isMe === nextProps.isMe
  );
}); 