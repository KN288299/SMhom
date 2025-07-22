import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import axios from 'axios';
import { API_URL, API_ENDPOINTS } from '../config/api';

interface NetworkTestProps {
  onClose: () => void;
}

const NetworkTest: React.FC<NetworkTestProps> = ({ onClose }) => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testNetwork = async () => {
    setLoading(true);
    setTestResults([]);
    
    try {
      addResult('开始网络测试...');
      addResult(`API地址: ${API_URL}`);
      
      // 测试基本连接
      addResult('1. 测试基本连接...');
      const basicResponse = await axios.get(API_URL.replace('/api', ''));
      addResult(`✅ 基本连接成功: ${basicResponse.status}`);
      
      // 测试用户登录API
      addResult('2. 测试用户登录API...');
      const loginResponse = await axios.post(`${API_URL}${API_ENDPOINTS.USER_LOGIN}`, {
        phoneNumber: '13800138000',
        inviteCode: '6969'
      });
      addResult(`✅ 登录API成功: ${loginResponse.status}`);
      addResult(`返回数据: ${JSON.stringify(loginResponse.data, null, 2)}`);
      
      addResult('🎉 所有测试通过！');
      
    } catch (error: any) {
      addResult(`❌ 测试失败: ${error.message}`);
      addResult(`错误详情: ${JSON.stringify(error.response?.data || error, null, 2)}`);
      
      if (error.code === 'ECONNREFUSED') {
        addResult('💡 建议: 检查服务器是否在运行 (node server.js)');
      } else if (error.code === 'ENOTFOUND') {
        addResult('💡 建议: 检查网络连接和API地址配置');
      } else if (error.response?.status === 401) {
        addResult('💡 建议: 检查邀请码是否正确 (应该是: 6969)');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>网络连接测试</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.resultsContainer}>
        {testResults.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
      </ScrollView>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.testButton, loading && styles.disabledButton]}
          onPress={testNetwork}
          disabled={loading}
        >
          <Text style={styles.testButtonText}>
            {loading ? '测试中...' : '开始测试'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  resultsContainer: {
    flex: 1,
    padding: 15,
  },
  resultText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 5,
    fontFamily: 'monospace',
  },
  buttonContainer: {
    padding: 20,
    backgroundColor: '#fff',
  },
  testButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NetworkTest; 