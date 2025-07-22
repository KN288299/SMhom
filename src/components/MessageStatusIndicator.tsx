import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface MessageStatusIndicatorProps {
  status: 'sending' | 'sent' | 'failed' | 'read';
  timestamp: Date;
}

const MessageStatusIndicator: React.FC<MessageStatusIndicatorProps> = ({ status, timestamp }) => {
  const formatTime = (time: Date) => {
    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderStatusIcon = () => {
    switch (status) {
      case 'sending':
        return <Icon name="time-outline" size={12} color="#999" />;
      case 'sent':
        return <Icon name="checkmark-outline" size={12} color="#999" />;
      case 'read':
        return <Icon name="checkmark-done-outline" size={12} color="#4CAF50" />;
      case 'failed':
        return <Icon name="alert-circle-outline" size={12} color="#f44336" />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.time}>{formatTime(timestamp)}</Text>
      {renderStatusIcon()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  time: {
    fontSize: 11,
    color: '#999',
    marginRight: 4,
  },
});

export default memo(MessageStatusIndicator); 