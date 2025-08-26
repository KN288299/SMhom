import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Modal,
  StatusBar
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { NavigatorScreenParams } from '@react-navigation/native';
import { TabParamList } from '../navigation/TabNavigator';
import { getStaffDetail, StaffMember } from '../services/staffService';
import { ArrowBackIcon } from '../assets/icons';
import Icon from 'react-native-vector-icons/Ionicons';
import { saveImageToGallery } from '../utils/saveImage';

type StaffDetailRouteProps = {
  StaffDetail: {
    staffId: string;
  };
};

const { width } = Dimensions.get('window');
const PINK_COLOR = '#ff6b81';

const StaffDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<StaffDetailRouteProps, 'StaffDetail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { staffId } = route.params;
  const [loading, setLoading] = useState(true);
  const [staffData, setStaffData] = useState<StaffMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isFullScreenView, setIsFullScreenView] = useState(false);

  // 加载员工详情
  useEffect(() => {
    const loadStaffDetail = async () => {
      try {
        setLoading(true);
        // 添加详细日志
        console.log(`StaffDetailScreen - 准备加载员工详情, staffId: ${staffId}, 类型: ${typeof staffId}`);
        
        // 确保staffId是有效值
        if (!staffId) {
          console.error('StaffDetailScreen - 无效的员工ID');
          setError('无效的员工ID');
          setLoading(false);
          return;
        }
        
        const data = await getStaffDetail(staffId);
        if (data) {
          console.log('StaffDetailScreen - 获取员工详情成功:', data);
          setStaffData(data);
          // 默认选择主照片
          setSelectedPhoto(data.image);
        } else {
          console.error('StaffDetailScreen - 未找到员工详情');
          setError('未找到该员工信息');
        }
      } catch (error) {
        console.error('StaffDetailScreen - 加载员工详情失败:', error);
        setError('加载数据失败');
      } finally {
        setLoading(false);
      }
    };

    loadStaffDetail();
  }, [staffId]);

  // 处理返回
  const handleBack = () => {
    navigation.goBack();
  };

  // 处理照片选择
  const handleSelectPhoto = (photo: string) => {
    setSelectedPhoto(photo);
  };

  // 处理图片点击预览
  const handlePhotoPress = () => {
    setIsFullScreenView(true);
  };

  // 关闭全屏预览
  const closeFullScreenView = () => {
    setIsFullScreenView(false);
  };

  const handleSaveCurrentImage = useCallback(async () => {
    const uri = selectedPhoto || staffData?.image;
    if (!uri) return;
    try {
      await saveImageToGallery(uri);
      console.log('✅ 图片已保存到相册');
    } catch (e) {
      console.log('❌ 保存图片失败:', e);
    }
  }, [selectedPhoto, staffData]);

  // 处理联系客服-约她按钮点击
  const handleContactPress = () => {
    // 跳转到消息页面
    navigation.navigate('MainTabs', { screen: 'Message' });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={PINK_COLOR} />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  if (error || !staffData) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || '加载失败'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 准备所有图片，包括主图和其他照片
  const allPhotos = [
    staffData.image,
    ...(staffData.photos || [])
  ].filter((photo, index, self) => self.indexOf(photo) === index); // 去重

  return (
    <View style={styles.container}>
      {/* 返回按钮 */}
      <TouchableOpacity style={styles.backIconButton} onPress={handleBack}>
        <ArrowBackIcon size={24} />
      </TouchableOpacity>
      
      {/* 主要内容 */}
      <ScrollView style={styles.scrollContainer}>
        {/* 大照片展示区 */}
        <TouchableOpacity 
          style={styles.photoContainer}
          onPress={handlePhotoPress}
          activeOpacity={0.9}
        >
          <Image
            source={{ uri: selectedPhoto || staffData.image }}
            style={styles.mainPhoto}
            resizeMode="cover"
          />
          <View style={styles.photoHintOverlay}>
            <Text style={styles.photoHintText}>点击查看完整图片</Text>
          </View>
        </TouchableOpacity>
        
        {/* 照片选择器 */}
        {allPhotos.length > 1 && (
          <FlatList
            data={allPhotos}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => `photo-${index}`}
            style={styles.photoSelector}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSelectPhoto(item)}
                style={[
                  styles.thumbnailContainer,
                  selectedPhoto === item && styles.selectedThumbnail
                ]}
              >
                <Image
                  source={{ uri: item }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
          />
        )}
        
        {/* 员工信息 */}
        <View style={styles.infoContainer}>
          <View style={styles.header}>
            <View style={styles.nameSection}>
              <Text style={styles.name}>{staffData.name}</Text>
              <Text style={styles.ageJob}>{`${staffData.job} · ${staffData.age}岁`}</Text>
            </View>
            
            <View style={styles.tagContainer}>
              <Text style={styles.tag}>{staffData.tag || '可预约'}</Text>
            </View>
          </View>
          
          {/* 详细信息区 */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>省份</Text>
              <Text style={styles.detailValue}>{staffData.province || '北京市'}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>身高</Text>
              <Text style={styles.detailValue}>
                {staffData.height ? `${staffData.height} cm` : '未提供'}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>体重</Text>
              <Text style={styles.detailValue}>
                {staffData.weight ? `${staffData.weight} kg` : '未提供'}
              </Text>
            </View>
          </View>
          
          {/* 个人介绍 */}
          {staffData.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionTitle}>个人介绍</Text>
              <Text style={styles.descriptionText}>{staffData.description}</Text>
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* 全屏图片预览模态框 */}
      <Modal
        visible={isFullScreenView}
        transparent={true}
        animationType="fade"
        onRequestClose={closeFullScreenView}
      >
        <StatusBar backgroundColor="#000" barStyle="light-content" />
        <View style={styles.fullScreenContainer}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={closeFullScreenView}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.fullScreenSaveButton}
            onPress={handleSaveCurrentImage}
          >
            <Icon name="download" size={24} color="#fff" />
          </TouchableOpacity>
          
          <Image
            source={{ uri: selectedPhoto || staffData?.image }}
            style={styles.fullScreenImage}
            resizeMode="contain"
          />
          
          {/* 缩略图选择器 */}
          {allPhotos && allPhotos.length > 1 && (
            <View style={styles.fullscreenThumbnails}>
              <FlatList
                data={allPhotos}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item, index) => `fullscreen-photo-${index}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => setSelectedPhoto(item)}
                    style={[
                      styles.fullscreenThumbnailContainer,
                      selectedPhoto === item && styles.selectedFullscreenThumbnail
                    ]}
                  >
                    <Image
                      source={{ uri: item }}
                      style={styles.fullscreenThumbnail}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>
      </Modal>
      
      {/* 底部操作区 */}
      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleContactPress}>
          <Text style={styles.actionButtonText}>联系客服-约她</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  errorText: {
    color: '#ff6b81',
    fontSize: 16,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#ff6b81',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  backButtonText: {
    color: 'white',
    fontSize: 14,
  },
  backIconButton: {
    position: 'absolute',
    top: 40,
    left: 10,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.7)',
    padding: 8,
    borderRadius: 20,
  },
  scrollContainer: {
    flex: 1,
  },
  photoContainer: {
    width: '100%',
    height: 400,
  },
  mainPhoto: {
    width: '100%',
    height: '100%',
  },
  photoSelector: {
    marginTop: 10,
    paddingHorizontal: 10,
  },
  thumbnailContainer: {
    marginRight: 10,
    borderRadius: 8,
    padding: 2,
  },
  selectedThumbnail: {
    borderWidth: 2,
    borderColor: '#ff6b81',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },
  infoContainer: {
    padding: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  nameSection: {
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  ageJob: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  tagContainer: {
    backgroundColor: '#ff6b81',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tag: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailsContainer: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'center',
  },
  detailLabel: {
    width: 80,
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
  detailValue: {
    flex: 1,
    fontSize: 16,
    color: '#666',
  },
  descriptionContainer: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  actionContainer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    backgroundColor: '#ff6b81',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // 照片提示覆盖层
  photoHintOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 8,
    alignItems: 'center',
  },
  photoHintText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // 全屏查看模式
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height - 150, // 留出空间给缩略图
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenSaveButton: {
    position: 'absolute',
    top: 40,
    right: 70,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 30,
    fontWeight: 'bold',
  },
  fullscreenThumbnails: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    height: 80,
    paddingHorizontal: 10,
  },
  fullscreenThumbnailContainer: {
    marginHorizontal: 5,
    borderRadius: 8,
    padding: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedFullscreenThumbnail: {
    borderColor: '#ff6b81',
  },
  fullscreenThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },
});

export default StaffDetailScreen; 