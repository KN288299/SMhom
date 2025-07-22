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
}

const ImageMessageItem: React.FC<ImageMessageItemProps> = ({ 
  imageUrl, 
  timestamp, 
  isMe, 
  onPress 
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
  
  return (
    <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.otherMessage]}>
      <TouchableOpacity 
        style={[
          styles.messageBubble, 
          isMe ? styles.myBubble : styles.otherBubble, 
          styles.imageBubble,
          { width: imageWidth + 6, height: imageHeight + 6 } // 加上padding
        ]}
        onPress={() => onPress(imageUrl)}
        activeOpacity={0.8}
      >
        {loading && (
          <View style={[styles.imageLoadingContainer, { width: imageWidth, height: imageHeight }]}>
            <ActivityIndicator size="small" color="#ff6b81" />
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
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 4,
    marginHorizontal: 16,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    padding: 3,
    maxWidth: '80%',
  },
  myBubble: {
    backgroundColor: '#ff6b81',
  },
  otherBubble: {
    backgroundColor: '#f5f5f5',
  },
  imageBubble: {
    backgroundColor: 'transparent',
    padding: 0,
    overflow: 'hidden',
  },
  messageImage: {
    borderRadius: 12,
  },
  imageLoadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    zIndex: 1,
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    marginHorizontal: 4,
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
    prevProps.isMe === nextProps.isMe
  );
}); 