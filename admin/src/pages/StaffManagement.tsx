import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Upload, InputNumber, message, Space, Image, Tabs, Select, Card, Row, Col, Progress, Divider, Alert, Statistic } from 'antd';
import { PlusOutlined, FilterOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import Layout from '../components/Layout';
import type { RcFile, UploadProps } from 'antd/es/upload';
import type { UploadFile } from 'antd/es/upload/interface';
import { staffAPI, SERVER_BASE_URL } from '../api/api';

// 导入省份数据
const PROVINCES = [
  '北京市', '天津市', '河北省', '山西省', '内蒙古自治区',
  '辽宁省', '吉林省', '黑龙江省', '上海市', '江苏省',
  '浙江省', '安徽省', '福建省', '江西省', '山东省',
  '河南省', '湖北省', '湖南省', '广东省', '广西壮族自治区',
  '海南省', '重庆市', '四川省', '贵州省', '云南省',
  '西藏自治区', '陕西省', '甘肃省', '青海省', '宁夏回族自治区',
  '新疆维吾尔自治区', '台湾省', '香港特别行政区', '澳门特别行政区'
];

// 员工数据接口
interface StaffMember {
  id: string;
  name: string;
  age: number;
  job: string;
  image: string;
  province?: string;
  height?: number;
  weight?: number;
  description?: string;
  photos?: string[];
  tag?: string;
}

const StaffManagement: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [photoList, setPhotoList] = useState<UploadFile[]>([]);
  const [form] = Form.useForm();
  // 添加筛选状态
  const [filterProvince, setFilterProvince] = useState<string | undefined>(undefined);
  const [searchText, setSearchText] = useState<string>('');
  
  // 添加分页状态
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total: number, range: [number, number]) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
  });
  


  // 批量删除相关状态
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePreview, setDeletePreview] = useState<any>(null);
  const [batchSize, setBatchSize] = useState(10);

  // 修改获取员工数据的函数，支持真正的分页
  const fetchStaffList = async (page?: number, filters?: { province?: string; search?: string }) => {
    try {
      setLoading(true);
      const currentPage = page || pagination.current;
      const params = {
        page: currentPage,
        limit: pagination.pageSize,
        search: filters?.search,
        province: filters?.province
      };
      console.log('📡 正在获取员工列表，参数:', params);
      const response = await staffAPI.getStaffList(params);
      console.log('📋 获取到的员工数据:', response);
      
      // 判断响应是否包含数据字段（适配新的API响应格式）
      if (response.data && response.meta) {
        setStaffList(response.data);
        setPagination(prev => ({
          ...prev,
          current: response.meta.page,
          total: response.meta.total,
        }));
        console.log('✅ 设置员工列表，数量:', response.data.length, '总数:', response.meta.total);
      } else if (response.data) {
        // 兼容只有data字段的情况
        setStaffList(response.data);
        console.log('✅ 设置员工列表（兼容格式），数量:', response.data.length);
      } else {
        // 兼容旧格式，假设响应直接是数组
        const staffArray = Array.isArray(response) ? response : [];
        setStaffList(staffArray);
        console.log('✅ 设置员工列表（旧格式），数量:', staffArray.length);
      }
    } catch (error) {
      message.error('获取员工数据失败');
      console.error('❌ 获取员工数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时获取数据
  useEffect(() => {
    fetchStaffList(1);
  }, []);

  // 处理省份筛选变化
  const handleProvinceChange = (value: string) => {
    setFilterProvince(value);
    setPagination(prev => ({ ...prev, current: 1 })); // 重置到第一页
    fetchStaffList(1, { province: value, search: searchText });
  };

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 })); // 重置到第一页
    fetchStaffList(1, { province: filterProvince, search: value });
  };

  // 重置筛选
  const handleReset = () => {
    setFilterProvince(undefined);
    setSearchText('');
    setPagination(prev => ({ ...prev, current: 1 })); // 重置到第一页
    fetchStaffList(1);
  };

  // 处理分页变化
  const handleTableChange = (paginationConfig: any) => {
    const { current, pageSize } = paginationConfig;
    setPagination(prev => ({
      ...prev,
      current,
      pageSize
    }));
    fetchStaffList(current, { province: filterProvince, search: searchText });
  };

  // 打开添加员工的模态框
  const showModal = () => {
    form.resetFields();
    form.setFieldsValue({ tag: '可预约' });
    setImageUrl('');
    setPhotoList([]);
    setIsEditMode(false);
    setEditingStaffId(null);
    setIsModalVisible(true);
  };

  // 格式化图片URL
  const formatImageUrl = (imageUrl: string) => {
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    return `${SERVER_BASE_URL}${imageUrl}`;
  };

  // 打开编辑员工的模态框
  const showEditModal = async (staffId: string) => {
    console.log('🔍 开始编辑员工，ID:', staffId);
    try {
      setLoading(true);
      console.log('📡 正在获取员工详情...');
      const staff = await staffAPI.getStaffById(staffId);
      console.log('✅ 获取到员工信息:', staff);
      
      // 设置表单数据
      form.setFieldsValue({
        name: staff.name,
        age: staff.age,
        job: staff.job,
        province: staff.province || '北京市',
        height: staff.height,
        weight: staff.weight,
        description: staff.description,
        tag: staff.tag || '可预约'
      });
      
      // 设置图片
      if (staff.image) {
        setImageUrl(formatImageUrl(staff.image));
      }
      
      // 设置照片集
      if (staff.photos && staff.photos.length > 0) {
        const photoFiles: UploadFile[] = staff.photos.map((photo: string, index: number) => ({
          uid: `photo-${index}`,
          name: `photo-${index}.jpg`,
          status: 'done',
          url: formatImageUrl(photo)
        }));
        setPhotoList(photoFiles);
      } else {
        setPhotoList([]);
      }
      
      setIsEditMode(true);
      setEditingStaffId(staffId);
      setIsModalVisible(true);
      console.log('✅ 编辑模态框已打开');
    } catch (error) {
      console.error('❌ 获取员工信息失败:', error);
      message.error('获取员工信息失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理模态框取消
  const handleCancel = () => {
    setIsModalVisible(false);
    setIsEditMode(false);
    setEditingStaffId(null);
    setImageUrl('');
    setPhotoList([]);
    form.resetFields();
  };

  // 自定义上传请求处理
  const customRequest = async ({ file, onSuccess, onError }: any) => {
    try {
      const imageUrl = await staffAPI.uploadStaffImage(file);
      onSuccess();
    } catch (error) {
      console.error('上传图片失败:', error);
      onError(error);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      // 创建FormData对象上传数据
      const formData = new FormData();
      formData.append('name', values.name);
      formData.append('age', values.age);
      formData.append('job', values.job);
      
      // 添加新字段
      if (values.province) formData.append('province', values.province);
      if (values.height) formData.append('height', values.height);
      if (values.weight) formData.append('weight', values.weight);
      if (values.description) formData.append('description', values.description);
      if (values.tag) formData.append('tag', values.tag);
      
      // 如果有主图片文件
      if (values.image && values.image.file && values.image.file.originFileObj) {
        formData.append('image', values.image.file.originFileObj);
      }
      
      // 如果有多张照片
      if (values.photos && values.photos.fileList && values.photos.fileList.length > 0) {
        values.photos.fileList.forEach((file: any) => {
          if (file.originFileObj) {
            formData.append('photos', file.originFileObj);
          }
        });
      }

      let result;
      if (isEditMode && editingStaffId) {
        // 编辑模式
        result = await staffAPI.updateStaff(editingStaffId, formData);
        message.success('员工信息更新成功');
      } else {
        // 创建模式
        result = await staffAPI.createStaff(formData);
        message.success('员工添加成功');
      }
      
      // 更新员工列表
      fetchStaffList(); // 重新获取员工列表以确保数据一致
      
      setIsModalVisible(false);
      setIsEditMode(false);
      setEditingStaffId(null);
      form.resetFields();
      setImageUrl('');
      setPhotoList([]);
    } catch (error: any) {
      console.error('提交表单失败:', error);
      
      // 针对413错误的特殊处理
      if (error.response && error.response.status === 413) {
        message.error('上传文件过大，请压缩图片后重试。建议单张图片不超过10MB，总大小不超过50MB。');
      } else if (error.response && error.response.status === 500) {
        message.error('服务器错误，请稍后重试');
      } else {
        message.error(isEditMode ? '更新员工失败，请稍后重试' : '添加员工失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  // 处理图片上传前的验证
  const beforeUpload = (file: RcFile) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
      message.error('只能上传JPG/PNG格式的图片!');
      return false;
    }
    const isLt20M = file.size / 1024 / 1024 < 20;
    if (!isLt20M) {
      message.error('图片大小不能超过20MB!');
      return false;
    }
    return isJpgOrPng && isLt20M;
  };

  // 处理删除员工
  const handleDeleteStaff = async (id: string) => {
    try {
      await staffAPI.deleteStaff(id);
      fetchStaffList(); // 重新获取员工列表
      message.success('员工删除成功');
    } catch (error) {
      console.error('删除员工失败:', error);
      message.error('删除员工失败，请稍后重试');
    }
  };

  // 处理主图片上传
  const handleChange: UploadProps['onChange'] = ({ file }) => {
    if (file.status === 'uploading') {
      return;
    }
    
    if (file.status === 'done') {
      getBase64(file.originFileObj as RcFile, (url) => {
        setImageUrl(url);
      });
    }
  };

  // 处理多张照片上传
  const handlePhotosChange: UploadProps['onChange'] = ({ fileList }) => {
    setPhotoList([...fileList]);
  };













  // 获取批量删除预览
  const handleGetDeletePreview = async () => {
    try {
      setDeleteLoading(true);
      
      // 构建当前页面的筛选条件
      const currentFilters = {
        search: searchText || undefined,
        province: filterProvince || undefined
      };
      
      console.log('📋 获取删除预览，当前筛选条件:', currentFilters);
      
      const response = await staffAPI.getDeletePreview(batchSize, currentFilters);
      setDeletePreview(response);
      setDeleteModalVisible(true);
    } catch (error: any) {
      console.error('获取删除预览失败:', error);
      message.error('获取删除预览失败：' + (error.response?.data?.message || error.message));
    } finally {
      setDeleteLoading(false);
    }
  };

  // 执行批量删除
  const handleBatchDelete = async () => {
    try {
      setDeleteLoading(true);
      message.loading('正在删除当前页面的员工数据...', 0);
      
      // 使用与预览相同的筛选条件
      const currentFilters = {
        search: searchText || undefined,
        province: filterProvince || undefined
      };
      
      console.log('🗑️ 执行批量删除，当前筛选条件:', currentFilters);
      
      const response = await staffAPI.batchDeleteStaff(batchSize, true, currentFilters);
      
      message.destroy();
      message.success(`${response.message}！当前筛选页剩余：${response.filteredRemainingCount} 名，总剩余：${response.remainingCount} 名`);
      
      // 刷新员工列表（使用当前筛选条件）
      fetchStaffList(pagination.current, { province: filterProvince, search: searchText });
      
      // 如果还有可删除的员工，更新预览
      if (response.nextBatchAvailable) {
        const newPreview = await staffAPI.getDeletePreview(batchSize, currentFilters);
        setDeletePreview(newPreview);
      } else {
        setDeleteModalVisible(false);
        setDeletePreview(null);
        message.info('当前筛选条件下已无更多员工可删除');
      }
      
    } catch (error: any) {
      console.error('批量删除失败:', error);
      message.destroy();
      
      let errorMessage = '批量删除失败';
      if (error.response?.status === 404) {
        errorMessage = '没有找到符合条件的可删除员工';
        setDeleteModalVisible(false);
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      message.error(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  // 将File对象转换为base64
  const getBase64 = (img: RcFile, callback: (url: string) => void) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => callback(reader.result as string));
    reader.readAsDataURL(img);
  };

  // 上传按钮
  const uploadButton = (
    <div>
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>上传图片</div>
    </div>
  );

  // 表格列定义
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      render: (_: string, record: any) => record.id || record._id, // 兼容MongoDB的_id
    },
    {
      title: '图片',
      dataIndex: 'image',
      key: 'image',
      render: (image: string) => (
        <Image
          src={formatImageUrl(image)}
          alt="员工头像"
          style={{ width: 50, height: 50, objectFit: 'cover' }}
          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
        />
      ),
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '年龄',
      dataIndex: 'age',
      key: 'age',
    },
    {
      title: '职业',
      dataIndex: 'job',
      key: 'job',
    },
    {
      title: '省份',
      dataIndex: 'province',
      key: 'province',
      render: (province: string) => province || '北京市',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: StaffMember) => (
        <Space size="middle">
          <a onClick={() => {
            console.log('🖱️ 点击编辑按钮，员工记录:', record);
            const staffId = record.id || (record as any)._id;
            console.log('🆔 员工ID:', staffId);
            showEditModal(staffId);
          }}>编辑</a>
          <a onClick={() => handleDeleteStaff(record.id || (record as any)._id)}>删除</a>
        </Space>
      ),
    },
  ];

  // 表单内容
  const modalContent = (
    <Tabs defaultActiveKey="1">
      <Tabs.TabPane tab="基本信息" key="1">
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>
          
          <Form.Item
            name="age"
            label="年龄"
            rules={[{ required: true, message: '请输入年龄' }]}
          >
            <InputNumber min={18} max={100} style={{ width: '100%' }} placeholder="请输入年龄" />
          </Form.Item>
          
          <Form.Item
            name="job"
            label="职业"
            rules={[{ required: true, message: '请输入职业' }]}
          >
            <Input placeholder="请输入职业" />
          </Form.Item>
          
          <Form.Item
            name="province"
            label="省份"
          >
            <Select placeholder="请选择省份" defaultValue="北京市">
              {PROVINCES.map(province => (
                <Select.Option key={province} value={province}>{province}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="tag"
            label="标签"
            initialValue="可预约"
          >
            <Input placeholder="例如: 可预约、热门" />
          </Form.Item>
          
          <Form.Item
            name="image"
            label="主图"
            valuePropName="file"
          >
            <Upload
              name="avatar"
              listType="picture-card"
              showUploadList={false}
              beforeUpload={beforeUpload}
              onChange={handleChange}
              customRequest={customRequest}
            >
              {imageUrl ? <img src={imageUrl} alt="avatar" style={{ width: '100%' }} /> : uploadButton}
            </Upload>
          </Form.Item>
        </Form>
      </Tabs.TabPane>
      
      <Tabs.TabPane tab="详细资料" key="2">
        <Form form={form} layout="vertical">
          <Form.Item
            name="height"
            label="身高(cm)"
          >
            <InputNumber min={140} max={200} style={{ width: '100%' }} placeholder="请输入身高" />
          </Form.Item>
          
          <Form.Item
            name="weight"
            label="体重(kg)"
          >
            <InputNumber min={30} max={150} style={{ width: '100%' }} placeholder="请输入体重" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="个人简介"
          >
            <Input.TextArea rows={4} placeholder="请输入个人简介" />
          </Form.Item>
          
          <Form.Item
            name="photos"
            label="照片集"
            valuePropName="file"
          >
            <Upload
              listType="picture-card"
              fileList={photoList}
              onChange={handlePhotosChange}
              beforeUpload={beforeUpload}
              customRequest={customRequest}
              multiple
            >
              {photoList.length >= 8 ? null : uploadButton}
            </Upload>
          </Form.Item>
        </Form>
      </Tabs.TabPane>
    </Tabs>
  );

  return (
    <Layout>
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>员工管理</h2>
          <Space>

            
            <Button 
              danger
              icon={<DeleteOutlined />}
              onClick={handleGetDeletePreview}
              loading={deleteLoading}
              disabled={deleteLoading || !staffList.length}
            >
              批量删除
            </Button>
            
            <Button type="primary" onClick={showModal}>
              添加员工
            </Button>
          </Space>
        </div>



        {/* 添加筛选区域 */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col span={8}>
              <Select
                placeholder="选择省份筛选"
                allowClear
                style={{ width: '100%' }}
                value={filterProvince}
                onChange={handleProvinceChange}
              >
                {PROVINCES.map(province => (
                  <Select.Option key={province} value={province}>{province}</Select.Option>
                ))}
              </Select>
            </Col>
            <Col span={12}>
              <Input.Search
                placeholder="输入姓名或职业搜索"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onSearch={handleSearch}
                style={{ width: '100%' }}
                allowClear
              />
            </Col>
            <Col span={4}>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Col>
          </Row>
        </Card>

        <Table
          columns={columns}
          dataSource={staffList}
          loading={loading}
          rowKey={(record) => record.id || (record as any)._id}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range?.[0] || 0}-${range?.[1] || 0} 条/共 ${total} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          onChange={handleTableChange}
        />

        <Modal
          title={isEditMode ? "编辑员工" : "添加员工"}
          open={isModalVisible}
          onOk={handleSubmit}
          onCancel={handleCancel}
          confirmLoading={loading}
          width={800}
          okText={isEditMode ? "更新" : "添加"}
          cancelText="取消"
        >
          {modalContent}
        </Modal>



        {/* 批量删除确认Modal */}
        <Modal
          title="批量删除确认"
          open={deleteModalVisible}
          onOk={handleBatchDelete}
          onCancel={() => {
            setDeleteModalVisible(false);
            setDeletePreview(null);
          }}
          confirmLoading={deleteLoading}
          okText="确认删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
          width={700}
        >
          {deletePreview && (
            <div>
              <Alert
                message="批量删除警告"
                description={`您即将删除当前筛选条件下的前 ${batchSize} 名员工。此操作不可恢复，请谨慎操作！`}
                type="warning"
                showIcon
                style={{ marginBottom: '16px' }}
              />
              
              <div style={{ marginBottom: '16px' }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic 
                      title="当前页待删除" 
                      value={deletePreview.currentBatchCount} 
                      valueStyle={{ color: '#cf1322' }}
                      suffix="名"
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic 
                      title="筛选结果总数" 
                      value={deletePreview.filteredTotalCount} 
                      valueStyle={{ color: '#1890ff' }}
                      suffix="名"
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic 
                      title="数据库总数" 
                      value={deletePreview.totalCount} 
                      valueStyle={{ color: '#666' }}
                      suffix="名"
                    />
                  </Col>
                </Row>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h4>即将删除的员工：</h4>
                <div style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #d9d9d9', borderRadius: '4px' }}>
                  <Table
                    dataSource={deletePreview.previewStaff}
                    columns={[
                      { title: '姓名', dataIndex: 'name', width: 100 },
                      { title: '职业', dataIndex: 'occupation', width: 120 },
                      { title: '省份', dataIndex: 'province', width: 80 },
                      { title: '城市', dataIndex: 'city', width: 80 },
                      { title: '标签', dataIndex: 'tag', width: 80 },
                    ]}
                    pagination={false}
                    size="small"
                    rowKey={(record: any) => record.id || record._id}
                  />
                </div>
              </div>

              <div style={{ backgroundColor: '#f0f0f0', padding: '8px', borderRadius: '4px', fontSize: '12px' }}>
                <strong>当前筛选条件：</strong>
                {filterProvince && <span>省份：{filterProvince} </span>}
                {searchText && <span>搜索：{searchText} </span>}
                {!filterProvince && !searchText && <span>无筛选条件（所有员工）</span>}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
};

export default StaffManagement; 