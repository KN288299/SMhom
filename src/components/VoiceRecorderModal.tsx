import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

interface VoiceRecorderModalProps {
  showPreview: boolean;
  isRecording: boolean;
  isPlaying: boolean;
  recordTime: string;
  currentPlayTime: string;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording: () => void;
  onPlayPreview: () => void;
  onConfirmSend: () => void;
  pulseAnim: Animated.Value;
}

const VoiceRecorderModal: React.FC<VoiceRecorderModalProps> = ({
  showPreview,
  isRecording,
  isPlaying,
  recordTime,
  currentPlayTime,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  onPlayPreview,
  onConfirmSend,
  pulseAnim,
}) => {
  return (
    <Modal
      visible={showPreview}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancelRecording}
    >
      <TouchableWithoutFeedback onPress={onCancelRecording}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.voicePreviewModal}>
              <View style={styles.voicePreviewHeader}>
                <Text style={styles.voicePreviewTitle}>
                  {isRecording ? '录音中' : '录音预览'}
                </Text>
                <TouchableOpacity onPress={onCancelRecording}>
                  <Icon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              {/* 录音控制区域 */}
              <View style={styles.voiceRecordingArea}>
                {!isRecording ? (
                  <View style={styles.voicePreviewContent}>
                    <TouchableOpacity 
                      style={styles.playButton}
                      onPress={onPlayPreview}
                    >
                      <Icon 
                        name={isPlaying ? "pause" : "play"} 
                        size={30} 
                        color="#fff" 
                      />
                    </TouchableOpacity>
                    <Text style={styles.playTimeText}>
                      {isPlaying ? currentPlayTime : recordTime}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.recordingContent}>
                    <Animated.View 
                      style={[
                        styles.recordingIndicator,
                        {
                          transform: [{
                            scale: pulseAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 1.3]
                            })
                          }]
                        }
                      ]}
                    >
                      <Icon name="mic" size={30} color="#fff" />
                    </Animated.View>
                    <Text style={styles.recordTimeText}>{recordTime}</Text>
                  </View>
                )}
              </View>
              
              {/* 底部按钮区域 */}
              <View style={styles.voicePreviewActions}>
                {isRecording ? (
                  <>
                    <TouchableOpacity 
                      style={[styles.voiceActionButton, styles.cancelButton]}
                      onPress={onCancelRecording}
                    >
                      <Text style={styles.cancelButtonText}>取消</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.voiceActionButton, styles.stopButton]}
                      onPress={onStopRecording}
                    >
                      <Text style={styles.stopButtonText}>停止</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity 
                      style={[styles.voiceActionButton, styles.reRecordButton]}
                      onPress={onStartRecording}
                    >
                      <Text style={styles.reRecordButtonText}>重录</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.voiceActionButton, styles.sendButton]}
                      onPress={onConfirmSend}
                    >
                      <Text style={styles.sendButtonText}>发送</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voicePreviewModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: width * 0.85,
    maxHeight: height * 0.6,
  },
  voicePreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  voicePreviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  voiceRecordingArea: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 30,
  },
  voicePreviewContent: {
    alignItems: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ff6b81',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  playTimeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  recordingContent: {
    alignItems: 'center',
  },
  recordingIndicator: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ff4757',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  recordTimeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff4757',
  },
  voicePreviewActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  voiceActionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f2f6',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stopButton: {
    backgroundColor: '#ff4757',
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  reRecordButton: {
    backgroundColor: '#f1f2f6',
  },
  reRecordButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sendButton: {
    backgroundColor: '#ff6b81',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default VoiceRecorderModal; 