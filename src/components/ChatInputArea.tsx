import React, { useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  Animated,
  StyleSheet,
  Keyboard,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { iOSChatStyles, isIOS, getPlatformStyles, getIOSFontSize } from '../styles/iOSStyles';

interface ChatInputAreaProps {
  // 文本消息相关
  messageText: string;
  setMessageText: (text: string) => void;
  onSendMessage: () => void;
  
  // 语音消息相关
  isVoiceMode: boolean;
  isRecording: boolean;
  recordTime: string;
  pulseAnim: Animated.Value;
  hasRecordingPermission: boolean;
  onToggleVoiceMode: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  
  // 更多选项相关
  showMoreOptions: boolean;
  onToggleMoreOptions: () => void;
  onTakePhoto: () => void;
  onSendImage: () => void;
  onVoiceCall: () => void;
  onShowToast: (message: string) => void;
  onSendLocation: () => void;
}

const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  messageText,
  setMessageText,
  onSendMessage,
  isVoiceMode,
  isRecording,
  recordTime,
  pulseAnim,
  hasRecordingPermission,
  onToggleVoiceMode,
  onStartRecording,
  onStopRecording,
  showMoreOptions,
  onToggleMoreOptions,
  onTakePhoto,
  onSendImage,
  onVoiceCall,
  onShowToast,
  onSendLocation,
}) => {
  // 获取语音输入区域的提示文本
  const getVoiceInputText = () => {
    if (isRecording) {
      return `松开结束 ${recordTime}`;
    }
    
    if (!hasRecordingPermission) {
      // 根据平台显示不同的权限提示
      if (Platform.OS === 'ios') {
        return '按住说话（需要授权麦克风）';
      } else {
        return '按住说话（需要录音权限）';
      }
    }
    
    return '按住说话';
  };

  // 获取语音输入区域的样式
  const getVoiceInputStyle = () => {
    if (isRecording) {
      return [styles.voiceInput, styles.recordingInput];
    }
    
    if (!hasRecordingPermission) {
      return [styles.voiceInput, styles.permissionNeededInput];
    }
    
    return styles.voiceInput;
  };

  return (
    <>
      <View style={getPlatformStyles(iOSChatStyles.inputContainer, styles.inputContainer)}>
        <View style={getPlatformStyles(iOSChatStyles.inputWrapper, styles.inputWrapper)}>
          <TouchableOpacity
            style={[styles.voiceButton, isVoiceMode && styles.activeVoiceButton]}
            onPress={onToggleVoiceMode}
          >
            <Icon 
              name={isVoiceMode ? "chatbubble-outline" : "mic-outline"} 
              size={24} 
              color={isVoiceMode ? "#ff6b81" : "#666"} 
            />
          </TouchableOpacity>
          
          {isVoiceMode ? (
            <Pressable
              style={getVoiceInputStyle()}
              onPressIn={onStartRecording}
              onPressOut={onStopRecording}
              delayLongPress={200}
            >
              {isRecording ? (
                <View style={styles.recordingContainer}>
                  <Animated.View 
                    style={[
                      styles.recordingIndicator, 
                      { transform: [{ scale: pulseAnim }] }
                    ]} 
                  />
                  <Text style={styles.voiceInputText}>
                    {getVoiceInputText()}
                  </Text>
                </View>
              ) : (
                <View style={styles.voiceInputContainer}>
                  {!hasRecordingPermission && (
                    <Icon 
                      name="mic-off-outline" 
                      size={20} 
                      color="#ff6b81" 
                      style={styles.permissionIcon}
                    />
                  )}
                  <Text style={[
                    styles.voiceInputText,
                    !hasRecordingPermission && styles.permissionNeededText
                  ]}>
                    {getVoiceInputText()}
                  </Text>
                </View>
              )}
            </Pressable>
          ) : (
            <>
              <TextInput
                style={getPlatformStyles(iOSChatStyles.textInput, styles.input)}
                value={messageText}
                onChangeText={setMessageText}
                placeholder="输入消息..."
                multiline
                onFocus={() => {
                  if (showMoreOptions) {
                    onToggleMoreOptions();
                  }
                }}
              />
              <TouchableOpacity
                style={getPlatformStyles(iOSChatStyles.moreButton, styles.moreButton)}
                onPress={onToggleMoreOptions}
              >
                <Icon 
                  name="add" 
                  size={isIOS ? 20 : 24} 
                  color="#fff" 
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  getPlatformStyles(iOSChatStyles.sendButton, styles.sendButton), 
                  !messageText.trim() && styles.disabledButton
                ]}
                onPress={onSendMessage}
                disabled={!messageText.trim()}
              >
                <Icon 
                  name="paper-plane" 
                  size={isIOS ? 16 : 20} 
                  color="#fff" 
                />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
      
      {/* 多功能选择面板 */}
      {showMoreOptions && (
        <View style={getPlatformStyles(iOSChatStyles.moreOptionsPanel, styles.optionsContainer)}>
          <TouchableOpacity 
            style={styles.optionButton} 
            onPress={onTakePhoto}
          >
            <View style={styles.optionIconContainer}>
              <Icon name="camera-outline" size={26} color="#ff6b81" />
            </View>
            <Text style={getPlatformStyles(iOSChatStyles.moreOptionText, styles.optionText)}>拍照</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionButton} 
            onPress={onSendImage}
          >
            <View style={styles.optionIconContainer}>
              <Icon name="image-outline" size={26} color="#ff6b81" />
            </View>
            <Text style={getPlatformStyles(iOSChatStyles.moreOptionText, styles.optionText)}>相册</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionButton} 
            onPress={() => {
              onToggleMoreOptions();
              onSendLocation();
            }}
          >
            <View style={styles.optionIconContainer}>
              <Icon name="location-outline" size={26} color="#ff6b81" />
            </View>
            <Text style={getPlatformStyles(iOSChatStyles.moreOptionText, styles.optionText)}>位置</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionButton} 
            onPress={onVoiceCall}
          >
            <View style={styles.optionIconContainer}>
              <Icon name="call-outline" size={26} color="#ff6b81" />
            </View>
            <Text style={getPlatformStyles(iOSChatStyles.moreOptionText, styles.optionText)}>语音通话</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    minHeight: 50,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1,
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  activeVoiceButton: {
    backgroundColor: '#ffe0e6',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 18, // 增大输入框字体
    backgroundColor: '#f8f8f8',
  },
  voiceInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  recordingInput: {
    backgroundColor: '#ffe0e6',
  },
  permissionNeededInput: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  voiceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff4757',
    marginRight: 8,
  },
  permissionIcon: {
    marginRight: 6,
  },
  voiceInputText: {
    fontSize: 18, // 增大语音输入提示文字
    color: '#333',
  },
  permissionNeededText: {
    color: '#e17055',
    fontSize: 16, // 增大权限提示文字
  },
  moreButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ff6b81',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ff6b81',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  optionsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    justifyContent: 'space-around',
  },
  optionButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  optionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
});

export default ChatInputArea; 