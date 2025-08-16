import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  StatusBar,
  FlatList,
  Platform,
  Alert,
  ToastAndroid,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { HomeIcon, MessageIcon, InfoIcon, UserIcon, PlusIcon, LocationIcon, SearchIcon, OrderIcon } from '../assets/icons/index';
import { getStaffList, StaffMember, StaffQueryParams } from '../services/staffService';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { getOptimizedConnectionStatus } from '../utils/iOSNetworkHelper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../navigation/TabNavigator';
import { PROVINCES } from '../constants/provinces';
import { useAuth } from '../context/AuthContext';
import { iOSMainHeaderStyles, getPlatformStyles } from '../styles/iOSStyles';

// 组合导航类型
type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'StaffDetail'> & 
  BottomTabNavigationProp<TabParamList, 'Home'>;

const { width } = Dimensions.get('window');
const SPACING = 8; // 间距调整为8px
const cardWidth = (width - (SPACING * 3)) / 2; // 2列布局，左右两侧各SPACING，中间SPACING

// 颜色常量
const PINK_COLOR = '#ff6b81';
const PINK_COLOR_ALPHA = 'rgba(255, 107, 129, 0.8)'; // 半透明粉红色

// 默认头像URL
const DEFAULT_AVATAR_URL = 'https://via.placeholder.com/150';

interface UserCardProps {
  staffId: string;
  name: string;
  age: number;
  job: string;
  image: string;
  tag: string;
  onPress: (id: string) => void;
}

// 使用React.memo优化UserCard组件性能
const UserCard = React.memo(({ staffId, name, age, job, image, tag, onPress }: UserCardProps) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    console.error(`图片加载失败: ${image}`);
    setImageError(true);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(staffId)}>
      <Image 
        source={imageError ? { uri: DEFAULT_AVATAR_URL } : { uri: image }}
        style={styles.cardImage}
        onError={handleImageError}
        resizeMode="cover"
      />
      <View style={styles.tagContainer}>
        <Text style={styles.tagText}>{tag}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.userName}>{name}</Text>
        <Text style={styles.userInfo}>{`${job} · ${age}岁`}</Text>
      </View>
    </TouchableOpacity>
  );
});

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { userInfo, isCustomerService } = useAuth();
  const [staffData, setStaffData] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [page, setPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  

  const [selectedProvince, setSelectedProvince] = useState<string>('北京市');
  const [provinceModalVisible, setProvinceModalVisible] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'job' | 'age'>('name');

  // 监控网络状态 - 使用优化的iOS网络检测
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      // 使用优化的网络连接检测
      const connected = getOptimizedConnectionStatus(state);
      
      setIsConnected(connected);
      
      if (!connected) {
        if (Platform.OS === 'android') {
          ToastAndroid.show('网络连接已断开', ToastAndroid.SHORT);
        }
        // iOS会通过ChatScreen的网络监听处理提示
      }
    });

    return () => unsubscribe();
  }, []);

  // 加载员工数据 - 使用React.useCallback优化性能
  const loadStaffData = React.useCallback(async (showFullLoading = true, refresh = false, targetPage?: number) => {
    try {
      if (refresh) {
        setPage(1);
      }
      
      if (showFullLoading) setLoading(true);
      setError(null);

      // 检查网络状态
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        throw new Error('网络连接断开，请检查网络设置后重试');
      }

      const currentPage = refresh ? 1 : (targetPage || page);
      const queryParams: StaffQueryParams = { 
        page: currentPage, 
        limit: 10, 
        province: selectedProvince
      };
      
      // 添加搜索参数
      if (searchQuery) {
        if (searchType === 'name') {
          queryParams.search = searchQuery;
        } else if (searchType === 'job') {
          queryParams.job = searchQuery;
        } else if (searchType === 'age') {
          // 检查年龄是否为数字
          const age = parseInt(searchQuery);
          if (!isNaN(age)) {
            queryParams.age = age;
          }
        }
      }
      
      const data = await getStaffList(queryParams);
      
      if (data.length === 0 && currentPage === 1) {
        setError('暂无员工数据');
      }
      
      if (refresh) {
        setStaffData(data);
      } else if (currentPage === 1) {
        setStaffData(data);
      } else {
        setStaffData(prevData => {
          const newData = [...prevData, ...data];
          return newData;
        });
      }
      
      // 判断是否有更多数据
      setHasMoreData(data.length === 10);
      
    } catch (error) {
      console.error('加载员工数据失败:', error);
      setError(error instanceof Error ? error.message : '加载数据失败，请稍后重试');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [selectedProvince, searchQuery, searchType]); // 移除page依赖

  // 省份变更后重新加载数据
  useEffect(() => {
    loadStaffData(true, true);
  }, [selectedProvince]); // 移除loadStaffData依赖

  // 下拉刷新
  const handleRefresh = React.useCallback(() => {
    setRefreshing(true);
    // 重新加载数据，保留当前筛选条件
    loadStaffData(false, true, 1);
  }, [loadStaffData]);

  // 加载更多数据
  const handleLoadMore = React.useCallback(() => {
    if (!hasMoreData || loading || loadingMore) return;
    
    setLoadingMore(true);
    setPage(prevPage => {
      const newPage = prevPage + 1;
      // 直接调用loadStaffData并传递目标页码
      loadStaffData(false, false, newPage);
      return newPage;
    });
  }, [hasMoreData, loading, loadingMore, loadStaffData]);

  // 重试加载数据
  const handleRetry = React.useCallback(() => {
    loadStaffData(true, true, 1);
  }, [loadStaffData]);

  // 处理卡片点击
  const handleCardPress = React.useCallback((staffId: string) => {
    // 检查ID格式，确保它是MongoDB的_id或普通id
    const id = staffId || '';
    navigation.navigate('StaffDetail', { staffId: id });
  }, [navigation]);

  // 渲染底部导航 - 使用React.memo优化
  const BottomNavBar = React.memo(() => (
    <View style={styles.tabBar}>
      <TouchableOpacity style={styles.tabItem}>
        <HomeIcon size={24} active={true} />
        <Text style={[styles.tabText, styles.activeTab]}>首页</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.tabItem}
        onPress={() => navigation.navigate('Order')}
      >
        <OrderIcon size={24} />
        <Text style={styles.tabText}>订单</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tabItemCenter}>
        <View style={styles.tabIconPlus}>
          <PlusIcon size={30} />
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tabItem}>
        <MessageIcon size={24} />
        <Text style={styles.tabText}>消息</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tabItem}>
        <UserIcon size={24} />
        <Text style={styles.tabText}>我的</Text>
      </TouchableOpacity>
    </View>
  ));

  // 渲染单个项目
  const renderItem = React.useCallback(({ item }: { item: StaffMember }) => {
    // 尝试获取MongoDB的_id，如果不存在则使用普通id
    const staffId = (item as any)._id || item.id;
    
    return (
      <UserCard
        staffId={staffId}
        name={item.name}
        age={item.age}
        job={item.job}
        image={item.image}
        tag={item.tag || '可预约'}
        onPress={handleCardPress}
      />
    );
  }, [handleCardPress]);

  // 渲染错误状态
  const renderErrorState = React.useCallback(() => (
    <View style={styles.centerContainer}>
      <Text style={styles.errorText}>{error || '加载失败'}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
        <Text style={styles.retryButtonText}>重试</Text>
      </TouchableOpacity>
    </View>
  ), [error, handleRetry]);

  // 渲染无网络状态
  const renderNoConnectionState = React.useCallback(() => (
    <View style={styles.centerContainer}>
      <Text style={styles.errorText}>网络连接断开</Text>
      <Text style={styles.errorSubText}>请检查网络设置后重试</Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
        <Text style={styles.retryButtonText}>重试</Text>
      </TouchableOpacity>
    </View>
  ), [handleRetry]);

  // 渲染底部加载状态
  const renderFooter = React.useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerContainer}>
        <ActivityIndicator size="small" color={PINK_COLOR} />
        <Text style={styles.footerText}>正在加载更多...</Text>
      </View>
    );
  }, [loadingMore]);

  // 处理省份选择
  const handleProvinceSelect = React.useCallback((province: string) => {
    setSelectedProvince(province);
    setProvinceModalVisible(false);
  }, []);

  // 处理搜索提交
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      // 如果搜索内容为空，显示提示
      if (Platform.OS === 'android') {
        ToastAndroid.show('请输入搜索内容', ToastAndroid.SHORT);
      } else {
        Alert.alert('请输入搜索内容');
      }
      return;
    }
    
    setSearchModalVisible(false);
    loadStaffData(true, true, 1);
  };

  // 切换搜索类型
  const toggleSearchType = (type: 'name' | 'job' | 'age') => {
    setSearchType(type);
  };

  // 搜索框关闭时重置搜索
  const handleCloseSearch = () => {
    // 如果有搜索内容且关闭，则重置搜索并重新加载数据
    if (searchQuery) {
      setSearchQuery('');
      loadStaffData(true, true, 1);
    }
    setSearchModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* 顶部导航栏 */}
      <View style={getPlatformStyles(iOSMainHeaderStyles.headerContainer, styles.header)}>
        <Text style={getPlatformStyles(iOSMainHeaderStyles.headerTitle, styles.headerTitle)}>推荐</Text>
        <View style={getPlatformStyles(iOSMainHeaderStyles.headerRight, styles.headerRight)}>
          <TouchableOpacity 
            style={getPlatformStyles(iOSMainHeaderStyles.locationButton, styles.locationButton)}
            onPress={() => setProvinceModalVisible(true)}
            activeOpacity={0.6}
          >
            <LocationIcon size={Platform.OS === 'ios' ? 16 : 14} />
            <Text style={getPlatformStyles(iOSMainHeaderStyles.locationText, styles.locationText)}>{selectedProvince}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={getPlatformStyles(iOSMainHeaderStyles.searchButton, styles.searchButton)}
            onPress={() => setSearchModalVisible(true)}
            activeOpacity={0.6}
          >
            <SearchIcon size={Platform.OS === 'ios' ? 24 : 20} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* 省份选择模态框 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={provinceModalVisible}
        onRequestClose={() => setProvinceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>选择地区</Text>
              <TouchableOpacity onPress={() => setProvinceModalVisible(false)}>
                <Text style={styles.modalCloseText}>关闭</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.provinceList}>
              {PROVINCES.map((province) => (
                <TouchableOpacity
                  key={province}
                  style={[
                    styles.provinceItem,
                    selectedProvince === province && styles.selectedProvinceItem,
                  ]}
                  onPress={() => handleProvinceSelect(province)}
                >
                  <Text
                    style={[
                      styles.provinceText,
                      selectedProvince === province && styles.selectedProvinceText,
                    ]}
                  >
                    {province}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* 搜索模态框 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={searchModalVisible}
        onRequestClose={handleCloseSearch}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>搜索员工</Text>
              <TouchableOpacity onPress={handleCloseSearch}>
                <Text style={styles.modalCloseText}>关闭</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              {/* 搜索类型选择器 */}
              <View style={styles.searchTypeContainer}>
                <TouchableOpacity 
                  style={[
                    styles.searchTypeButton, 
                    searchType === 'name' && styles.activeSearchTypeButton
                  ]}
                  onPress={() => toggleSearchType('name')}
                >
                  <Text style={[
                    styles.searchTypeText,
                    searchType === 'name' && styles.activeSearchTypeText
                  ]}>姓名</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.searchTypeButton, 
                    searchType === 'job' && styles.activeSearchTypeButton
                  ]}
                  onPress={() => toggleSearchType('job')}
                >
                  <Text style={[
                    styles.searchTypeText,
                    searchType === 'job' && styles.activeSearchTypeText
                  ]}>职业</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.searchTypeButton, 
                    searchType === 'age' && styles.activeSearchTypeButton
                  ]}
                  onPress={() => toggleSearchType('age')}
                >
                  <Text style={[
                    styles.searchTypeText,
                    searchType === 'age' && styles.activeSearchTypeText
                  ]}>年龄</Text>
                </TouchableOpacity>
              </View>
              
              {/* 搜索输入框 */}
              <View style={styles.searchInputContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder={
                    searchType === 'name' ? "输入员工姓名..." :
                    searchType === 'job' ? "输入职业类型..." :
                    "输入准确年龄..."
                  }
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  keyboardType={searchType === 'age' ? 'numeric' : 'default'}
                />
              </View>
              
              {/* 搜索按钮 */}
              <TouchableOpacity 
                style={styles.searchSubmitButton}
                onPress={handleSearch}
              >
                <Text style={styles.searchSubmitText}>搜索</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* 内容区域 */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={PINK_COLOR} />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      ) : !isConnected ? (
        renderNoConnectionState()
      ) : error ? (
        renderErrorState()
      ) : (
        <>
          {/* 添加搜索状态提示 */}
          {searchQuery ? (
            <View style={styles.searchStatusContainer}>
              <Text style={styles.searchStatusText}>
                搜索{searchType === 'name' ? '姓名' : 
                 searchType === 'job' ? '职业' : '年龄'}: 
                <Text style={styles.searchQueryText}> {searchQuery}</Text>
              </Text>
              <TouchableOpacity 
                style={styles.clearSearchButton}
                onPress={() => {
                  setSearchQuery('');
                  loadStaffData(true, true, 1);
                }}
              >
                <Text style={styles.clearSearchText}>清除</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          

          
          <FlatList
            data={staffData}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.flatListContent}
            showsVerticalScrollIndicator={false}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.1}
            ListFooterComponent={renderFooter}
            initialNumToRender={6} // 增加初始渲染数量
            maxToRenderPerBatch={6} // 增加每批次渲染数量
            windowSize={10} // 增加窗口大小
            removeClippedSubviews={true} // 移除不可见的视图
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>暂无员工数据</Text>
              </View>
            }
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerSection: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  nameText: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  header: {
    height: 80,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 30,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 10,
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 3,
  },
  searchButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorText: {
    color: '#ff6b81',
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubText: {
    color: '#999',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: PINK_COLOR,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
  flatListContent: {
    padding: SPACING,
    paddingBottom: 80, // 为底部导航栏留出足够空间
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: SPACING, 
  },
  card: {
    width: cardWidth,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  cardImage: {
    width: '100%',
    height: cardWidth * 1.2,
    resizeMode: 'cover',
  },
  tagContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: PINK_COLOR_ALPHA,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    color: '#fff',
    fontSize: 12,
  },
  cardInfo: {
    padding: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  userInfo: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  tabBar: {
    height: 60,
    backgroundColor: '#fff',
    flexDirection: 'row',
    borderTopColor: '#eee',
    borderTopWidth: 1,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabItemCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconPlus: {
    width: 44,
    height: 44,
    backgroundColor: PINK_COLOR,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  activeTab: {
    color: PINK_COLOR,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseText: {
    fontSize: 16,
    color: PINK_COLOR,
  },
  provinceList: {
    flexGrow: 1,
    maxHeight: 400, // 保证能滚动到底部，必要时可调整
    padding: 10,
  },
  provinceItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedProvinceItem: {
    backgroundColor: '#fff5f7',
  },
  provinceText: {
    fontSize: 16,
    color: '#333',
  },
  selectedProvinceText: {
    color: PINK_COLOR,
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 15,
  },
  searchTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  searchTypeButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#f2f2f2',
  },
  activeSearchTypeButton: {
    backgroundColor: PINK_COLOR,
  },
  searchTypeText: {
    fontSize: 14,
    color: '#666',
  },
  activeSearchTypeText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  searchInputContainer: {
    marginBottom: 20,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  searchSubmitButton: {
    backgroundColor: PINK_COLOR,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  searchSubmitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#FFF5F7',
    marginHorizontal: 10,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFDCE5',
  },
  searchStatusText: {
    fontSize: 14,
    color: '#666',
  },
  searchQueryText: {
    color: PINK_COLOR,
    fontWeight: 'bold',
  },
  clearSearchButton: {
    backgroundColor: PINK_COLOR,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
  },
  clearSearchText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default HomeScreen; 