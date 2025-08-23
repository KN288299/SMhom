const axios = require('axios');

const SERVER_BASE_URL = 'http://38.207.176.241:3000';

async function testPagination() {
  console.log('🧪 测试分页功能...\n');

  try {
    // 测试第一页
    console.log('📋 1. 测试第一页数据...');
    const page1Response = await axios.get(`${SERVER_BASE_URL}/api/staff?page=1&limit=5`);
    console.log('✅ 第一页数据:', {
      count: page1Response.data.data.length,
      total: page1Response.data.meta.total,
      totalPages: page1Response.data.meta.totalPages,
      page: page1Response.data.meta.page
    });

    // 测试第二页
    console.log('\n📋 2. 测试第二页数据...');
    const page2Response = await axios.get(`${SERVER_BASE_URL}/api/staff?page=2&limit=5`);
    console.log('✅ 第二页数据:', {
      count: page2Response.data.data.length,
      total: page2Response.data.meta.total,
      totalPages: page2Response.data.meta.totalPages,
      page: page2Response.data.meta.page
    });

    // 测试不同limit
    console.log('\n📋 3. 测试不同limit...');
    const limit10Response = await axios.get(`${SERVER_BASE_URL}/api/staff?page=1&limit=10`);
    console.log('✅ limit=10 数据:', {
      count: limit10Response.data.data.length,
      total: limit10Response.data.meta.total,
      totalPages: limit10Response.data.meta.totalPages
    });

    // 测试省份筛选
    console.log('\n📋 4. 测试省份筛选...');
    const provinceResponse = await axios.get(`${SERVER_BASE_URL}/api/staff?page=1&limit=5&province=北京市`);
    console.log('✅ 北京市筛选数据:', {
      count: provinceResponse.data.data.length,
      total: provinceResponse.data.meta.total,
      totalPages: provinceResponse.data.meta.totalPages
    });

    // 测试搜索功能
    console.log('\n📋 5. 测试搜索功能...');
    const searchResponse = await axios.get(`${SERVER_BASE_URL}/api/staff?page=1&limit=5&search=客服`);
    console.log('✅ 搜索"客服"数据:', {
      count: searchResponse.data.data.length,
      total: searchResponse.data.meta.total,
      totalPages: searchResponse.data.meta.totalPages
    });

    console.log('\n🎉 分页功能测试完成！');
    
    // 总结
    console.log('\n📊 测试总结:');
    console.log('- 第一页数据量:', page1Response.data.data.length);
    console.log('- 第二页数据量:', page2Response.data.data.length);
    console.log('- 总员工数:', page1Response.data.meta.total);
    console.log('- 总页数:', page1Response.data.meta.totalPages);
    
    if (page1Response.data.data.length > 0 && page2Response.data.data.length > 0) {
      console.log('✅ 分页功能正常，可以加载更多数据');
    } else {
      console.log('⚠️ 数据量可能不足，无法测试分页');
    }

  } catch (error) {
    console.error('❌ 分页测试失败:', error.response?.data || error.message);
  }
}

testPagination(); 