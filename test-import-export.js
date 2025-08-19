/**
 * 测试员工数据导入导出功能
 * 使用前请确保服务器正在运行
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const SERVER_BASE_URL = 'http://localhost:3000';

// 测试导出功能
async function testExport() {
  try {
    console.log('\n📦 测试导出功能...');
    
    const response = await axios.get(`${SERVER_BASE_URL}/api/staff/export`, {
      responseType: 'arraybuffer'
    });

    // 保存导出的ZIP文件
    const exportPath = path.join(__dirname, 'staff-export-test.zip');
    fs.writeFileSync(exportPath, response.data);
    
    console.log('✅ 导出成功！文件已保存到:', exportPath);
    console.log('📊 文件大小:', Math.round(response.data.length / 1024), 'KB');
    
    return exportPath;
  } catch (error) {
    console.error('❌ 导出失败:', error.response?.data || error.message);
    return null;
  }
}

// 测试导入功能
async function testImport(filePath) {
  try {
    console.log('\n📥 测试导入功能...');
    
    if (!fs.existsSync(filePath)) {
      console.error('❌ 导入文件不存在:', filePath);
      return;
    }

    const FormData = require('form-data');
    const form = new FormData();
    
    form.append('file', fs.createReadStream(filePath));

    const response = await axios.post(`${SERVER_BASE_URL}/api/staff/import`, form, {
      headers: {
        ...form.getHeaders()
      }
    });

    console.log('✅ 导入成功！');
    console.log('📊 导入结果:', response.data.results);
    
  } catch (error) {
    console.error('❌ 导入失败:', error.response?.data || error.message);
  }
}

// 创建测试JSON数据
function createTestJsonData() {
  const testData = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    totalCount: 2,
    staff: [
      {
        name: '测试员工1',
        age: 25,
        job: '测试专员',
        province: '北京市',
        height: 170,
        weight: 60,
        description: '这是一个测试员工',
        tag: '测试'
      },
      {
        name: '测试员工2',
        age: 28,
        job: '测试经理',
        province: '上海市',
        height: 175,
        weight: 65,
        description: '这是另一个测试员工',
        tag: '测试'
      }
    ]
  };

  const testPath = path.join(__dirname, 'test-staff-data.json');
  fs.writeFileSync(testPath, JSON.stringify(testData, null, 2));
  console.log('✅ 测试JSON数据已创建:', testPath);
  return testPath;
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始测试员工导入导出功能...');
  
  // 1. 测试导出功能
  const exportPath = await testExport();
  
  if (exportPath) {
    // 2. 测试导入导出的ZIP文件
    await testImport(exportPath);
  }
  
  // 3. 测试导入JSON文件
  const jsonPath = createTestJsonData();
  await testImport(jsonPath);
  
  console.log('\n🎉 测试完成！');
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testExport, testImport, createTestJsonData };
