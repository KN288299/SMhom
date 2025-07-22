import React from 'react';
import { Card, Typography, Button, Space, Alert } from 'antd';
import { CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const { Title, Text } = Typography;

const TestPage: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        <Title level={2}>
          <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '12px' }} />
          登录功能测试页面
        </Title>

        <Alert
          message="登录状态检查"
          description={
            <div>
              <p><strong>认证状态：</strong> {isAuthenticated ? '已登录' : '未登录'}</p>
              <p><strong>用户信息：</strong> {user ? JSON.stringify(user, null, 2) : '无'}</p>
              <p><strong>Token：</strong> {localStorage.getItem('adminToken') ? '已保存' : '未保存'}</p>
            </div>
          }
          type={isAuthenticated ? 'success' : 'warning'}
          showIcon
          style={{ marginBottom: '24px' }}
        />

        <Card title="功能测试" style={{ marginBottom: '24px' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>如果你能看到这个页面，说明以下功能正常工作：</Text>
            <ul>
              <li>✓ 用户登录认证</li>
              <li>✓ 路由保护机制</li>
              <li>✓ 用户信息获取</li>
              <li>✓ Token 存储和验证</li>
              <li>✓ 页面渲染和布局</li>
            </ul>
          </Space>
        </Card>

        <Card title="调试信息" style={{ marginBottom: '24px' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>localStorage 内容：</Text>
              <pre style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px', marginTop: '8px' }}>
                {JSON.stringify({
                  adminToken: localStorage.getItem('adminToken') ? '***' : null,
                  otherKeys: Object.keys(localStorage)
                }, null, 2)}
              </pre>
            </div>
            <div>
              <Text strong>用户对象：</Text>
              <pre style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px', marginTop: '8px' }}>
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
          </Space>
        </Card>

        <Card title="操作按钮">
          <Space>
            <Button type="primary" onClick={() => window.location.href = '/dashboard'}>
              返回仪表盘
            </Button>
            <Button onClick={() => window.location.reload()}>
              刷新页面
            </Button>
            <Button danger onClick={handleLogout}>
              退出登录
            </Button>
          </Space>
        </Card>
      </div>
    </Layout>
  );
};

export default TestPage; 