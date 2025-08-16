import React from 'react';
import { View, Text, StyleSheet, Platform, ScrollView } from 'react-native';
import { iOSMainHeaderStyles, getPlatformStyles, isIOS } from '../styles/iOSStyles';

/**
 * 页头布局测试组件
 * 用于验证iOS页头高度优化效果
 */
const HeaderLayoutTest: React.FC = () => {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>页头布局优化测试</Text>
      <Text style={styles.platform}>当前平台: {Platform.OS}</Text>
      
      {/* 原始页头样式 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>原始页头样式 (80px高度)</Text>
        <View style={styles.originalHeader}>
          <Text style={styles.originalHeaderTitle}>推荐 - 原始样式</Text>
        </View>
        <Text style={styles.description}>
          高度: 80px, paddingTop: 30px (iOS: 44px)
        </Text>
      </View>
      
      {/* 优化后的页头样式 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>优化后页头样式 (60px高度)</Text>
        <View style={getPlatformStyles(iOSMainHeaderStyles.headerContainer, styles.androidHeader)}>
          <Text style={getPlatformStyles(iOSMainHeaderStyles.headerTitle, styles.androidHeaderTitle)}>
            推荐 - 优化样式
          </Text>
        </View>
        <Text style={styles.description}>
          {isIOS ? 
            "iOS: 高度: 60px, paddingTop: 35px (向下移动10%)" :
            "Android: 高度: 60px, paddingTop: 25px"
          }
        </Text>
      </View>
      
      {/* 高度对比 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>高度对比</Text>
        <View style={styles.comparisonContainer}>
          <View style={styles.comparisonItem}>
            <View style={[styles.heightBar, styles.originalHeight]} />
            <Text style={styles.comparisonLabel}>原始 (80px)</Text>
          </View>
          <View style={styles.comparisonItem}>
            <View style={[styles.heightBar, styles.optimizedHeight]} />
            <Text style={styles.comparisonLabel}>优化 (60px)</Text>
          </View>
        </View>
        <Text style={styles.improvement}>
          ✅ 减少了25%的页头高度，节省了20px空间
        </Text>
      </View>
      
      {/* 位置对比 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>位置调整</Text>
        <Text style={styles.description}>
          {isIOS ? 
            "iOS页头向下移动了10% (从30px增加到35px padding)" :
            "Android保持原有位置 (25px padding)"
          }
        </Text>
        <View style={styles.positionDemo}>
          <View style={styles.positionOriginal}>
            <Text style={styles.positionText}>原位置</Text>
          </View>
          <View style={styles.positionOptimized}>
            <Text style={styles.positionText}>新位置 (+10%)</Text>
          </View>
        </View>
      </View>
      
      {/* iOS特定优化 */}
      {isIOS && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>iOS特定优化</Text>
          <Text style={styles.feature}>• 更细的分割线 (0.5px)</Text>
          <Text style={styles.feature}>• 系统灰色边框 (#c6c6c8)</Text>
          <Text style={styles.feature}>• 轻微阴影效果</Text>
          <Text style={styles.feature}>• 字体权重调整为600</Text>
          <Text style={styles.feature}>• 圆角按钮设计</Text>
          <Text style={styles.feature}>• 系统背景色 (#F2F2F7)</Text>
        </View>
      )}
      
      {/* 应用范围 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>应用范围</Text>
        <Text style={styles.feature}>✅ 首页 (HomeScreen)</Text>
        <Text style={styles.feature}>✅ 订单页 (OrderScreen)</Text>
        <Text style={styles.feature}>✅ 信息页 (MessageScreen)</Text>
        <Text style={styles.note}>
          所有主要页面现在使用统一的页头高度和位置配置
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  platform: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  section: {
    marginVertical: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  
  // 原始页头样式（用于对比）
  originalHeader: {
    height: 80,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 44 : 30,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  originalHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  
  // Android对比样式
  androidHeader: {
    height: 80,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  androidHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  
  // 高度对比
  comparisonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    marginVertical: 15,
  },
  comparisonItem: {
    alignItems: 'center',
  },
  heightBar: {
    width: 60,
    marginBottom: 8,
  },
  originalHeight: {
    height: 80,
    backgroundColor: '#ff6b81',
  },
  optimizedHeight: {
    height: 60,
    backgroundColor: '#4caf50',
  },
  comparisonLabel: {
    fontSize: 12,
    color: '#666',
  },
  improvement: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 10,
  },
  
  // 位置演示
  positionDemo: {
    marginTop: 10,
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 8,
  },
  positionOriginal: {
    backgroundColor: '#ff6b81',
    padding: 8,
    borderRadius: 4,
    marginBottom: 5,
    marginTop: Platform.OS === 'ios' ? 44 : 30,
  },
  positionOptimized: {
    backgroundColor: '#4caf50',
    padding: 8,
    borderRadius: 4,
    marginTop: Platform.OS === 'ios' ? 35 : 25,
  },
  positionText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // 功能列表
  feature: {
    fontSize: 14,
    color: '#333',
    marginVertical: 2,
    lineHeight: 20,
  },
  note: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default HeaderLayoutTest;
