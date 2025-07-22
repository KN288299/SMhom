import React from 'react';
import { Row, Col, Card, Statistic, Typography, Button, Space, Divider } from 'antd';
import { 
  UserOutlined, 
  MessageOutlined, 
  TeamOutlined, 
  ClockCircleOutlined,
  HomeOutlined,
  SettingOutlined,
  BellOutlined
} from '@ant-design/icons';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        {/* 欢迎区域 */}
        <div style={{ marginBottom: '32px' }}>
          <Title level={2} style={{ marginBottom: '8px' }}>
            <HomeOutlined style={{ marginRight: '12px', color: '#1890ff' }} />
            欢迎来到家政服务管理系统
          </Title>
          <Text type="secondary">
            当前登录用户：{user?.username || '管理员'} | 
            角色：{user?.role === 'super' ? '超级管理员' : '普通管理员'} | 
            登录时间：{new Date().toLocaleString('zh-CN')}
          </Text>
        </div>

        {/* 统计卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: '32px' }}>
          <Col xs={24} sm={12} md={6}>
            <Card hoverable>
              <Statistic 
                title="用户总数" 
                value={0} 
                prefix={<UserOutlined style={{ color: '#1890ff' }} />} 
                suffix="人"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card hoverable>
              <Statistic 
                title="活跃用户" 
                value={0} 
                prefix={<TeamOutlined style={{ color: '#52c41a' }} />} 
                suffix="人"
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card hoverable>
              <Statistic 
                title="消息总数" 
                value={0} 
                prefix={<MessageOutlined style={{ color: '#faad14' }} />} 
                suffix="条"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card hoverable>
              <Statistic 
                title="对话总数" 
                value={0} 
                prefix={<ClockCircleOutlined style={{ color: '#722ed1' }} />} 
                suffix="个"
              />
            </Card>
          </Col>
        </Row>

        {/* 快速操作区域 */}
        <Row gutter={[16, 16]} style={{ marginBottom: '32px' }}>
          <Col xs={24} md={12}>
            <Card title="快速操作" hoverable>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button type="primary" block icon={<UserOutlined />}>
                  用户管理
                </Button>
                <Button block icon={<MessageOutlined />}>
                  消息管理
                </Button>
                <Button block icon={<SettingOutlined />}>
                  系统设置
                </Button>
                <Button block icon={<BellOutlined />}>
                  通知管理
                </Button>
              </Space>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="系统信息" hoverable>
              <div style={{ lineHeight: '2' }}>
                <div><Text strong>系统名称：</Text>家政服务聊天管理系统</div>
                <div><Text strong>版本号：</Text>v1.0.0</div>
                <div><Text strong>运行环境：</Text>开发环境</div>
                <div><Text strong>数据库：</Text>MongoDB</div>
                <div><Text strong>前端框架：</Text>React + TypeScript + Ant Design</div>
                <div><Text strong>后端框架：</Text>Node.js + Express</div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* 测试区域 */}
        <Card title="登录测试区域" style={{ marginBottom: '32px' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>如果你能看到这个页面，说明登录功能正常工作！</Text>
            <Text type="success">✓ 用户认证成功</Text>
            <Text type="success">✓ 路由保护正常</Text>
            <Text type="success">✓ 页面渲染正常</Text>
            <Divider />
            <Space>
              <Button type="primary" onClick={() => window.location.reload()}>
                刷新页面
              </Button>
              <Button onClick={handleLogout} danger>
                退出登录
              </Button>
            </Space>
          </Space>
        </Card>

        {/* 开发信息 */}
        <Card title="开发信息" size="small">
          <Text type="secondary">
            这是一个测试版本的管理系统主页。实际部署时，统计数据将从后端API获取，快速操作按钮将链接到相应的功能页面。
          </Text>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard; 