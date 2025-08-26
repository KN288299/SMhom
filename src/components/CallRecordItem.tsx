import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface CallRecordItemProps {
  isMe: boolean;
  timestamp: Date;
  duration?: string;
  missed?: boolean;
  rejected?: boolean;
  isOutgoing: boolean; // 是否是拨出的电话
}

const CallRecordItem: React.FC<CallRecordItemProps> = ({ 
  isMe,
  timestamp,
  duration,
  missed,
  rejected,
  isOutgoing
}) => {
  // 确定图标和文本
  const getIconAndText = () => {
    if (missed) {
      return {
        iconName: isOutgoing ? 'call-outline' : 'call-outline', 
        iconColor: '#FF3B30',
        text: isOutgoing ? '未接听' : '未接来电'
      };
    } else if (rejected) {
      return {
        iconName: isOutgoing ? 'close-circle-outline' : 'call-outline', 
        iconColor: '#FF3B30',
        text: isOutgoing ? '对方已拒绝' : '已拒绝'
      };
    } else {
      return {
        iconName: 'checkmark-circle-outline', 
        iconColor: '#4CD964',
        text: `通话时长 ${duration || '00:00'}`
      };
    }
  };

  const { iconName, iconColor, text } = getIconAndText();

  return (
    <View style={[styles.container, isMe ? styles.myContainer : styles.otherContainer]}>
      <View style={[styles.callBubble, isMe ? styles.myCallBubble : styles.otherCallBubble]}>
        <View style={styles.iconContainer}>
          <Icon name={iconName} size={20} color={iconColor} style={styles.callIcon} />
        </View>
        <View style={styles.callInfo}>
          <Text style={[styles.callText, isMe ? styles.myCallText : styles.otherCallText]}>
            {isOutgoing ? '已拨打语音通话' : '收到语音通话'}
          </Text>
          <Text style={[styles.callStatus, { color: iconColor }]}>
            {text}
          </Text>
        </View>
      </View>
      {/* 时间显示已移除 */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 5,
    maxWidth: '80%',
  },
  myContainer: {
    alignSelf: 'flex-end',
    marginRight: 8,
  },
  otherContainer: {
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  callBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 12,
    minWidth: 140,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  myCallBubble: {
    backgroundColor: '#f0f0f0',
    borderBottomRightRadius: 4,
  },
  otherCallBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  callIcon: {
    
  },
  callInfo: {
    flex: 1,
  },
  callText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  myCallText: {
    color: '#333',
  },
  otherCallText: {
    color: '#333',
  },
  callStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    marginHorizontal: 4,
  },
  myTimestamp: {
    color: '#999',
    alignSelf: 'flex-end',
  },
  otherTimestamp: {
    color: '#999',
  },
});

export default CallRecordItem; 