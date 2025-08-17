import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Upload, message, Space, Popconfirm, Tag, Switch, Alert } from 'antd';
import { PlusOutlined, UploadOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import Layout from '../components/Layout';
import { SERVER_BASE_URL, customerServiceAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import type { UploadProps } from 'antd/es/upload';
import type { UploadFile } from 'antd/es/upload/interface';

interface CustomerService {
  _id: string;
  name: string;
  phoneNumber: string;
  avatar: string;
  status: 'online' | 'offline' | 'busy';
  isActive: boolean;
  createdAt: string;
  serviceStats?: {
    totalSessions: number;
    totalMessages: number;
    rating: number;
  };
}

const CustomerServiceManagement: React.FC = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customerServices, setCustomerServices] = useState<CustomerService[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentCustomerService, setCurrentCustomerService] = useState<CustomerService | null>(null);
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [uploadedAvatar, setUploadedAvatar] = useState<string>('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // 获取所有客服
  const fetchCustomerServices = async () => {
    setLoading(true);
    try {
      const data = await customerServiceAPI.getCustomerServices();
      const list = Array.isArray(data)
        ? data
        : (data && Array.isArray((data as any).customerServices)
            ? (data as any).customerServices
            : []);
      setCustomerServices(list as CustomerService[]);
    } catch (error) {
      message.error('获取客服列表失败');
      console.error('获取客服列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerServices();
  }, [token]);

  // 打开添加/编辑客服模态框
  const showModal = (record?: CustomerService) => {
    if (record) {
      setIsEditMode(true);
      setCurrentCustomerService(record);
      form.setFieldsValue({
        name: record.name,
        phoneNumber: record.phoneNumber,
      });
      if (record.avatar) {
        setUploadedAvatar(record.avatar);
        setFileList([{
          uid: '-1',
          name: 'avatar.png',
          status: 'done',
          url: `${SERVER_BASE_URL}${record.avatar}`,
        }]);
      } else {
        setFileList([]);
      }
    } else {
      setIsEditMode(false);
      setCurrentCustomerService(null);
      form.resetFields();
      setUploadedAvatar('');
      setFileList([]);
    }
    setIsModalVisible(true);
  };

  // 处理模态框取消
  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  // 处理创建/更新客服
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields().catch(err => {
        console.error('表单验证失败:', err);
        throw err;
      });
      
      setLoading(true);

      if (isEditMode && currentCustomerService) {
        // 更新客服
        await customerServiceAPI.updateCustomerService(currentCustomerService._id, values);
        message.success('客服信息更新成功');
      } else {
        // 创建客服
        const result = await customerServiceAPI.createCustomerService(values);
        // 保存新创建的客服ID，以便上传头像
        if (result && result._id) {
          setNewlyCreatedId(result._id);
          setCurrentCustomerService({ ...result });
          setIsEditMode(true);  // 切换到编辑模式
        }
        
        if (result.generatedPassword) {
          Modal.success({
            title: '客服添加成功',
            content: (
              <div>
                <p>系统已为该客服生成初始密码：</p>
                <p style={{ fontWeight: 'bold', fontSize: '18px', color: '#ff4d4f' }}>
                  {result.generatedPassword}
                </p>
                <p>请记住此密码并告知客服人员，此密码只会显示一次！</p>
                <p style={{ marginTop: '10px' }}>现在您可以为客服上传头像。</p>
              </div>
            ),
          });
        } else {
          message.success('客服添加成功，现在您可以上传头像');
        }
      }

      fetchCustomerServices();
    } catch (error) {
      console.error('提交表单失败:', error);
      message.error('操作失败，请稍后重试');
      // 不要在这里关闭模态框和重置表单，让用户可以修复错误
      // setIsModalVisible(false);
      // form.resetFields();
    } finally {
      setLoading(false);
    }
  };

  // 处理删除客服
  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await customerServiceAPI.deleteCustomerService(id);
      message.success('客服删除成功');
      fetchCustomerServices();
    } catch (error) {
      console.error('删除客服失败:', error);
      message.error('删除客服失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理状态切换
  const handleStatusChange = async (id: string, isActive: boolean) => {
    setLoading(true);
    try {
      await customerServiceAPI.updateCustomerService(id, { isActive });
      message.success(`客服${isActive ? '启用' : '禁用'}成功`);
      fetchCustomerServices();
    } catch (error) {
      console.error('更新客服状态失败:', error);
      message.error('操作失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理上传头像
  const handleAvatarUpload = async (id: string, file: File) => {
    try {
      setLoading(true);
      const response = await customerServiceAPI.uploadAvatar(id, file);
      message.success('头像上传成功');
      setUploadedAvatar(response.avatar);
      fetchCustomerServices();
    } catch (error) {
      console.error('上传头像失败:', error);
      message.error('上传头像失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const uploadProps: UploadProps = {
    name: 'avatar',
    fileList,
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('只能上传图片文件!');
        return false;
      }
      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isLt2M) {
        message.error('图片必须小于2MB!');
        return false;
      }

      // 使用当前客服ID或新创建的ID
      const serviceId = currentCustomerService?._id || newlyCreatedId;
      if (serviceId) {
        handleAvatarUpload(serviceId, file);
      } else {
        message.info('请先保存客服信息，然后再上传头像');
      }
      return false;
    },
    onChange: (info) => {
      setFileList(info.fileList.slice(-1)); // 只保留最后一张
    },
  };

  // 表格列配置
  const columns = [
    {
      title: '头像',
      dataIndex: 'avatar',
      key: 'avatar',
      render: (avatar: string) => (
        avatar ? (
          <img
            src={`${SERVER_BASE_URL}${avatar}`}
            alt="Avatar"
            style={{ width: 40, height: 40, borderRadius: '50%' }}
            onError={(e) => {
              console.error('头像加载失败:', avatar);
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              // 使用内联的默认头像样式
              target.style.backgroundColor = '#1890ff';
              target.style.display = 'flex';
              target.style.alignItems = 'center';
              target.style.justifyContent = 'center';
              target.style.color = 'white';
              target.style.fontWeight = 'bold';
              // 移除src以避免继续尝试加载失败的图像
              target.removeAttribute('src');
            }}
          />
        ) : (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            无
          </div>
        )
      ),
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '手机号',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = '';
        let text = '';
        
        switch(status) {
          case 'online':
            color = 'green';
            text = '在线';
            break;
          case 'offline':
            color = 'gray';
            text = '离线';
            break;
          case 'busy':
            color = 'orange';
            text = '忙碌';
            break;
          default:
            color = 'default';
            text = status;
        }
        
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '启用',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean, record: CustomerService) => (
        <Switch
          checked={isActive}
          onChange={(checked) => handleStatusChange(record._id, checked)}
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: CustomerService) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
            size="small"
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此客服吗?"
            onConfirm={() => handleDelete(record._id)}
            okText="确定"
            cancelText="取消"
          >
            <Button icon={<DeleteOutlined />} danger size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => showModal()}
          >
            添加客服
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={Array.isArray(customerServices) ? customerServices : []}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />

        <Modal
          title={isEditMode ? '编辑客服' : '添加客服'}
          open={isModalVisible}
          onOk={handleSubmit}
          onCancel={handleCancel}
          confirmLoading={loading}
        >
          <Form form={form} layout="vertical">
            <Form.Item
              name="name"
              label="姓名"
              rules={[{ required: true, message: '请输入客服姓名' }]}
            >
              <Input placeholder="请输入客服姓名" />
            </Form.Item>

            <Form.Item
              name="phoneNumber"
              label="手机号"
              rules={[
                { required: true, message: '请输入手机号' },
                { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' }
              ]}
            >
              <Input placeholder="请输入客服手机号" />
            </Form.Item>

            {isEditMode && (
              <Form.Item
                name="password"
                label="修改密码(可选)"
                rules={[
                  { min: 6, message: '密码长度不少于6位' }
                ]}
              >
                <Input.Password 
                  placeholder="输入新密码或留空" 
                  autoComplete="new-password"
                />
              </Form.Item>
            )}

            {!isEditMode && (
              <Alert
                message="系统信息"
                description="新添加的客服将使用默认登录密码：1332"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            <Form.Item label="头像">
              <Upload {...uploadProps} listType="picture-card" maxCount={1}>
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>上传</div>
                </div>
              </Upload>
              {!isEditMode && (
                <span style={{ color: '#999', marginTop: 8, display: 'block' }}>
                  只能在保存客服信息后上传头像
                </span>
              )}
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Layout>
  );
};

export default CustomerServiceManagement; 