import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Image,
  Alert,
  Modal,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { HomeIcon, MessageIcon, OrderIcon, UserIcon, PlusIcon } from '../assets/icons/index';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../navigation/TabNavigator';
import { getUserOrders, cancelOrder, Order as OrderType, getOrderDetail } from '../services/orderService';

// 组合导航类型
type OrderScreenNavigationProp = NativeStackNavigationProp<RootStackParamList> & 
  BottomTabNavigationProp<TabParamList, 'Order'>;

// 状态文本和颜色映射
const statusConfig = {
  pending: { text: '待接单', color: '#ff9800' },
  accepted: { text: '已接单', color: '#2196f3' },
  completed: { text: '已完成', color: '#4caf50' },
  cancelled: { text: '已取消', color: '#f44336' },
};

const OrderScreen: React.FC = () => {
  const navigation = useNavigation<OrderScreenNavigationProp>();
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  
  // 订单详情相关状态
  const [selectedOrder, setSelectedOrder] = useState<OrderType | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // 加载订单数据 - 使用React.useCallback优化性能
  const loadOrders = React.useCallback(async (refresh: boolean = false) => {
    try {
      if (refresh) {
        setPage(1);
      }
      
      setError(null);
      const currentPage = refresh ? 1 : page;
      
      const response = await getUserOrders({
        page: currentPage,
        limit: 10,
      });
      
      if (response.orders.length === 0 && currentPage === 1) {
        // 没有订单数据
        setOrders([]);
      } else if (refresh) {
        setOrders(response.orders);
      } else {
        // 追加数据
        setOrders(prevOrders => [...prevOrders, ...response.orders]);
      }
      
      setTotalPages(response.pages);
      
    } catch (error) {
      console.error('加载订单数据失败:', error);
      setError('加载订单数据失败，请稍后重试');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page]);

  // 首次加载数据
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // 处理刷新
  const handleRefresh = () => {
    setRefreshing(true);
    loadOrders(true);
  };

  // 加载更多
  const handleLoadMore = () => {
    if (page < totalPages && !loading) {
      setPage(prevPage => prevPage + 1);
    }
  };

  // 查看订单详情
  const handleViewOrderDetail = async (orderId: string) => {
    try {
      setDetailLoading(true);
      const orderDetail = await getOrderDetail(orderId);
      setSelectedOrder(orderDetail);
      setShowDetailModal(true);
    } catch (error) {
      console.error('获取订单详情失败:', error);
      Alert.alert('错误', '获取订单详情失败，请稍后重试');
    } finally {
      setDetailLoading(false);
    }
  };

  // 处理取消订单
  const handleCancelOrder = (orderId: string) => {
    Alert.alert(
      '取消订单',
      '确定要取消这个订单吗？',
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '确定', 
          onPress: async () => {
            try {
              setLoading(true);
              await cancelOrder(orderId);
              // 刷新订单列表
              await loadOrders(true);
              Alert.alert('成功', '订单已取消');
            } catch (error) {
              console.error('取消订单失败:', error);
              Alert.alert('错误', '取消订单失败，请稍后重试');
            } finally {
              setLoading(false);
            }
          } 
        }
      ]
    );
  };

  // 渲染订单项 - 使用React.memo优化性能
  const OrderItem = React.memo(({ item }: { item: OrderType }) => {
    const statusInfo = statusConfig[item.status as keyof typeof statusConfig];
    
    // 格式化日期时间显示
    const formatDateTime = (dateTimeStr: string) => {
      const date = new Date(dateTimeStr);
      return {
        date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
        time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      };
    };
    
    const dateTime = formatDateTime(item.appointmentTime);
    
    return (
      <TouchableOpacity 
        style={styles.orderCard}
        onPress={() => handleViewOrderDetail(item.id)}
      >
        <View style={styles.orderHeader}>
          <Text style={styles.orderNumber}>订单号: {item.orderNumber}</Text>
          <View style={[styles.statusTag, { backgroundColor: statusInfo.color + '20' }]}>
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.text}
            </Text>
          </View>
        </View>

        <View style={styles.orderInfo}>
          <Text style={styles.serviceType}>{item.serviceType}</Text>
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>预约日期:</Text>
              <Text style={styles.infoValue}>{dateTime.date}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>预约时间:</Text>
              <Text style={styles.infoValue}>{dateTime.time}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>服务价格:</Text>
              <Text style={styles.orderPrice}>¥{item.price.toFixed(2)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>订单创建:</Text>
              <Text style={styles.infoValue}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
          </View>
          
          <View style={styles.addressContainer}>
            <Text style={styles.infoLabel}>服务地址:</Text>
            <Text style={styles.addressText}>{item.address}</Text>
          </View>
          
          {item.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.infoLabel}>备注信息:</Text>
              <Text style={styles.notesText}>{item.notes}</Text>
            </View>
          )}
        </View>

        {(item.staff || item.staffName) && (
          <View style={styles.staffInfo}>
            <Image 
              source={{ uri: item.staff?.image || item.staffImage || 'https://via.placeholder.com/150' }}
              style={styles.staffImage}
              resizeMode="cover"
            />
            <View style={styles.staffDetails}>
              <Text style={styles.staffName}>{item.staff?.name || item.staffName || '未分配员工'}</Text>
              {item.staff?.job && <Text style={styles.staffJob}>{item.staff.job}</Text>}
            </View>
          </View>
        )}

        <View style={styles.buttonContainer}>
          {item.status === 'pending' && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleCancelOrder(item.id)}
            >
              <Text style={styles.cancelButtonText}>取消订单</Text>
            </TouchableOpacity>
          )}
          {(item.status === 'accepted' || item.status === 'pending') && (
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>联系客服</Text>
            </TouchableOpacity>
          )}
          {item.status === 'completed' && (
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>评价服务</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  });

  // 订单详情模态框
  const OrderDetailModal = () => {
    if (!selectedOrder) return null;
    
    const statusInfo = statusConfig[selectedOrder.status as keyof typeof statusConfig];
    const dateTime = new Date(selectedOrder.appointmentTime).toLocaleString('zh-CN');
    
    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>订单详情</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowDetailModal(false)}
              >
                <Text style={styles.closeButtonText}>关闭</Text>
              </TouchableOpacity>
            </View>
            
            {detailLoading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#ff6b81" />
                <Text style={styles.loadingText}>加载订单详情...</Text>
              </View>
            ) : (
              <ScrollView style={styles.modalScrollView}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>基本信息</Text>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>订单号:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.orderNumber}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>服务类型:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.serviceType}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>订单状态:</Text>
                    <View style={[styles.statusTag, { backgroundColor: statusInfo.color + '20' }]}>
                      <Text style={[styles.statusText, { color: statusInfo.color }]}>
                        {statusInfo.text}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>预约时间:</Text>
                    <Text style={styles.detailValue}>{dateTime}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>服务价格:</Text>
                    <Text style={styles.orderPrice}>¥{selectedOrder.price.toFixed(2)}</Text>
                  </View>
                </View>
                
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>服务地址</Text>
                  <Text style={styles.detailAddress}>{selectedOrder.address}</Text>
                </View>
                
                {selectedOrder.notes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>备注信息</Text>
                    <Text style={styles.detailNotes}>{selectedOrder.notes}</Text>
                  </View>
                )}
                
                {(selectedOrder.staff || selectedOrder.staffName) && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>服务人员</Text>
                    <View style={styles.staffInfoDetail}>
                      <Image 
                        source={{ uri: selectedOrder.staff?.image || selectedOrder.staffImage || 'https://via.placeholder.com/150' }}
                        style={styles.staffImageDetail}
                        resizeMode="cover"
                      />
                      <View style={styles.staffDetailsDetail}>
                        <Text style={styles.staffNameDetail}>{selectedOrder.staff?.name || selectedOrder.staffName || '未分配员工'}</Text>
                        {selectedOrder.staff?.job && <Text style={styles.staffJobDetail}>{selectedOrder.staff.job}</Text>}
                      </View>
                    </View>
                  </View>
                )}
                
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>订单时间</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>创建时间:</Text>
                    <Text style={styles.detailValue}>{new Date(selectedOrder.createdAt).toLocaleString('zh-CN')}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>更新时间:</Text>
                    <Text style={styles.detailValue}>{new Date(selectedOrder.updatedAt).toLocaleString('zh-CN')}</Text>
                  </View>
                </View>
                
                <View style={styles.modalActions}>
                  {selectedOrder.status === 'pending' && (
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.cancelButtonModal]}
                      onPress={() => {
                        setShowDetailModal(false);
                        setTimeout(() => handleCancelOrder(selectedOrder.id), 500);
                      }}
                    >
                      <Text style={styles.cancelButtonText}>取消订单</Text>
                    </TouchableOpacity>
                  )}
                  {(selectedOrder.status === 'accepted' || selectedOrder.status === 'pending') && (
                    <TouchableOpacity style={styles.modalButton}>
                      <Text style={styles.modalButtonText}>联系客服</Text>
                    </TouchableOpacity>
                  )}
                  {selectedOrder.status === 'completed' && (
                    <TouchableOpacity style={styles.modalButton}>
                      <Text style={styles.modalButtonText}>评价服务</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  // 渲染加载状态
  if (loading && !refreshing && orders.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#ff6b81" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* 顶部标题 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>我的订单</Text>
      </View>
      
      {/* 订单列表 */}
      <FlatList
        data={orders}
        renderItem={({ item }) => <OrderItem item={item} />}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.ordersList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            colors={['#ff6b81']} 
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        ListFooterComponent={
          page < totalPages ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator size="small" color="#ff6b81" />
              <Text style={styles.footerText}>加载更多...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {error ? error : '暂无订单'}
            </Text>
            {error && (
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={() => loadOrders(true)}
              >
                <Text style={styles.retryButtonText}>重试</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
      
      {/* 订单详情模态框 */}
      <OrderDetailModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    height: 80,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 30, // 为状态栏留出空间
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  ordersList: {
    padding: 10,
    paddingBottom: 80, // 为底部导航栏留出足够空间
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderNumber: {
    fontSize: 13,
    color: '#666',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  orderInfo: {
    marginBottom: 12,
  },
  serviceType: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 5,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  orderPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff6b81',
  },
  addressContainer: {
    marginTop: 4,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 5,
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
    lineHeight: 20,
  },
  notesContainer: {
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 5,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
    fontStyle: 'italic',
  },
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  staffImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  staffDetails: {
    flexDirection: 'column',
  },
  staffName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  staffJob: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  actionButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    backgroundColor: '#ff6b81',
    marginLeft: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 13,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#ff6b81',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  footerLoading: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    margin: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  modalScrollView: {
    flex: 1,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  detailAddress: {
    fontSize: 14,
    color: '#333',
    marginTop: 5,
  },
  detailNotes: {
    fontSize: 14,
    color: '#333',
    marginTop: 5,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    padding: 15,
    borderRadius: 15,
    backgroundColor: '#ff6b81',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  cancelButtonModal: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  staffInfoDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  staffImageDetail: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  staffDetailsDetail: {
    flexDirection: 'column',
  },
  staffNameDetail: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  staffJobDetail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});

export default OrderScreen; 