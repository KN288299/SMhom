import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Dimensions,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { getPageConfig, PageConfig } from '../services/pageConfigService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const YuZuTangScreen: React.FC = () => {
  const [config, setConfig] = useState<PageConfig | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);

  // 加载页面配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        const pageConfig = await getPageConfig();
        setConfig(pageConfig);
        
        if (pageConfig.bannerImages.length === 0) {
          console.log('📄 [YuZuTang] 暂无轮播图片配置');
        }
      } catch (error) {
        console.error('📄 [YuZuTang] 加载页面配置失败:', error);
        Alert.alert('提示', '加载页面配置失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  // 自动轮播功能
  useEffect(() => {
    if (!config || config.bannerImages.length <= 1) {
      return;
    }

    // 设置自动轮播定时器
    autoScrollTimer.current = setInterval(() => {
      setCurrentImageIndex(prevIndex => {
        const nextIndex = (prevIndex + 1) % config.bannerImages.length;
        // 滚动到下一张图片
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({
            x: nextIndex * screenWidth,
            animated: true,
          });
        }
        return nextIndex;
      });
    }, 3000); // 每3秒切换一次

    // 清理定时器
    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
  }, [config]);

  // 处理手动滑动
  const handleScroll = (event: any) => {
    if (!config || config.bannerImages.length <= 1) return;

    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / screenWidth);
    
    if (newIndex !== currentImageIndex && newIndex >= 0 && newIndex < config.bannerImages.length) {
      setCurrentImageIndex(newIndex);
    }
  };

  // 处理图片点击
  const handleImagePress = (index: number) => {
    console.log(`📄 [YuZuTang] 点击了第${index + 1}张图片`);
    // 这里可以添加图片点击后的处理逻辑
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <ActivityIndicator size="large" color="#ff6b81" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  if (!config || config.bannerImages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <Text style={styles.emptyText}>暂无展示内容</Text>
        <Text style={styles.emptySubText}>请在后台管理系统中上传轮播图片</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* 全屏图片轮播 */}
      <View style={styles.carouselContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.carousel}
        >
          {config.bannerImages.map((imageUrl, index) => (
            <TouchableOpacity
              key={index}
              style={styles.imageContainer}
              activeOpacity={0.9}
              onPress={() => handleImagePress(index)}
            >
              <Image
                source={{ uri: imageUrl }}
                style={styles.carouselImage}
                resizeMode="cover"
                onError={(error) => {
                  console.error(`📄 [YuZuTang] 图片加载失败:`, error.nativeEvent.error);
                }}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 指示器 */}
        {config.bannerImages.length > 1 && (
          <View style={styles.indicatorContainer}>
            {config.bannerImages.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  index === currentImageIndex && styles.activeIndicator,
                ]}
              />
            ))}
          </View>
        )}

        {/* 图片计数器 */}
        {config.bannerImages.length > 1 && (
          <View style={styles.counterContainer}>
            <Text style={styles.counterText}>
              {currentImageIndex + 1} / {config.bannerImages.length}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#333',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  carouselContainer: {
    flex: 1,
    position: 'relative',
  },
  carousel: {
    flex: 1,
  },
  imageContainer: {
    width: screenWidth,
    height: screenHeight,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: '#fff',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  counterContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  counterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default YuZuTangScreen; 