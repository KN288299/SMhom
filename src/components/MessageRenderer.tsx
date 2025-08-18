import React, { memo } from 'react';
import VoiceMessageItem from './VoiceMessageItem';
import CallRecordItem from './CallRecordItem';
import ImageMessageItem from './ImageMessageItem';
import VideoMessageItem from './VideoMessageItem';
import TextMessageItem from './TextMessageItem';
import LocationMessageItem from './LocationMessageItem';

interface Message {
  _id: string;
  conversationId?: string; // 关键字段：消息所属的对话ID
  senderId: string;
  senderRole?: 'user' | 'customer_service';
  content: string;
  timestamp: Date;
  isRead?: boolean;
  messageType?: 'text' | 'voice' | 'image' | 'video' | 'location';
  contentType?: 'text' | 'voice' | 'image' | 'video' | 'file' | 'location';
  voiceDuration?: string;
  voiceUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  videoDuration?: string;
  isUploading?: boolean;
  uploadProgress?: number;
  videoWidth?: number;
  videoHeight?: number;
  aspectRatio?: number;
  fileUrl?: string;
  // 仅本地使用：iOS 自发视频的本地路径，用于预览/播放回退
  localFileUri?: string;
  isCallRecord?: boolean;
  callerId?: string;
  callDuration?: string;
  missed?: boolean;
  rejected?: boolean;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  address?: string;
}

interface MessageRendererProps {
  item: Message;
  userInfo: any;
  onOpenFullscreenImage: (imageUrl: string) => void;
  onOpenFullscreenVideo: (videoUrl: string) => void;
  onViewLocation?: (location: { latitude: number; longitude: number; locationName?: string; address?: string }) => void;
  formatMediaUrl: (url: string) => string;
}

const MessageRenderer: React.FC<MessageRendererProps> = ({
  item,
  userInfo,
  onOpenFullscreenImage,
  onOpenFullscreenVideo,
  onViewLocation,
  formatMediaUrl,
}) => {
  const isMe = item.senderId === userInfo?._id;
  
  // 安全检查
  if (!item || !userInfo) {
    console.warn('MessageRenderer: 缺少必要的props');
    return null;
  }
  
  // 调试日志已清理 - 渲染消息详情
  
  // 如果是通话记录
  if (item.isCallRecord) {
    // 调试日志已清理 - 通话记录消息
    
    // 判断是否是拨出的电话（我是通话发起者）
    const isOutgoing = item.callerId === userInfo?._id;
    
    // 使用与普通消息相同的逻辑：根据senderId决定显示位置
    // 这样通话记录会像普通消息一样，根据发送者显示在左侧或右侧
    const callRecordIsMe = item.senderId === userInfo?._id;
    
    // 调试日志已清理 - 通话记录显示位置
    
    return (
      <CallRecordItem 
        isMe={callRecordIsMe}
        timestamp={item.timestamp}
        duration={item.callDuration}
        missed={item.missed}
        rejected={item.rejected}
        isOutgoing={isOutgoing}
      />
    );
  }
  
  // 如果是语音消息
  if (item.messageType === 'voice' || item.contentType === 'voice') {
    // 优先使用voiceUrl，如果不存在则尝试使用fileUrl
    const audioUrl = item.voiceUrl || item.fileUrl || '';
    if (audioUrl) {
      const fullAudioUrl = formatMediaUrl(audioUrl);
      // 调试日志已清理 - 语音消息URL
      return (
        <VoiceMessageItem 
          audioUrl={fullAudioUrl}
          duration={item.voiceDuration || '00:00'}
          isMe={isMe}
          timestamp={item.timestamp}
        />
      );
    }
  }
  
  // 如果是图片消息
  if (item.messageType === 'image' || item.contentType === 'image') {
    // 优先使用imageUrl，如果不存在则尝试使用fileUrl
    const imageUrl = item.imageUrl || item.fileUrl || '';
    if (imageUrl) {
      const fullImageUrl = formatMediaUrl(imageUrl);
      // 调试日志已清理 - 图片消息URL
      return (
        <ImageMessageItem
          imageUrl={fullImageUrl}
          timestamp={item.timestamp}
          isMe={isMe}
          onPress={onOpenFullscreenImage}
        />
      );
    }
  }
  
  // 如果是视频消息
  if (item.messageType === 'video' || item.contentType === 'video') {
    // 如果是上传中的视频
    if (item.isUploading) {
      return (
        <VideoMessageItem
          // iOS 自发视频上传中：内部会优先用 localFileUri
          videoUrl={formatMediaUrl(item.videoUrl || item.fileUrl || item.localFileUri || '')}
          timestamp={item.timestamp}
          isMe={isMe}
          videoDuration={item.videoDuration}
          onPress={() => {}}
          isUploading={true}
          uploadProgress={item.uploadProgress || 0}
          localFileUri={item.localFileUri}
        />
      );
    }
    
    // 已上传完成的视频
    // 优先使用videoUrl，如果不存在则尝试使用fileUrl
    const videoUrl = item.videoUrl || item.fileUrl || '';
    if (videoUrl) {
      const fullVideoUrl = formatMediaUrl(videoUrl);
      // 调试日志已清理 - 视频消息URL
      return (
        <VideoMessageItem
          videoUrl={fullVideoUrl}
          timestamp={item.timestamp}
          isMe={isMe}
          videoDuration={item.videoDuration}
          onPress={(url) => {
            // 使用应用内视频播放器
            onOpenFullscreenVideo(url);
          }}
          localFileUri={item.localFileUri}
        />
      );
    }
  }
  
  // 如果是位置消息
  if (item.messageType === 'location' || item.contentType === 'location') {
    if (item.latitude && item.longitude) {
      return (
        <LocationMessageItem
          latitude={item.latitude}
          longitude={item.longitude}
          locationName={item.locationName}
          address={item.address}
          timestamp={item.timestamp}
          isMe={isMe}
          onPress={onViewLocation ? () => onViewLocation({
            latitude: item.latitude!,
            longitude: item.longitude!,
            locationName: item.locationName,
            address: item.address,
          }) : undefined}
        />
      );
    }
  }
  
  // 文本消息
  return (
    <TextMessageItem
      content={item.content}
      timestamp={item.timestamp}
      isMe={isMe}
    />
  );
};

// 使用memo优化渲染性能，避免不必要的重渲染
export default memo(MessageRenderer, (prevProps, nextProps) => {
  // 只有关键属性变化时才重新渲染
  return (
    prevProps.item._id === nextProps.item._id &&
    prevProps.item.content === nextProps.item.content &&
    prevProps.item.isUploading === nextProps.item.isUploading &&
    prevProps.item.uploadProgress === nextProps.item.uploadProgress &&
    prevProps.userInfo?._id === nextProps.userInfo?._id
  );
}); 