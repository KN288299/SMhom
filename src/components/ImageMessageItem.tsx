import React, { useState, useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
  StyleSheet,
} from 'react-native';
import { DEFAULT_AVATAR } from '../utils/DefaultAvatar';

// 常量定义
const CONSTANTS = {
  MAX_IMAGE_SIZE: 240,
  MIN_IMAGE_SIZE: 120,
  DEFAULT_IMAGE_WIDTH: 200,
  DEFAULT_IMAGE_HEIGHT: 150,
  FADE_DURATION: 200,
};

// 工具函数
const formatMessageTime = (timestamp: Date): string => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const calculateImageSize = (width: number, height: number) => {
  const aspectRatio = width / height;
  const { MAX_IMAGE_SIZE, MIN_IMAGE_SIZE } = CONSTANTS;
  
  let newWidth, newHeight;
  
  if (aspectRatio > 1) {
    // 宽图
    newWidth = Math.min(width, MAX_IMAGE_SIZE);
    newHeight = newWidth / aspectRatio;
  } else {
    // 长图
    newHeight = Math.min(height, MAX_IMAGE_SIZE);
    newWidth = newHeight * aspectRatio;
  }
  
  // 确保最小尺寸
  newWidth = Math.max(newWidth, MIN_IMAGE_SIZE);
  newHeight = Math.max(newHeight, MIN_IMAGE_SIZE);
  
  return { width: newWidth, height: newHeight };
};

interface ImageMessageItemProps {
  imageUrl: string;
  timestamp: Date;
  isMe: boolean;
  onPress: (url: string) => void;
  contactAvatar?: string | null;
}

const ImageMessageItem: React.FC<ImageMessageItemProps> = ({ 
  imageUrl, 
  timestamp, 
  isMe, 
  onPress,
  contactAvatar
}) => {
  const [imageWidth, setImageWidth] = useState(CONSTANTS.DEFAULT_IMAGE_WIDTH);
  const [imageHeight, setImageHeight] = useState(CONSTANTS.DEFAULT_IMAGE_HEIGHT);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // 获取图片尺寸 - 添加防抖逻辑
  useEffect(() => {
    let isMounted = true;
    
    if (!imageUrl) {
      return;
    }
    
    setLoading(true);
    fadeAnim.setValue(0);
    
    Image.getSize(
      imageUrl,
      (width, height) => {
        if (!isMounted) return;
        const { width: newWidth, height: newHeight } = calculateImageSize(width, height);
        setImageWidth(newWidth);
        setImageHeight(newHeight);
      },
      (error) => {
        if (!isMounted) return;
        console.error('获取图片尺寸失败:', error);
        // 使用默认尺寸
        setImageWidth(CONSTANTS.DEFAULT_IMAGE_WIDTH);
        setImageHeight(CONSTANTS.DEFAULT_IMAGE_HEIGHT);
      }
    );
    
    return () => {
      isMounted = false;
    };
  }, [imageUrl, fadeAnim]);
  
  const onImageLoad = () => {
    setLoading(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: CONSTANTS.FADE_DURATION,
      useNativeDriver: true
    }).start();
  };
  
  // 渲染头像
  const renderAvatar = () => {
    if (contactAvatar) {
      return <Image source={{ uri: contactAvatar }} style={styles.avatar} />;
    } else {
      return <Image source={DEFAULT_AVATAR} style={styles.avatar} />;
    }
  };

  return (
    <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.otherMessage]}>
      {/* 显示对方头像（非自己的消息） */}
      {!isMe && (
        <View style={styles.avatarContainer}>
          {renderAvatar()}
        </View>
      )}
      
      <View style={styles.messageContent}>
        <View style={styles.imageWithTime}>
          <TouchableOpacity 
            style={[
              styles.imageBubble,
              { width: imageWidth + 6, height: imageHeight + 6 } // 加上padding
            ]}
            onPress={() => onPress(imageUrl)}
            activeOpacity={0.8}
          >
            {loading && (
              <View style={[styles.imageLoadingContainer, { width: imageWidth, height: imageHeight }]}>
                <ActivityIndicator size="small" color="#999" />
              </View>
            )}
            <Animated.View style={{ opacity: fadeAnim }}>
              <Image 
                source={{ 
                  uri: imageUrl,
                  cache: 'force-cache' // 强制使用缓存
                }}
                style={[styles.messageImage, { width: imageWidth, height: imageHeight }]}
                resizeMode="cover"
                onLoad={onImageLoad}
                onError={(error) => {
                  console.error('图片加载错误:', {
                    error: error.nativeEvent.error,
                    source: imageUrl
                  });
                  setLoading(false);
                }}
                // 添加缓存相关优化
                defaultSource={undefined} // 不使用默认图片，避免闪烁
                progressiveRenderingEnabled={false} // 禁用渐进式渲染，避免闪烁
                fadeDuration={0} // 禁用淡入动画，避免闪烁
              />
            </Animated.View>
          </TouchableOpacity>
          <Text style={[styles.messageTime, isMe ? styles.myMessageTime : styles.otherMessageTime]}>
            {formatMessageTime(timestamp)}
          </Text>
        </View>
      </View>

      {/* 显示自己头像（自己的消息） */}
      {isMe && (
        <View style={styles.avatarContainer}>
          {renderAvatar()}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 4,
    paddingHorizontal: 16,
    flexDirection: 'row',
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
    width: 35,
    height: 35,
    borderRadius: 17.5,
  },
  messageContent: {
    flex: 1,
    maxWidth: '70%',
  },
  imageWithTime: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  imageBubble: {
    backgroundColor: 'transparent',
    padding: 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageImage: {
    borderRadius: 8,
  },
  imageLoadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    zIndex: 1,
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
    marginLeft: 8,
    marginRight: 8,
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  myMessageTime: {
    textAlign: 'right',
  },
  otherMessageTime: {
    textAlign: 'left',
  },
});

// 使用memo优化，避免不必要的重新渲染
export default memo(ImageMessageItem, (prevProps, nextProps) => {
  // 只有当这些关键属性发生变化时才重新渲染
  return (
    prevProps.imageUrl === nextProps.imageUrl &&
    prevProps.timestamp.getTime() === nextProps.timestamp.getTime() &&
    prevProps.isMe === nextProps.isMe &&
    prevProps.contactAvatar === nextProps.contactAvatar
  );
}); 