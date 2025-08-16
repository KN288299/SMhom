import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { iOSChatStyles, iOSMessageStyles, isIOS, getPlatformStyles, getIOSFontSize, iOSColors } from '../styles/iOSStyles';

/**
 * 平台样式测试组件
 * 用于验证iOS和Android样式差异
 */
const PlatformTestView: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>平台样式测试</Text>
      <Text style={styles.platform}>当前平台: {Platform.OS}</Text>
      <Text style={styles.platform}>是否为iOS: {isIOS ? '是' : '否'}</Text>
      
      {/* 字体大小测试 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>字体大小对比</Text>
        <Text style={[styles.testText, { fontSize: getIOSFontSize(16) }]}>
          iOS适配字体 (原16px → {getIOSFontSize(16)}px)
        </Text>
        <Text style={[styles.testText, { fontSize: 16 }]}>
          原始字体大小 (16px)
        </Text>
      </View>
      
      {/* 页头样式测试 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>页头样式对比</Text>
        <View style={getPlatformStyles(iOSChatStyles.headerContainer, styles.androidHeader)}>
          <Text style={getPlatformStyles(iOSChatStyles.chatHeaderName, styles.androidHeaderName)}>
            聊天标题样式
          </Text>
        </View>
      </View>
      
      {/* 消息气泡测试 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>消息气泡对比</Text>
        <View style={[
          getPlatformStyles(iOSMessageStyles.messageBubble, styles.androidBubble),
          getPlatformStyles(iOSMessageStyles.myBubble, styles.androidMyBubble)
        ]}>
          <Text style={getPlatformStyles(iOSMessageStyles.myMessageText, styles.androidMyText)}>
            我的消息样式
          </Text>
        </View>
        <View style={[
          getPlatformStyles(iOSMessageStyles.messageBubble, styles.androidBubble),
          getPlatformStyles(iOSMessageStyles.otherBubble, styles.androidOtherBubble)
        ]}>
          <Text style={getPlatformStyles(iOSMessageStyles.otherMessageText, styles.androidOtherText)}>
            对方消息样式
          </Text>
        </View>
      </View>
      
      {/* 颜色系统测试 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>iOS颜色系统</Text>
        <View style={styles.colorRow}>
          <View style={[styles.colorBox, { backgroundColor: iOSColors.systemBlue }]} />
          <Text style={styles.colorLabel}>System Blue</Text>
        </View>
        <View style={styles.colorRow}>
          <View style={[styles.colorBox, { backgroundColor: iOSColors.systemGray5 }]} />
          <Text style={styles.colorLabel}>System Gray 5</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  platform: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
  section: {
    marginVertical: 15,
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  testText: {
    marginVertical: 2,
    color: '#333',
  },
  
  // Android样式（用于对比）
  androidHeader: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  androidHeaderName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  androidBubble: {
    borderRadius: 18,
    padding: 12,
    marginVertical: 5,
    maxWidth: '80%',
  },
  androidMyBubble: {
    backgroundColor: '#ff6b81',
    alignSelf: 'flex-end',
  },
  androidOtherBubble: {
    backgroundColor: '#f0f0f0',
    alignSelf: 'flex-start',
  },
  androidMyText: {
    color: '#fff',
    fontSize: 16,
  },
  androidOtherText: {
    color: '#333',
    fontSize: 16,
  },
  
  // 颜色测试
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  colorBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 10,
  },
  colorLabel: {
    fontSize: 14,
    color: '#333',
  },
});

export default PlatformTestView;
