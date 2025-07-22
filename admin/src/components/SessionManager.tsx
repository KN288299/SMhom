import React, { useState, useEffect, useContext } from 'react';
import { Alert, Button, Modal, message } from 'antd';
import { LogoutOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

interface SessionInfo {
  loginTime: number;
  remainingTime: number;
  isExpiringSoon: boolean;
}

const SessionManager: React.FC = () => {
  const { isAuthenticated, logout, forceLogout } = useAuth();
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // 计算会话信息
  const calculateSessionInfo = (): SessionInfo | null => {
    if (!isAuthenticated) return null;

    const sessionData = localStorage.getItem('adminSession');
    if (!sessionData) return null;

    try {
      const session = JSON.parse(sessionData);
      const currentTime = Date.now();
      const loginTime = session.loginTime;
      const sessionDuration = 5 * 60 * 60 * 1000; // 5小时
      const remainingTime = Math.max(0, (loginTime + sessionDuration) - currentTime);
      const isExpiringSoon = remainingTime < 30 * 60 * 1000; // 30分钟内过期

      return {
        loginTime,
        remainingTime,
        isExpiringSoon
      };
    } catch (error) {
      console.error('解析会话信息失败:', error);
      return null;
    }
  };

  // 格式化剩余时间
  const formatRemainingTime = (milliseconds: number): string => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    } else {
      return `${minutes}分钟`;
    }
  };

  // 更新会话信息
  useEffect(() => {
    if (isAuthenticated) {
      const updateSessionInfo = () => {
        const info = calculateSessionInfo();
        setSessionInfo(info);

        // 如果会话即将过期，显示提醒
        if (info && info.isExpiringSoon && !showExpiryModal) {
          setShowExpiryModal(true);
        }

        // 如果会话已过期，强制登出
        if (info && info.remainingTime <= 0) {
          message.warning('会话已过期，即将自动登出');
          setTimeout(() => {
            forceLogout();
          }, 3000);
        }
      };

      updateSessionInfo();
      const interval = setInterval(updateSessionInfo, 60000); // 每分钟更新一次

      return () => clearInterval(interval);
    } else {
      setSessionInfo(null);
    }
  }, [isAuthenticated, showExpiryModal, forceLogout]);

  // 处理登出
  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  // 确认登出
  const confirmLogout = () => {
    logout();
    setShowLogoutModal(false);
    message.success('已安全登出');
  };

  // 延长会话（这里可以调用API刷新token）
  const extendSession = () => {
    // 这里可以调用API刷新token
    message.info('会话已延长');
    setShowExpiryModal(false);
  };

  if (!isAuthenticated || !sessionInfo) {
    return null;
  }

  return (
    <>
      {/* 会话状态提醒 */}
      {sessionInfo.isExpiringSoon && (
        <Alert
          message="会话即将过期"
          description={`您的登录会话将在 ${formatRemainingTime(sessionInfo.remainingTime)} 后过期，请及时保存工作。`}
          type="warning"
          showIcon
          closable
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" type="primary" onClick={extendSession}>
              延长会话
            </Button>
          }
        />
      )}

      {/* 会话信息显示 */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 8,
        fontSize: '12px',
        color: '#666'
      }}>
        <ClockCircleOutlined />
        <span>剩余时间: {formatRemainingTime(sessionInfo.remainingTime)}</span>
        <Button 
          type="text" 
          size="small" 
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          style={{ padding: '0 4px' }}
        >
          登出
        </Button>
      </div>

      {/* 会话过期提醒弹窗 */}
      <Modal
        title="会话即将过期"
        open={showExpiryModal}
        onOk={extendSession}
        onCancel={() => setShowExpiryModal(false)}
        okText="延长会话"
        cancelText="稍后处理"
      >
        <p>您的登录会话将在 {formatRemainingTime(sessionInfo.remainingTime)} 后过期。</p>
        <p>为了安全起见，建议您：</p>
        <ul>
          <li>保存当前工作</li>
          <li>延长会话时间</li>
          <li>或重新登录</li>
        </ul>
      </Modal>

      {/* 登出确认弹窗 */}
      <Modal
        title="确认登出"
        open={showLogoutModal}
        onOk={confirmLogout}
        onCancel={() => setShowLogoutModal(false)}
        okText="确认登出"
        cancelText="取消"
      >
        <p>您确定要登出吗？</p>
        <p>登出后需要重新登录才能访问系统。</p>
      </Modal>
    </>
  );
};

export default SessionManager; 