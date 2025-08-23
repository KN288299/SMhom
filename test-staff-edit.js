#!/usr/bin/env node

/**
 * 测试员工编辑功能
 * 验证API是否正常工作
 */

const axios = require('axios');

const SERVER_BASE_URL = 'http://38.207.176.241:3000';

async function testStaffEdit() {
  console.log('🧪 开始测试员工编辑功能...\n');

  try {
    // 1. 获取员工列表
    console.log('📋 1. 获取员工列表...');
    const listResponse = await axios.get(`${SERVER_BASE_URL}/api/staff`);
    console.log(`✅ 获取到 ${listResponse.data.data?.length || 0} 名员工`);

    if (!listResponse.data.data || listResponse.data.data.length === 0) {
      console.log('❌ 没有员工数据，无法测试编辑功能');
      return;
    }

    // 2. 获取第一个员工详情
    const firstStaff = listResponse.data.data[0];
    console.log(`📋 2. 获取员工详情: ${firstStaff.name} (ID: ${firstStaff._id})`);
    
    const detailResponse = await axios.get(`${SERVER_BASE_URL}/api/staff/${firstStaff._id}`);
    console.log('✅ 员工详情获取成功:', {
      name: detailResponse.data.name,
      age: detailResponse.data.age,
      job: detailResponse.data.job,
      province: detailResponse.data.province,
      photos: detailResponse.data.photos?.length || 0
    });

    // 3. 测试更新员工信息（不包含文件）
    console.log('📋 3. 测试更新员工信息...');
    const updateData = new FormData();
    updateData.append('name', `${firstStaff.name}_测试更新`);
    updateData.append('age', firstStaff.age);
    updateData.append('job', firstStaff.job);
    updateData.append('province', firstStaff.province || '北京市');
    updateData.append('description', '这是测试更新的描述');
    updateData.append('tag', '测试标签');

    const updateResponse = await axios.put(`${SERVER_BASE_URL}/api/staff/${firstStaff._id}`, updateData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    console.log('✅ 员工信息更新成功:', {
      name: updateResponse.data.name,
      description: updateResponse.data.description,
      tag: updateResponse.data.tag
    });

    // 4. 恢复原数据
    console.log('📋 4. 恢复原数据...');
    const restoreData = new FormData();
    restoreData.append('name', firstStaff.name);
    restoreData.append('age', firstStaff.age);
    restoreData.append('job', firstStaff.job);
    restoreData.append('province', firstStaff.province || '北京市');
    restoreData.append('description', firstStaff.description || '');
    restoreData.append('tag', firstStaff.tag || '可预约');

    const restoreResponse = await axios.put(`${SERVER_BASE_URL}/api/staff/${firstStaff._id}`, restoreData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    console.log('✅ 员工数据恢复成功');

    // 5. 测试API端点
    console.log('📋 5. 测试API端点...');
    
    // 测试获取员工列表
    const listTest = await axios.get(`${SERVER_BASE_URL}/api/staff?limit=5`);
    console.log('✅ 获取员工列表API正常');
    
    // 测试获取单个员工
    const singleTest = await axios.get(`${SERVER_BASE_URL}/api/staff/${firstStaff._id}`);
    console.log('✅ 获取单个员工API正常');
    
    // 测试删除员工（软删除）
    console.log('📋 6. 测试删除员工（软删除）...');
    const deleteResponse = await axios.delete(`${SERVER_BASE_URL}/api/staff/${firstStaff._id}`);
    console.log('✅ 员工删除成功:', deleteResponse.data.message);

    console.log('\n🎉 所有测试通过！员工编辑功能正常工作');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('错误状态码:', error.response.status);
      console.error('错误详情:', error.response.data);
    }
  }
}

// 运行测试
testStaffEdit(); 