const axios = require('axios');

async function checkServerAPI() {
  try {
    console.log('检查服务器上的 API 文件...');
    
    // 检查服务器是否运行
    const healthCheck = await axios.get('http://38.207.176.241:3000/health');
    console.log('服务器健康检查:', healthCheck.data);
    
    // 检查 staff API 端点
    const staffEndpoints = [
        'http://38.207.176.241:3000/api/staff',
  'http://38.207.176.241:3000/api/staff/export',
  'http://38.207.176.241:3000/api/staff/import'
    ];
    
    for (const endpoint of staffEndpoints) {
      try {
        const response = await axios.get(endpoint);
        console.log(`✅ ${endpoint} - 状态: ${response.status}`);
      } catch (error) {
        if (error.response) {
          console.log(`❌ ${endpoint} - 状态: ${error.response.status} - ${error.response.statusText}`);
        } else {
          console.log(`❌ ${endpoint} - 连接失败: ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('检查失败:', error.message);
  }
}

checkServerAPI();
