import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Asset } from 'react-native-image-picker';

const { width } = Dimensions.get('window');

interface MediaPreviewModalsProps {
  // 语音预览相关
  showVoicePreview: boolean;
  isPlaying: boolean;
  recordTime: string;
  currentPlayTime: string;
  onPlayPreview: () => void;
  onCancelVoice: () => void;
  onConfirmVoice: () => void;
  
  // 图片预览相关
  showImagePreview: boolean;
  selectedImage: Asset | null;
  onCancelImage: () => void;
  onConfirmImage: () => void;
  
  // 视频预览相关
  showVideoPreview: boolean;
  selectedVideo: any | null;
  onCancelVideo: () => void;
  onConfirmVideo: () => void;
}

const MediaPreviewModals: React.FC<MediaPreviewModalsProps> = ({
  // 语音预览相关
  showVoicePreview,
  isPlaying,
  recordTime,
  currentPlayTime,
  onPlayPreview,
  onCancelVoice,
  onConfirmVoice,
  
  // 图片预览相关
  showImagePreview,
  selectedImage,
  onCancelImage,
  onConfirmImage,
  
  // 视频预览相关
  showVideoPreview,
  selectedVideo,
  onCancelVideo,
  onConfirmVideo,
}) => {
  return (
    <>
      {/* 语音消息预览模态框 */}
      <Modal
        visible={showVoicePreview}
        transparent
        animationType="fade"
        onRequestClose={onCancelVoice}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>语音消息预览</Text>
            
            <View style={styles.previewContent}>
              <View style={styles.previewDuration}>
                <Icon name="time-outline" size={20} color="#666" />
                <Text style={styles.previewDurationText}>
                  {isPlaying ? currentPlayTime : recordTime}
                </Text>
              </View>
              
              <TouchableOpacity 
                style={styles.previewPlayButton}
                onPress={onPlayPreview}
              >
                <Icon 
                  name={isPlaying ? "pause" : "play"} 
                  size={30} 
                  color="#fff" 
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.previewActions}>
              <TouchableOpacity 
                style={[styles.previewButton, styles.cancelButton]}
                onPress={onCancelVoice}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.previewButton, styles.sendPreviewButton]}
                onPress={onConfirmVoice}
              >
                <Text style={styles.sendButtonText}>发送</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* 图片预览模态框 */}
      <Modal
        visible={showImagePreview}
        transparent
        animationType="fade"
        onRequestClose={onCancelImage}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.imagePreviewContainer}>
            <Text style={styles.previewTitle}>图片预览</Text>
            
            <View style={styles.imagePreviewContent}>
              {selectedImage && selectedImage.uri && (
                <Image 
                  source={{ uri: selectedImage.uri }} 
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              )}
            </View>
            
            <View style={styles.previewActions}>
              <TouchableOpacity 
                style={[styles.previewButton, styles.cancelButton]}
                onPress={onCancelImage}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.previewButton, styles.sendPreviewButton]}
                onPress={onConfirmImage}
              >
                <Text style={styles.sendButtonText}>发送</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* 视频预览模态框 */}
      <Modal
        visible={showVideoPreview}
        transparent
        animationType="fade"
        onRequestClose={onCancelVideo}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.videoPreviewContainer}>
            <Text style={styles.previewTitle}>视频预览</Text>
            
            <View style={styles.videoPreviewContent}>
              {selectedVideo && selectedVideo.uri && (
                <View style={styles.videoPreviewWrapper}>
                  <View style={styles.videoPlayIconContainer}>
                    <Icon name="play-circle" size={50} color="#fff" />
                  </View>
                  {selectedVideo.duration && (
                    <View style={styles.videoDurationContainer}>
                      <Text style={styles.videoDurationText}>
                        {Math.round(selectedVideo.duration)}秒
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.videoInfoContainer}>
                    <Text style={styles.videoInfoText}>
                      {selectedVideo.fileName || '视频文件'}
                    </Text>
                    {selectedVideo.fileSize && (
                      <Text style={styles.videoInfoText}>
                        {(selectedVideo.fileSize / (1024 * 1024)).toFixed(2)} MB
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </View>
            
            <View style={styles.previewActions}>
              <TouchableOpacity 
                style={[styles.previewButton, styles.cancelButton]}
                onPress={onCancelVideo}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.previewButton, styles.sendPreviewButton]}
                onPress={onConfirmVideo}
              >
                <Text style={styles.sendButtonText}>发送</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  previewContent: {
    alignItems: 'center',
    marginBottom: 20,
  },
  previewDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  previewDurationText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  previewPlayButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ff6b81',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  previewButton: {
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
  sendPreviewButton: {
    backgroundColor: '#ff6b81',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // 图片预览样式
  imagePreviewContainer: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },
  imagePreviewContent: {
    width: '100%',
    height: 300,
    marginBottom: 20,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  
  // 视频预览样式
  videoPreviewContainer: {
    width: '90%',
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },
  videoPreviewContent: {
    width: '100%',
    height: 300,
    marginVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPreviewWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 10,
  },
  videoPlayIconContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  videoDurationContainer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  videoDurationText: {
    color: '#fff',
    fontSize: 12,
  },
  videoInfoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  videoInfoText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default MediaPreviewModals; 