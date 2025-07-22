import React, { useState, useContext, useEffect } from 'react';
import { Form, Input, Button, Card, message, Row, Col } from 'antd';
import { UserOutlined, LockOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { authAPI } from '../api/api';
import '../styles/Login.css';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [captchaSessionId, setCaptchaSessionId] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  // 获取验证码
  const fetchCaptcha = async () => {
    try {
      setCaptchaLoading(true);
      const response = await authAPI.getCaptcha();
      setCaptchaSvg(response.captchaSvg);
      setCaptchaSessionId(response.sessionId);
    } catch (error) {
      console.error('获取验证码失败:', error);
      message.error('获取验证码失败，请刷新页面重试');
    } finally {
      setCaptchaLoading(false);
    }
  };

  // 页面加载时获取验证码
  useEffect(() => {
    fetchCaptcha();
  }, []);

  const onFinish = async (values: { username: string; password: string; captcha: string }) => {
    try {
      setLoading(true);
      
      if (!captchaSessionId) {
        message.error('验证码已过期，请刷新验证码');
        await fetchCaptcha();
        return;
      }
      
      // 真实登录
      console.log('使用真实登录');
      const data = await authAPI.login(
        values.username, 
        values.password, 
        values.captcha, 
        captchaSessionId
      );
      login(data.token, data.admin);
      message.success('登录成功');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (error: any) {
      console.error('登录失败:', error);
      
      // 刷新验证码
      await fetchCaptcha();
      
      if (error.response?.status === 429) {
        // IP被封锁
        const errorData = error.response.data;
        if (errorData.isBlocked) {
          message.error(`${errorData.message}`, 10);
        } else {
          message.error(errorData.message || '请求过于频繁，请稍后再试');
        }
      } else if (error.response?.data?.message) {
        // 显示具体错误信息和剩余尝试次数
        const errorData = error.response.data;
        if (errorData.remainingAttempts !== undefined) {
          message.error(`${errorData.message}`);
        } else {
          message.error(errorData.message);
        }
      } else {
        message.error('登录失败，请检查网络连接');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card title="家政服务聊天管理系统" className="login-card">
        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          layout="vertical"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名!' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="用户名" 
              size="large" 
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码!' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="captcha"
            rules={[{ required: true, message: '请输入验证码!' }]}
          >
            <Row gutter={8}>
              <Col span={12}>
                <Input
                  placeholder="验证码"
                  size="large"
                  maxLength={4}
                />
              </Col>
              <Col span={12}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  height: '40px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  padding: '4px',
                  cursor: 'pointer',
                  backgroundColor: '#fafafa'
                }} onClick={fetchCaptcha}>
                  {captchaLoading ? (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      width: '100%' 
                    }}>
                      <ReloadOutlined spin />
                    </div>
                  ) : (
                    <div 
                      dangerouslySetInnerHTML={{ __html: captchaSvg }}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        width: '100%'
                      }}
                    />
                  )}
                </div>
              </Col>
            </Row>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              disabled={!captchaSessionId}
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login; 