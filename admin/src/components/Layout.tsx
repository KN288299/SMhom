import React, { useState } from 'react';
import { Layout as AntLayout, Menu, Button, Dropdown, Avatar, theme } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  UserOutlined,
  LogoutOutlined,
  ExperimentOutlined,
  TeamOutlined,
  ShoppingCartOutlined,
  CustomerServiceOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SessionManager from './SessionManager';

const { Header, Sider, Content } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleMenuClick = (key: string) => {
    navigate(key);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const items = [
    {
      key: 'profile',
      label: '个人资料',
      icon: <UserOutlined />,
    },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <AntLayout style={{ height: '100%' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark" width={230}>
        <div className="logo" style={{ 
          height: 32, 
          margin: 16, 
          color: '#fff', 
          fontSize: 18, 
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden'
        }}>
          {collapsed ? '御足堂' : '御足堂交友管理后台'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={[
            {
              key: '/dashboard',
              icon: <DashboardOutlined />,
              label: '仪表盘',
              onClick: () => handleMenuClick('/dashboard'),
            },
            {
              key: '/users',
              icon: <UserOutlined />,
              label: '用户管理',
              onClick: () => handleMenuClick('/users'),
            },
            {
              key: '/staff',
              icon: <TeamOutlined />,
              label: '员工管理',
              onClick: () => handleMenuClick('/staff'),
            },
            {
              key: '/orders',
              icon: <ShoppingCartOutlined />,
              label: '订单管理',
              onClick: () => handleMenuClick('/orders'),
            },
            {
              key: '/customer-service',
              icon: <CustomerServiceOutlined />,
              label: '客服管理',
              onClick: () => handleMenuClick('/customer-service'),
            },
            {
              key: '/page-management',
              icon: <SettingOutlined />,
              label: '页面管理',
              onClick: () => handleMenuClick('/page-management'),
            },
            {
              key: '/test',
              icon: <ExperimentOutlined />,
              label: '功能测试',
              onClick: () => handleMenuClick('/test'),
            },
          ]}
        />
      </Sider>
      <AntLayout>
        <Header style={{ padding: 0, background: colorBgContainer }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px', width: 64, height: 64 }}
            />
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 16,
              marginRight: 20 
            }}>
              {/* 会话管理器 */}
              <SessionManager />
              
              {/* 用户下拉菜单 */}
              <Dropdown menu={{ items }} placement="bottomRight">
                <Button type="text" style={{ height: 64 }}>
                  <Avatar size="small" icon={<UserOutlined />} style={{ marginRight: 8 }} />
                  {user?.username || '管理员'}
                </Button>
              </Dropdown>
            </div>
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflow: 'auto',
          }}
        >
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout; 