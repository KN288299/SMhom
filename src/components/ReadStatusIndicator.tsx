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
      {isRead ? (
        // 已读状态：两个斜杠
        <View style={styles.readContainer}>
          <Text style={[styles.checkMark, styles.readCheckMark]}>/</Text>
          <Text style={[styles.checkMark, styles.readCheckMark, styles.secondCheck]}>/</Text>
        </View>
      ) : (
        // 已发送但未读：单个斜杠
        <Text style={[styles.checkMark, styles.sentCheckMark]}>/</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    minWidth: 16,
    height: 16,
  },
  readContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  checkMark: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 12,
  },
  sentCheckMark: {
    opacity: 0.6,
  },
  readCheckMark: {
    opacity: 0.8,
  },
  secondCheck: {
    marginLeft: -3, // 让两个勾重叠一点，形成双勾效果
    opacity: 0.9,
  },
});

export default ReadStatusIndicator;
