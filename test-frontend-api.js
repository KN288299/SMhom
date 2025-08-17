const axios = require('axios');

const SERVER_BASE_URL = 'http://38.207.178.173:3000';

async function testFrontendAPI() {
  console.log('🧪 测试前端API调用...\n');

  try {
    // 1. 测试获取员工列表
    console.log('📋 1. 测试获取员工列表...');
    const listResponse = await axios.get(`${SERVER_BASE_URL}/api/staff`);
    console.log('✅ 员工列表获取成功，数量:', listResponse.data.length || listResponse.data.data?.length || 0);

    if (listResponse.data.length > 0 || (listResponse.data.data && listResponse.data.data.length > 0)) {
      const staffList = listResponse.data.data || listResponse.data;
      const firstStaff = staffList[0];
      
      console.log('📋 2. 测试获取单个员工详情...');
      console.log('员工ID:', firstStaff._id || firstStaff.id);
      
      const detailResponse = await axios.get(`${SERVER_BASE_URL}/api/staff/${firstStaff._id || firstStaff.id}`);
      console.log('✅ 员工详情获取成功:', detailResponse.data.name);

      // 3. 测试更新员工信息
      console.log('📋 3. 测试更新员工信息...');
      const updateData = new FormData();
      updateData.append('name', `${detailResponse.data.name}_前端测试`);
      updateData.append('description', '这是前端测试更新的描述');
      updateData.append('tag', '前端测试标签');

      const updateResponse = await axios.put(`${SERVER_BASE_URL}/api/staff/${firstStaff._id || firstStaff.id}`, updateData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log('✅ 员工信息更新成功:', updateResponse.data.name);

      // 4. 恢复原数据
      console.log('📋 4. 恢复原数据...');
      const restoreData = new FormData();
      restoreData.append('name', detailResponse.data.name);
      restoreData.append('description', detailResponse.data.description || '');
      restoreData.append('tag', detailResponse.data.tag || '可预约');

      const restoreResponse = await axios.put(`${SERVER_BASE_URL}/api/staff/${firstStaff._id || firstStaff.id}`, restoreData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log('✅ 员工数据恢复成功');
    }

    console.log('\n🎉 前端API测试通过！');
  } catch (error) {
    console.error('❌ 前端API测试失败:', error.response?.data || error.message);
  }
}

testFrontendAPI(); 