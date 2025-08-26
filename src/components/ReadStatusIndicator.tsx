import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ReadStatusIndicatorProps {
  isRead: boolean;
  isMe: boolean;
  style?: any;
}

const ReadStatusIndicator: React.FC<ReadStatusIndicatorProps> = ({ 
  isRead, 
  isMe,
  style 
}) => {
  // 只有自己发送的消息才显示已读状态
  if (!isMe) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.checkMark, isRead ? styles.readCheckMark : styles.sentCheckMark]}>
        {isRead ? '√√' : '√'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  checkMark: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  sentCheckMark: {
    color: '#fff',
    opacity: 0.7,
  },
  readCheckMark: {
    color: '#4CAF50', // 绿色表示已读
  },
});

export default ReadStatusIndicator;
