import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
} from 'react-native';

const { height: screenHeight } = Dimensions.get('window');

export interface MessageAction {
  label: string;
  onPress: () => void;
  type?: 'default' | 'destructive';
}

interface MessageActionSheetProps {
  visible: boolean;
  onClose: () => void;
  actions: MessageAction[];
  title?: string;
}

const MessageActionSheet: React.FC<MessageActionSheetProps> = ({
  visible,
  onClose,
  actions,
  title,
}) => {
  const slideAnim = React.useRef(new Animated.Value(screenHeight)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleActionPress = (action: MessageAction) => {
    onClose();
    // 延迟执行动作，让动画先完成
    setTimeout(() => {
      action.onPress();
    }, 100);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.actionSheet,
                {
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {title && (
                <View style={styles.titleContainer}>
                  <Text style={styles.title}>{title}</Text>
                </View>
              )}
              
              <View style={styles.actionsContainer}>
                {actions.map((action, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.actionButton,
                      index === 0 && styles.firstActionButton,
                      index === actions.length - 1 && styles.lastActionButton,
                    ]}
                    onPress={() => handleActionPress(action)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.actionText,
                        action.type === 'destructive' && styles.destructiveText,
                      ]}
                    >
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>取消</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingBottom: 34, // 安全区域
  },
  titleContainer: {
    backgroundColor: '#f8f8f8',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 13,
    color: '#8e8e93',
    textAlign: 'center',
  },
  actionsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 8,
  },
  actionButton: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  firstActionButton: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  lastActionButton: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  actionText: {
    fontSize: 16,
    color: '#007aff',
    fontWeight: '400',
  },
  destructiveText: {
    color: '#ff3b30',
  },
  cancelButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#007aff',
    fontWeight: '600',
  },
});

export default MessageActionSheet;
