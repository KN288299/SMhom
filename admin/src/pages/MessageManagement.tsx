import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Input, Modal, Radio, Select, Space, Switch, Table, Tag, message, Upload } from 'antd';
import { PlusOutlined, UploadOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import Layout from '../components/Layout';
import { SERVER_BASE_URL, customerServiceAPI } from '../api/api';

interface AutoMessageItem {
  contentType: 'text' | 'image' | 'voice' | 'video';
  content?: string;
  fileUrl?: string;
  voiceUrl?: string;
  voiceDuration?: string;
  imageUrl?: string;
  videoUrl?: string;
  videoDuration?: string;
  videoWidth?: number;
  videoHeight?: number;
  aspectRatio?: number;
}

interface AutoMessageRule {
  _id?: string;
  name: string;
  enabled: boolean;
  trigger: 'user_enter_home';
  initialDelaySeconds: number;
  customerServiceId: string;
  messages: AutoMessageItem[];
}

const MessageManagement: React.FC = () => {
  const [rules, setRules] = useState<AutoMessageRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [csList, setCsList] = useState<any[]>([]);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoMessageRule | null>(null);
  const [form] = Form.useForm<AutoMessageRule>();

  // 加载客服列表
  useEffect(() => {
    const loadCS = async () => {
      try {
        const list = await customerServiceAPI.getCustomerServices();
        setCsList(list || []);
      } catch (e) {
        console.error(e);
      }
    };
    loadCS();
  }, []);

  // 加载规则列表
  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SERVER_BASE_URL}/api/auto-messages`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
      });
      const data = await res.json();
      setRules(Array.isArray(data) ? data : []);
    } catch (e) {
      message.error('加载规则失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const openCreate = () => {
    setEditingRule(null);
    setEditorVisible(true);
    form.setFieldsValue({
      name: '进入首页自动消息',
      enabled: true,
      trigger: 'user_enter_home',
      initialDelaySeconds: 10,
      customerServiceId: undefined as any,
      messages: [],
    } as any);
  };

  const openEdit = (record: AutoMessageRule) => {
    setEditingRule(record);
    setEditorVisible(true);
    form.setFieldsValue(record as any);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const method = editingRule?._id ? 'PUT' : 'POST';
      const url = editingRule?._id
        ? `${SERVER_BASE_URL}/api/auto-messages/${editingRule._id}`
        : `${SERVER_BASE_URL}/api/auto-messages`;
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error('保存失败');
      message.success('保存成功');
      setEditorVisible(false);
      fetchRules();
    } catch (e: any) {
      message.error(e.message || '保存失败');
    }
  };

  const handleDelete = async (record: AutoMessageRule) => {
    Modal.confirm({
      title: '确认删除该规则？',
      onOk: async () => {
        try {
          const res = await fetch(`${SERVER_BASE_URL}/api/auto-messages/${record._id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
          });
          if (!res.ok) throw new Error('删除失败');
          message.success('删除成功');
          fetchRules();
        } catch (e: any) {
          message.error(e.message || '删除失败');
        }
      },
    });
  };

  const columns = [
    { title: '名称', dataIndex: 'name' },
    { title: '状态', dataIndex: 'enabled', render: (v: boolean) => (v ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>) },
    { title: '触发', dataIndex: 'trigger', render: () => '进入首页' },
    { title: '首条延迟(秒)', dataIndex: 'initialDelaySeconds' },
    { title: '客服', dataIndex: 'customerServiceId', render: (id: string) => csList.find(x => x._id === id)?.name || id },
    { title: '消息数', dataIndex: 'messages', render: (arr: AutoMessageItem[]) => arr?.length || 0 },
    {
      title: '操作',
      render: (_: any, record: AutoMessageRule) => (
        <Space>
          <Button type="link" onClick={() => openEdit(record)}>编辑</Button>
          <Button danger type="link" onClick={() => handleDelete(record)}>删除</Button>
        </Space>
      ),
    },
  ];

  // 动态消息项编辑器
  const MessagesEditor: React.FC = () => {
    const [items, setItems] = useState<AutoMessageItem[]>(form.getFieldValue('messages') || []);

    useEffect(() => {
      form.setFieldsValue({ messages: items } as any);
    }, [items]);

    const addItem = () => setItems([...items, { contentType: 'text', content: '' }]);
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

    const updateItem = (index: number, patch: Partial<AutoMessageItem>) => {
      const next = [...items];
      next[index] = { ...next[index], ...patch } as AutoMessageItem;
      setItems(next);
    };

    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        {items.map((item, index) => (
          <Card key={index} size="small" title={`消息 ${index + 1}`} extra={<Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeItem(index)} />}> 
            <Space direction="vertical" style={{ width: '100%' }}>
              <Radio.Group value={item.contentType} onChange={e => updateItem(index, { contentType: e.target.value })}>
                <Radio.Button value="text">文字</Radio.Button>
                <Radio.Button value="image">图片</Radio.Button>
                <Radio.Button value="voice">语音</Radio.Button>
                <Radio.Button value="video">视频</Radio.Button>
              </Radio.Group>

              {item.contentType === 'text' && (
                <Input.TextArea rows={3} placeholder="请输入文本内容" value={item.content} onChange={e => updateItem(index, { content: e.target.value })} />
              )}

              {item.contentType === 'image' && (
                <Input placeholder="图片URL，如 /uploads/chat-images/xxx.jpg" value={item.imageUrl || item.fileUrl} onChange={e => updateItem(index, { imageUrl: e.target.value, fileUrl: e.target.value })} />
              )}

              {item.contentType === 'voice' && (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Input placeholder="语音URL (支持 .mp3/.m4a/.wav/.aac)" value={item.voiceUrl || item.fileUrl} onChange={e => updateItem(index, { voiceUrl: e.target.value, fileUrl: e.target.value })} />
                  <Input placeholder="时长 00:00" value={item.voiceDuration} onChange={e => updateItem(index, { voiceDuration: e.target.value })} />
                </Space>
              )}

              {item.contentType === 'video' && (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Input placeholder="视频URL" value={item.videoUrl || item.fileUrl} onChange={e => updateItem(index, { videoUrl: e.target.value, fileUrl: e.target.value })} />
                  <Input placeholder="时长 00:00" value={item.videoDuration} onChange={e => updateItem(index, { videoDuration: e.target.value })} />
                </Space>
              )}
            </Space>
          </Card>
        ))}

        <Button onClick={addItem} icon={<PlusOutlined />}>添加消息</Button>
      </Space>
    );
  };

  return (
    <Layout>
      <Card title="消息管理">
        <Space style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>添加自动发送消息规则</Button>
          <Button onClick={fetchRules}>刷新</Button>
        </Space>
        <Table rowKey="_id" loading={loading} dataSource={rules} columns={columns as any} pagination={{ pageSize: 10 }} />
      </Card>

      <Modal
        open={editorVisible}
        title={editingRule ? '编辑规则' : '新建规则'}
        onCancel={() => setEditorVisible(false)}
        onOk={handleSave}
        okText="保存"
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="规则名称" name="name" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="规则名称" />
          </Form.Item>
          <Form.Item label="启用" name="enabled" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          <Form.Item label="触发事件" name="trigger" initialValue={'user_enter_home'}>
            <Select options={[{ label: '进入首页', value: 'user_enter_home' }]} />
          </Form.Item>
          <Form.Item label="首条消息延迟(秒)" name="initialDelaySeconds" initialValue={10} rules={[{ required: true }]}>
            <Input type="number" min={0} />
          </Form.Item>
          <Form.Item label="客服账号" name="customerServiceId" rules={[{ required: true, message: '请选择客服' }]}>
            <Select placeholder="选择客服" options={csList.map(cs => ({ label: cs.name, value: cs._id }))} />
          </Form.Item>

          <Form.Item label="自动发送的消息（按顺序）" name="messages" rules={[{ validator: async (_, v) => { if (!v || !v.length) throw new Error('请至少添加一条消息'); } }]}>
            <MessagesEditor />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default MessageManagement;


