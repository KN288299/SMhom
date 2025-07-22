import React from 'react';
import {View, Text, StyleSheet, Image} from 'react-native';
import { DEFAULT_AVATAR } from '../utils/DefaultAvatar';

export interface MessageData {
  id: string;
  text: string;
  timestamp: number;
  senderId: string;
  isMine: boolean;
  avatar?: string;
  senderName?: string;
}

interface MessageItemProps {
  message: MessageData;
  showAvatar?: boolean;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  showAvatar = true,
}) => {
  const {text, isMine, timestamp, avatar, senderName} = message;
  
  const messageTime = new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // 渲染头像或字母头像
  const renderAvatar = () => {
    if (avatar) {
      return <Image source={{uri: avatar}} style={styles.avatar} />;
    } else {
      return <Image source={DEFAULT_AVATAR} style={styles.avatar} />;
    }
  };

  return (
    <View style={[styles.container, isMine ? styles.myMessage : styles.otherMessage]}>
      {!isMine && showAvatar && (
        <View style={styles.avatarContainer}>
          {renderAvatar()}
        </View>
      )}
      <View style={[styles.bubble, isMine ? styles.myBubble : styles.otherBubble]}>
        <Text style={[styles.text, isMine ? styles.myText : styles.otherText]}>
          {text}
        </Text>
        <Text style={[styles.time, isMine ? styles.myTime : styles.otherTime]}>
          {messageTime}
        </Text>
      </View>
      {isMine && showAvatar && (
        <View style={styles.avatarContainer}>
          {renderAvatar()}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 5,
    paddingHorizontal: 10,
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
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  bubble: {
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxWidth: '75%',
  },
  myBubble: {
    backgroundColor: '#007AFF',
  },
  otherBubble: {
    backgroundColor: '#E9E9EB',
  },
  text: {
    fontSize: 16,
    lineHeight: 20,
  },
  myText: {
    color: 'white',
  },
  otherText: {
    color: 'black',
  },
  time: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherTime: {
    color: 'rgba(0, 0, 0, 0.5)',
  },
});

export default MessageItem; 