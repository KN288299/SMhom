import React, { useState } from 'react';
import { Button, Space, Card, message } from 'antd';
import { DownloadOutlined, ImportOutlined } from '@ant-design/icons';

const TestButtons: React.FC = () => {
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  const handleExport = () => {
    setExportLoading(true);
    message.info('导出按钮点击成功！');
    setTimeout(() => {
      setExportLoading(false);
    }, 2000);
  };

  const handleImport = () => {
    setImportLoading(true);
    message.info('导入按钮点击成功！');
    setTimeout(() => {
      setImportLoading(false);
    }, 2000);
  };

  return (
    <div style={{ padding: '20px' }}>
      <Card title="按钮测试页面" style={{ marginBottom: '20px' }}>
        <p>这个页面用于测试导入导出按钮是否能够正确显示和响应。</p>
      </Card>

      <Card title="按钮区域">
        <Space>
          <Button 
            icon={<DownloadOutlined />} 
            onClick={handleExport}
            loading={exportLoading}
            type="default"
          >
            导出数据
          </Button>
          
          <Button 
            icon={<ImportOutlined />} 
            onClick={handleImport}
            loading={importLoading}
            type="default"
          >
            导入数据
          </Button>
          
          <Button type="primary">
            测试按钮
          </Button>
        </Space>
      </Card>

      <Card title="调试信息" style={{ marginTop: '20px' }}>
        <p>导出按钮状态: {exportLoading ? '加载中' : '就绪'}</p>
        <p>导入按钮状态: {importLoading ? '加载中' : '就绪'}</p>
        <p>图标组件类型:</p>
        <ul>
          <li>DownloadOutlined: {typeof DownloadOutlined}</li>
          <li>ImportOutlined: {typeof ImportOutlined}</li>
        </ul>
      </Card>
    </div>
  );
};

export default TestButtons;
