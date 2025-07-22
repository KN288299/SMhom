import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  message, 
  Space,
  Typography,
  Divider,
  Row,
  Col,
  Alert,
  Upload,
  Image,
  Modal,
  List,
  Popconfirm
} from 'antd';
import { SaveOutlined, ReloadOutlined, EditOutlined, PlusOutlined, DeleteOutlined, EyeOutlined, UploadOutlined } from '@ant-design/icons';
import Layout from '../components/Layout';
import { updatePageConfig, getPageConfig, uploadPageImage, deletePageImage, SERVER_BASE_URL } from '../api/api';
import type { RcFile, UploadProps } from 'antd/es/upload';
import type { UploadFile } from 'antd/es/upload/interface';

const { Title, Text } = Typography;

interface PageConfig {
  centerButtonText: string;
  centerButtonColor: string;
  bannerImages?: string[];
}

interface PageImage {
  id: string;
  url: string;
  filename: string;
  uploadTime: string;
  previewUrl?: string;
}

const PageManagement: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [config, setConfig] = useState<PageConfig>({
    centerButtonText: '御足堂',
    centerButtonColor: '#ff6b81',
    bannerImages: []
  });
  const [pageImages, setPageImages] = useState<PageImage[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');

  // 加载页面配置
  const loadPageConfig = async () => {
    setLoading(true);
    try {
      const response = await getPageConfig();
      if (response.data) {
        setConfig(response.data);
        form.setFieldsValue(response.data);
        // 将bannerImages转换为PageImage格式
        const images = (response.data.bannerImages || []).map((url: string, index: number) => ({
          id: `existing-${index}`,
          url,
          filename: `图片${index + 1}`,
          uploadTime: '已存在'
        }));
        console.log('📄 [PageManagement] 加载的图片列表:', images);
        console.log('📄 [PageManagement] 原始bannerImages:', response.data.bannerImages);
        
        setPageImages(images);
      }
    } catch (error) {
      console.error('加载页面配置失败:', error);
      message.error('加载页面配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存页面配置
  const handleSave = async (values: PageConfig) => {
    setSaveLoading(true);
    try {
      // 包含图片配置
      const configWithImages = {
        ...values,
        bannerImages: pageImages.map(img => img.url),
        appName: '御足堂交友', // 保持默认值
        homeTitle: '推荐' // 保持默认值
      };
      await updatePageConfig(configWithImages);
      setConfig(configWithImages);
      message.success('页面配置保存成功');
    } catch (error) {
      console.error('保存页面配置失败:', error);
      message.error('保存页面配置失败');
    } finally {
      setSaveLoading(false);
    }
  };

  // 图片上传前验证
  const beforeUpload = (file: RcFile) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
      message.error('只能上传JPG/PNG格式的图片!');
    }
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('图片大小不能超过10MB!');
    }
    return isJpgOrPng && isLt10M;
  };

  // 将File对象转换为base64
  const getBase64 = (img: RcFile, callback: (url: string) => void) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => callback(reader.result as string));
    reader.readAsDataURL(img);
  };

  // 格式化图片URL
  const formatImageUrl = (imageUrl: string) => {
    if (imageUrl.startsWith('http') || imageUrl.startsWith('data:')) {
      return imageUrl;
    }
    return `${SERVER_BASE_URL}${imageUrl}`;
  };

  // 处理图片上传
  const handleUpload = async (file: RcFile) => {
    setUploadLoading(true);
    try {
      const response = await uploadPageImage(file);
      
      // 创建新图片项，先用base64进行预览
      getBase64(file, (base64Url) => {
        const newImage: PageImage = {
          id: Date.now().toString(),
          url: response.imageUrl, // 服务器URL用于保存
          filename: file.name,
          uploadTime: new Date().toLocaleString(),
          previewUrl: base64Url // 添加预览URL
        };
        setPageImages(prev => [...prev, newImage]);
      });
      
      message.success('图片上传成功');
    } catch (error) {
      console.error('上传图片失败:', error);
      message.error('上传图片失败');
    } finally {
      setUploadLoading(false);
    }
    return false; // 阻止默认上传行为
  };

  // 删除图片
  const handleDeleteImage = async (imageId: string) => {
    try {
      const image = pageImages.find(img => img.id === imageId);
      if (image) {
        await deletePageImage(image.url);
        setPageImages(prev => prev.filter(img => img.id !== imageId));
        message.success('图片删除成功');
      }
    } catch (error) {
      console.error('删除图片失败:', error);
      message.error('删除图片失败');
    }
  };

  // 预览图片
  const handlePreview = (imageUrl: string) => {
    setPreviewImage(imageUrl);
    setPreviewVisible(true);
  };

  // 重置配置
  const handleReset = () => {
    form.setFieldsValue(config);
    message.info('已重置为当前保存的配置');
  };

  useEffect(() => {
    loadPageConfig();
  }, []);

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        <Title level={2}>
          <EditOutlined /> 页面管理
        </Title>
        <Text type="secondary">
          管理APP中的页面设置，包括按键文字、颜色、轮播图片等配置
        </Text>
        
        <Divider />

        <Row gutter={24}>
          <Col span={16}>
            <Card title="页面配置" loading={loading}>
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSave}
                initialValues={config}
              >
                {/* 中间按键配置 */}
                <Card size="small" title="导航栏中间按键" style={{ marginBottom: 16 }}>
                  <Form.Item
                    label="按键文字"
                    name="centerButtonText"
                    rules={[
                      { required: true, message: '请输入按键文字' },
                      { max: 10, message: '按键文字不能超过10个字符' }
                    ]}
                  >
                    <Input 
                      placeholder="御足堂" 
                      maxLength={10}
                      showCount
                    />
                  </Form.Item>
                  
                  <Form.Item
                    label="按键颜色"
                    name="centerButtonColor"
                    rules={[{ required: true, message: '请输入按键颜色' }]}
                  >
                    <Input 
                      placeholder="#ff6b81" 
                      addonBefore="颜色代码"
                    />
                  </Form.Item>
                </Card>

                {/* 轮播图片配置 */}
                <Card size="small" title="页面轮播图片" style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 16 }}>
                    <Upload
                      beforeUpload={beforeUpload}
                      customRequest={({ file }) => handleUpload(file as RcFile)}
                      showUploadList={false}
                      accept="image/*"
                    >
                      <Button 
                        icon={<UploadOutlined />} 
                        loading={uploadLoading}
                        type="dashed"
                      >
                        上传图片
                      </Button>
                    </Upload>
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      支持JPG、PNG格式，推荐尺寸1920x1080
                    </Text>
                  </div>

                  {pageImages.length > 0 && (
                    <List
                      grid={{ column: 2, gutter: 16 }}
                      dataSource={pageImages}
                      renderItem={(item) => (
                        <List.Item>
                          <Card
                            size="small"
                            cover={
                              <div style={{ height: 120, overflow: 'hidden' }}>
                                <Image
                                  src={formatImageUrl(item.previewUrl || item.url)}
                                  alt={item.filename}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  preview={false}
                                  onError={(e) => {
                                    console.error('📄 [PageManagement] 图片加载失败:', item.url);
                                    console.error('📄 [PageManagement] 完整URL:', formatImageUrl(item.previewUrl || item.url));
                                  }}
                                />
                              </div>
                            }
                            actions={[
                              <EyeOutlined 
                                key="preview" 
                                onClick={() => handlePreview(formatImageUrl(item.previewUrl || item.url))} 
                              />,
                              <Popconfirm
                                key="delete"
                                title="确定删除这张图片吗？"
                                onConfirm={() => handleDeleteImage(item.id)}
                              >
                                <DeleteOutlined />
                              </Popconfirm>
                            ]}
                          >
                            <Card.Meta
                              title={item.filename}
                              description={`上传时间: ${item.uploadTime}`}
                            />
                          </Card>
                        </List.Item>
                      )}
                    />
                  )}
                </Card>

                <Form.Item>
                  <Space>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      loading={saveLoading}
                      icon={<SaveOutlined />}
                    >
                      保存配置
                    </Button>
                    <Button 
                      onClick={handleReset}
                      icon={<ReloadOutlined />}
                    >
                      重置
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          <Col span={8}>
            <Card title="预览效果" size="small">
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Text strong>中间按键预览：</Text>
                <div style={{ marginTop: 16, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 70,
                      height: 70,
                      backgroundColor: form.getFieldValue('centerButtonColor') || config.centerButtonColor,
                      borderRadius: 35,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      margin: '0 auto',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}
                  >
                    <span style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                      {form.getFieldValue('centerButtonText') || config.centerButtonText}
                    </span>
                  </div>
                </div>
                
                {pageImages.length > 0 && (
                  <>
                    <Divider />
                    <Text strong>轮播图预览：</Text>
                    <div style={{ marginTop: 16 }}>
                      <div style={{ 
                        width: '100%', 
                        height: 120, 
                        border: '1px solid #d9d9d9',
                        borderRadius: 4,
                        overflow: 'hidden'
                      }}>
                        <Image
                          src={formatImageUrl(pageImages[0]?.previewUrl || pageImages[0]?.url || '')}
                          alt="轮播图预览"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        共{pageImages.length}张图片
                      </Text>
                    </div>
                  </>
                )}
              </div>
            </Card>

            <Alert
              message="提示"
              description="修改配置后，APP需要重新启动才能生效。图片建议使用横向1920x1080分辨率。"
              type="info"
              showIcon
              style={{ marginTop: 16 }}
            />
          </Col>
        </Row>

        {/* 图片预览Modal */}
        <Modal
          open={previewVisible}
          title="图片预览"
          footer={null}
          onCancel={() => setPreviewVisible(false)}
          width={800}
        >
          <Image
            src={previewImage}
            alt="预览"
            style={{ width: '100%' }}
          />
        </Modal>
      </div>
    </Layout>
  );
};

export default PageManagement; 