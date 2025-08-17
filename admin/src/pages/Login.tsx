import React, { useState, useContext } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Login.css';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const onFinish = async (values: { username: string; password: string }) => {
    try {
      setLoading(true);
      
      console.log('开始登录，用户名:', values.username);
      
      // 直接调用后端登录API
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: values.username,
          password: values.password
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('登录成功:', data);
        login(data.token, data.admin);
        message.success('登录成功');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      } else {
        console.error('登录失败:', data);
        message.error(data.message || '登录失败');
      }
    } catch (error: any) {
      console.error('登录请求失败:', error);
      message.error('网络错误，请检查连接');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card title="家政服务聊天管理系统" className="login-card">
        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名!' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="用户名" 
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码!' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
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
