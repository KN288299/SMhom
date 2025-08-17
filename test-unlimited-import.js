#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// 服务器配置
const SERVER_BASE_URL = 'http://localhost:3000';

// 创建大型测试数据
function createLargeTestData(staffCount = 10000) {
  console.log(`📊 正在生成 ${staffCount} 名员工的测试数据...`);
  
  const provinces = ['北京市', '上海市', '广东省', '浙江省', '江苏省', '四川省', '湖北省', '河南省'];
  const jobs = ['客服专员', '技术工程师', '市场专员', '销售代表', '产品经理', '运营专员', '设计师', '数据分析师'];
  
  const staff = [];
  
  for (let i = 1; i <= staffCount; i++) {
    staff.push({
      name: `员工${i.toString().padStart(5, '0')}`,
      age: Math.floor(Math.random() * 30) + 22, // 22-52岁
      job: jobs[Math.floor(Math.random() * jobs.length)],
      province: provinces[Math.floor(Math.random() * provinces.length)],
      height: Math.floor(Math.random() * 30) + 160, // 160-190cm
      weight: Math.floor(Math.random() * 40) + 50,  // 50-90kg
      description: `这是测试员工${i}的详细描述信息，用于验证大量数据导入功能。`,
      tag: i % 2 === 0 ? '可预约' : '忙碌中'
    });
    
    if (i % 1000 === 0) {
      console.log(`✅ 已生成 ${i} 名员工数据`);
    }
  }
  
  return {
    exportDate: new Date().toISOString(),
    version: '1.0',
    totalCount: staff.length,
    staff: staff
  };
}

// 测试无限制导入功能
async function testUnlimitedImport() {
  console.log('🧪 开始测试无限制员工数据导入功能...\n');
  
  try {
    // 1. 小数据量测试 (100员工)
    console.log('📋 1. 测试小数据量导入 (100员工)...');
    await testImportWithSize(100, 'small');
    
    // 2. 中等数据量测试 (1000员工)
    console.log('\n📋 2. 测试中等数据量导入 (1000员工)...');
    await testImportWithSize(1000, 'medium');
    
    // 3. 大数据量测试 (10000员工)
    console.log('\n📋 3. 测试大数据量导入 (10000员工)...');
    await testImportWithSize(10000, 'large');
    
    // 4. 超大数据量测试 (50000员工) - 可选
    const testMega = process.argv.includes('--mega');
    if (testMega) {
      console.log('\n📋 4. 测试超大数据量导入 (50000员工)...');
      await testImportWithSize(50000, 'mega');
    } else {
      console.log('\n⏭️ 跳过超大数据量测试 (使用 --mega 参数启用)');
    }
    
    console.log('\n🎉 所有测试完成！');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 测试指定大小的数据导入
async function testImportWithSize(staffCount, sizeName) {
  const startTime = Date.now();
  
  try {
    // 创建测试数据
    const testData = createLargeTestData(staffCount);
    const fileName = `test-staff-${sizeName}-${staffCount}.json`;
    
    // 写入文件
    console.log(`💾 正在保存测试文件: ${fileName}`);
    fs.writeFileSync(fileName, JSON.stringify(testData, null, 2));
    
    // 获取文件大小
    const fileStats = fs.statSync(fileName);
    const fileSizeMB = (fileStats.size / 1024 / 1024).toFixed(2);
    console.log(`📁 文件大小: ${fileSizeMB} MB`);
    
    // 准备表单数据
    const formData = new FormData();
    formData.append('file', fs.createReadStream(fileName));
    
    // 发送导入请求
    console.log('📤 正在上传并导入数据...');
    const response = await axios.post(
      `${SERVER_BASE_URL}/api/staff/import`,
      formData,
      {
        headers: {
          ...formData.getHeaders()
        },
        timeout: 300000, // 5分钟超时
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    // 输出结果
    console.log(`✅ ${sizeName} 数据导入成功！`);
    console.log(`📊 导入结果:`, response.data.results);
    console.log(`⏱️ 耗时: ${duration} 秒`);
    console.log(`🚀 处理速度: ${(staffCount / duration).toFixed(0)} 员工/秒`);
    
    // 清理测试文件
    fs.unlinkSync(fileName);
    console.log(`🧹 已清理测试文件: ${fileName}`);
    
  } catch (error) {
    console.error(`❌ ${sizeName} 数据导入失败:`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      data: error.response?.data
    });
    
    // 清理文件
    const fileName = `test-staff-${sizeName}-${staffCount}.json`;
    if (fs.existsSync(fileName)) {
      fs.unlinkSync(fileName);
    }
    
    throw error;
  }
}

// 测试服务器健康状态
async function checkServerHealth() {
  try {
    console.log('🏥 检查服务器健康状态...');
    const response = await axios.get(`${SERVER_BASE_URL}/api/health`, { timeout: 5000 });
    console.log('✅ 服务器运行正常');
    return true;
  } catch (error) {
    console.error('❌ 服务器健康检查失败:', error.message);
    return false;
  }
}

// 主函数
async function main() {
  console.log('🚀 员工数据无限制导入测试工具');
  console.log('=====================================');
  console.log(`🌐 服务器地址: ${SERVER_BASE_URL}`);
  console.log('📋 测试计划:');
  console.log('  1. 小数据量 (100员工)');
  console.log('  2. 中等数据量 (1000员工)');
  console.log('  3. 大数据量 (10000员工)');
  console.log('  4. 超大数据量 (50000员工) - 可选');
  console.log('=====================================\n');
  
  // 检查服务器状态
  const isHealthy = await checkServerHealth();
  if (!isHealthy) {
    console.error('❌ 服务器未正常运行，请先启动服务器');
    process.exit(1);
  }
  
  // 执行测试
  await testUnlimitedImport();
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 程序执行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  createLargeTestData,
  testUnlimitedImport,
  testImportWithSize
};
