import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  message,
  Tag,
  Card,
  Row,
  Col,
  Typography,
  Tabs,
  Drawer,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined,
  UserOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  MessageOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import Layout from '../components/Layout';
import dayjs from 'dayjs';
import { orderAPI, userAPI, staffAPI } from '../api/api';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;
const { confirm } = Modal;

// 定义订单状态与颜色的映射
const statusColors = {
  pending: 'orange',
  accepted: 'blue',
  completed: 'green',
  cancelled: 'red',
};

// 订单状态的中文映射
const statusLabels = {
  pending: '待接单',
  accepted: '已接单',
  completed: '已完成',
  cancelled: '已取消',
};

const OrderManagement: React.FC = () => {
  // 状态定义
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [users, setUsers] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  
  // 加载订单数据
  const fetchOrders = async (page: number = 1, status: string | null = null) => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit: pagination.pageSize,
      };
      
      // 添加状态过滤
      if (status && status !== 'all') {
        params.status = status;
      }
      
      // 添加搜索条件
      if (searchText) {
        params.orderNumber = searchText;
      }
      
      console.log('正在请求订单数据，参数:', params);
      const response = await orderAPI.getOrders(params);
      console.log('订单API响应:', response);
      
      // 确保response.orders存在，如果不存在则使用空数组
      const orderData = response?.orders || [];
      setOrders(orderData);
      
      // 设置分页信息，使用默认值防止undefined
      setPagination({
        ...pagination,
        current: response?.page || 1,
        total: response?.total || 0,
      });
    } catch (error) {
      console.error('获取订单列表失败:', error);
      message.error('获取订单列表失败');
      // 出错时设置空数据，防止页面崩溃
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };
  
  // 加载用户列表
  const fetchUsers = async () => {
    try {
      console.log('正在请求用户数据');
      const response = await userAPI.getUsers();
      console.log('用户API响应:', response);
      
      // 确保users是数组
      const usersData = Array.isArray(response) ? response : 
                       (response?.users && Array.isArray(response.users)) ? response.users : [];
      
      setUsers(usersData);
    } catch (error) {
      console.error('获取用户列表失败:', error);
      message.error('获取用户列表失败');
      setUsers([]); // 设置为空数组，避免错误
    }
  };
  
  // 加载员工列表
  const fetchStaffList = async () => {
    try {
      console.log('正在请求员工数据');
      const response = await staffAPI.getStaffList({ isActive: true });
      console.log('员工API响应:', response);
      
      // 确保staff是数组
      const staffData = Array.isArray(response) ? response : 
                       (response?.data && Array.isArray(response.data)) ? response.data : [];
      
      setStaffList(staffData);
    } catch (error) {
      console.error('获取员工列表失败:', error);
      message.error('获取员工列表失败');
      setStaffList([]); // 设置为空数组，避免错误
    }
  };
  
  // 初始加载
  useEffect(() => {
    fetchOrders();
    fetchUsers();
    fetchStaffList();
  }, []);
  
  // 当筛选条件变化时重新加载
  useEffect(() => {
    fetchOrders(1, filterStatus);
  }, [filterStatus, searchText]);
  
  // 处理表格分页变化
  const handleTableChange = (pagination: any) => {
    fetchOrders(pagination.current, filterStatus);
  };
  
  // 处理创建/编辑订单的模态框显示
  const showModal = (record?: any) => {
    if (record) {
      setCurrentOrder(record);
      form.setFieldsValue({
        userId: record.user?._id || record.user?.id,
        staffId: record.staff?._id || record.staff?.id,
        appointmentTime: dayjs(record.appointmentTime),
        price: record.price,
        address: record.address,
        notes: record.notes,
        serviceType: record.serviceType,
        status: record.status,
      });
    } else {
      setCurrentOrder(null);
      form.resetFields();
      // 默认状态为待接单
      form.setFieldsValue({ status: 'pending' });
    }
    setIsModalVisible(true);
  };
  
  // 处理模态框取消
  const handleCancel = () => {
    setIsModalVisible(false);
    setCurrentOrder(null);
    form.resetFields();
  };
  
  // 处理表单提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 转换日期格式
      const formattedValues = {
        ...values,
        appointmentTime: values.appointmentTime.toISOString(),
      };
      
      console.log('提交的订单数据:', formattedValues);
      setLoading(true);
      
      if (currentOrder) {
        // 更新订单
        await orderAPI.updateOrder(currentOrder._id || currentOrder.id, formattedValues);
        message.success('订单更新成功');
      } else {
        // 创建新订单
        console.log('准备创建新订单...');
        try {
          const response = await orderAPI.createOrder(formattedValues);
          console.log('订单创建成功:', response);
          message.success('订单创建成功');
        } catch (error: any) {
          console.error('创建订单详细错误:', error);
          if (error.response) {
            console.error('错误响应状态:', error.response.status);
            console.error('错误响应数据:', error.response.data);
          }
          throw error;
        }
      }
      
      setIsModalVisible(false);
      setCurrentOrder(null);
      form.resetFields();
      fetchOrders(pagination.current, filterStatus);
    } catch (error: any) {
      console.error('保存订单失败:', error);
      message.error(`保存订单失败: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // 处理订单删除
  const handleDelete = (id: string) => {
    confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: '确定要删除这个订单吗？此操作不可逆。',
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          console.log(`尝试删除订单: ${id}`);
          await orderAPI.deleteOrder(id);
          console.log('删除订单成功');
          message.success('订单删除成功');
          fetchOrders(pagination.current, filterStatus);
        } catch (error: any) {
          console.error('删除订单失败:', error);
          message.error(`删除订单失败: ${error.response?.data?.message || error.message}`);
        }
      },
    });
  };
  
  // 处理订单状态变更
  const handleStatusChange = async (id: string, status: string) => {
    try {
      await orderAPI.updateOrderStatus(id, status);
      message.success(`订单状态已更新为${statusLabels[status as keyof typeof statusLabels]}`);
      fetchOrders(pagination.current, filterStatus);
    } catch (error) {
      console.error('更新订单状态失败:', error);
      message.error('更新订单状态失败');
    }
  };
  
  // 处理详情抽屉显示
  const showOrderDetails = async (record: any) => {
    try {
      setLoading(true);
      const orderDetails = await orderAPI.getOrderById(record._id || record.id);
      setCurrentOrder(orderDetails);
      setDetailDrawerVisible(true);
    } catch (error) {
      console.error('获取订单详情失败:', error);
      message.error('获取订单详情失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 表格列定义
  const columns = [
    {
      title: '订单号',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (text: string, record: any) => (
        <a onClick={() => showOrderDetails(record)}>{text}</a>
      ),
    },
    {
      title: '服务类型',
      dataIndex: 'serviceType',
      key: 'serviceType',
    },
    {
      title: '用户',
      dataIndex: ['user', 'name'],
      key: 'userName',
      render: (text: string, record: any) => record.user?.name || '未知用户',
    },
    {
      title: '员工',
      dataIndex: ['staff', 'name'],
      key: 'staffName',
      render: (text: string, record: any) => record.staff?.name || '未知员工',
    },
    {
      title: '预约时间',
      dataIndex: 'appointmentTime',
      key: 'appointmentTime',
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (text: number) => `¥${text}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status as keyof typeof statusColors]}>
          {statusLabels[status as keyof typeof statusLabels]}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (text: string, record: any) => (
        <Space size="small">
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            size="small" 
            onClick={() => showModal(record)}
          >
            编辑
          </Button>
          <Select
            defaultValue={record.status}
            size="small"
            style={{ width: 100 }}
            onChange={(value) => handleStatusChange(record._id || record.id, value)}
          >
            <Select.Option value="pending">{statusLabels.pending}</Select.Option>
            <Select.Option value="accepted">{statusLabels.accepted}</Select.Option>
            <Select.Option value="completed">{statusLabels.completed}</Select.Option>
            <Select.Option value="cancelled">{statusLabels.cancelled}</Select.Option>
          </Select>
          <Button 
            danger 
            icon={<DeleteOutlined />} 
            size="small" 
            onClick={() => handleDelete(record._id || record.id)}
          />
        </Space>
      ),
    },
  ];
  
  return (
    <Layout>
      <Title level={2}>订单管理</Title>
      
      {/* 搜索和过滤区域 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Input
              placeholder="搜索订单号"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={6}>
            <Select
              placeholder="按状态筛选"
              style={{ width: '100%' }}
              value={filterStatus}
              onChange={(value) => setFilterStatus(value)}
              allowClear
            >
              <Select.Option value="all">全部</Select.Option>
              <Select.Option value="pending">{statusLabels.pending}</Select.Option>
              <Select.Option value="accepted">{statusLabels.accepted}</Select.Option>
              <Select.Option value="completed">{statusLabels.completed}</Select.Option>
              <Select.Option value="cancelled">{statusLabels.cancelled}</Select.Option>
            </Select>
          </Col>
          <Col span={6}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => showModal()}
            >
              创建订单
            </Button>
          </Col>
        </Row>
      </Card>
      
      <Table
        columns={columns}
        dataSource={orders}
        rowKey={(record) => record._id || record.id}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条记录`,
        }}
        loading={loading}
        onChange={handleTableChange}
      />
      
      {/* 创建/编辑订单模态框 */}
      <Modal
        title={currentOrder ? '编辑订单' : '创建订单'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={handleCancel}
        confirmLoading={loading}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="userId"
                label="选择用户"
                rules={[{ required: true, message: '请选择用户' }]}
              >
                <Select placeholder="选择用户">
                  {users.map((user) => (
                    <Select.Option key={user._id || user.id} value={user._id || user.id}>
                      {user.name || user.phoneNumber}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="staffId"
                label="选择员工"
                rules={[{ required: true, message: '请选择员工' }]}
              >
                <Select placeholder="选择员工">
                  {staffList.map((staff) => (
                    <Select.Option key={staff._id || staff.id} value={staff._id || staff.id}>
                      {staff.name} - {staff.job}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="appointmentTime"
                label="预约时间"
                rules={[{ required: true, message: '请选择预约时间' }]}
              >
                <DatePicker 
                  showTime 
                  format="YYYY-MM-DD HH:mm" 
                  style={{ width: '100%' }} 
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="price"
                label="价格"
                rules={[{ required: true, message: '请输入价格' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={10}
                  prefix="¥"
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="serviceType"
            label="服务类型"
            rules={[{ required: true, message: '请输入服务类型' }]}
          >
            <Select placeholder="选择服务类型">
              <Select.Option value="家政保洁">家政保洁</Select.Option>
              <Select.Option value="上门按摩">上门按摩</Select.Option>
              <Select.Option value="电器维修">电器维修</Select.Option>
              <Select.Option value="管道疏通">管道疏通</Select.Option>
              <Select.Option value="其他服务">其他服务</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="address"
            label="地址"
            rules={[{ required: true, message: '请输入服务地址' }]}
          >
            <Input placeholder="请输入详细地址" />
          </Form.Item>
          
          <Form.Item
            name="notes"
            label="备注"
          >
            <TextArea rows={4} placeholder="可选备注信息" />
          </Form.Item>
          
          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="选择订单状态">
              <Select.Option value="pending">{statusLabels.pending}</Select.Option>
              <Select.Option value="accepted">{statusLabels.accepted}</Select.Option>
              <Select.Option value="completed">{statusLabels.completed}</Select.Option>
              <Select.Option value="cancelled">{statusLabels.cancelled}</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
      
      {/* 订单详情抽屉 */}
      <Drawer
        title="订单详情"
        placement="right"
        width={500}
        onClose={() => setDetailDrawerVisible(false)}
        open={detailDrawerVisible}
      >
        {currentOrder && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <Tag color={statusColors[currentOrder.status as keyof typeof statusColors]} style={{ fontSize: 16, padding: '4px 8px' }}>
                {statusLabels[currentOrder.status as keyof typeof statusLabels]}
              </Tag>
            </div>
            
            <Divider orientation="left">基本信息</Divider>
            <p>
              <Text strong>订单号:</Text> {currentOrder.orderNumber}
            </p>
            <p>
              <Text strong>服务类型:</Text> {currentOrder.serviceType}
            </p>
            <p>
              <Text strong><ClockCircleOutlined /> 预约时间:</Text> {dayjs(currentOrder.appointmentTime).format('YYYY-MM-DD HH:mm')}
            </p>
            <p>
              <Text strong><DollarOutlined /> 价格:</Text> ¥{currentOrder.price}
            </p>
            
            <Divider orientation="left">位置信息</Divider>
            <p>
              <Text strong><EnvironmentOutlined /> 服务地址:</Text> {currentOrder.address}
            </p>
            
            <Divider orientation="left">人员信息</Divider>
            <p>
              <Text strong><UserOutlined /> 用户:</Text> {currentOrder.user?.name || '未知用户'} ({currentOrder.user?.phoneNumber || '无电话'})
            </p>
            <p>
              <Text strong><TeamOutlined /> 员工:</Text> {currentOrder.staff?.name || '未知员工'} ({currentOrder.staff?.job || '未知职位'})
            </p>
            
            {currentOrder.notes && (
              <>
                <Divider orientation="left">备注</Divider>
                <p>
                  <Text strong><MessageOutlined /> 备注内容:</Text> 
                </p>
                <p>{currentOrder.notes}</p>
              </>
            )}
            
            <Divider />
            
            <Space>
              <Button 
                type="primary" 
                icon={<EditOutlined />} 
                onClick={() => {
                  setDetailDrawerVisible(false);
                  showModal(currentOrder);
                }}
              >
                编辑订单
              </Button>
              {currentOrder.status !== 'completed' && currentOrder.status !== 'cancelled' && (
                <Button 
                  type="primary" 
                  style={{ backgroundColor: '#52c41a' }}
                  onClick={() => handleStatusChange(currentOrder._id || currentOrder.id, 'completed')}
                >
                  标记为已完成
                </Button>
              )}
              {currentOrder.status === 'pending' && (
                <Button 
                  type="primary" 
                  danger
                  onClick={() => handleStatusChange(currentOrder._id || currentOrder.id, 'cancelled')}
                >
                  取消订单
                </Button>
              )}
            </Space>
          </>
        )}
      </Drawer>
    </Layout>
  );
};

export default OrderManagement; 