const { firebasePushV1 } = require('./firebase-push-v1');
const fs = require('fs');

/**
 * Firebase Cloud Messaging HTTP v1 API 测试脚本
 * 使用新版API和服务账号密钥
 */

// 配置信息
const CONFIG = {
  serviceAccountPath: './serviceAccountKey.json',
  projectId: 'homeservicechat-dd8d3', // 你的Firebase项目ID
  testFCMToken: 'your_test_fcm_token_here', // 替换为实际的FCM Token
};

// 加载服务账号密钥
function loadServiceAccount() {
  try {
    if (!fs.existsSync(CONFIG.serviceAccountPath)) {
      throw new Error(`服务账号密钥文件不存在: ${CONFIG.serviceAccountPath}`);
    }
    
    const serviceAccount = JSON.parse(fs.readFileSync(CONFIG.serviceAccountPath, 'utf8'));
    console.log('✅ 服务账号密钥加载成功');
    return serviceAccount;
  } catch (error) {
    console.error('❌ 加载服务账号密钥失败:', error.message);
    console.log('\n📋 获取服务账号密钥步骤:');
    console.log('1. 访问 Firebase 控制台: https://console.firebase.google.com/');
    console.log('2. 选择你的项目');
    console.log('3. 点击 ⚙️ (设置) → 项目设置');
    console.log('4. 选择"服务账号"标签页');
    console.log('5. 点击"生成新的私钥"');
    console.log('6. 下载JSON文件并重命名为 serviceAccountKey.json');
    throw error;
  }
}

// 测试消息推送
async function testMessagePush() {
  console.log('\n📨 测试消息推送...');
  console.log('==================');
  
  try {
    const result = await firebasePushV1.sendMessagePush(
      CONFIG.testFCMToken,
      '测试发送者',
      '这是一条使用Firebase HTTP v1 API发送的测试消息！支持emoji 🚀',
      'test_conversation_123'
    );
    
    console.log('✅ 消息推送发送成功');
    console.log('📤 推送ID:', result);
    return true;
  } catch (error) {
    console.error('❌ 消息推送失败:', error.message);
    return false;
  }
}

// 测试来电推送
async function testCallPush() {
  console.log('\n📞 测试来电推送...');
  console.log('==================');
  
  try {
    const result = await firebasePushV1.sendCallPush(
      CONFIG.testFCMToken,
      '张三客服',
      'call_test_456',
      'test_conversation_456'
    );
    
    console.log('✅ 来电推送发送成功');
    console.log('📤 推送ID:', result);
    return true;
  } catch (error) {
    console.error('❌ 来电推送失败:', error.message);
    return false;
  }
}

// 测试系统推送
async function testSystemPush() {
  console.log('\n🔔 测试系统推送...');
  console.log('==================');
  
  try {
    const result = await firebasePushV1.sendSystemPush(
      CONFIG.testFCMToken,
      'Firebase HTTP v1 API',
      '恭喜！你的推送系统已升级到最新版本 🎉',
      { 
        version: 'v1',
        upgrade: 'true',
        timestamp: new Date().toISOString()
      }
    );
    
    console.log('✅ 系统推送发送成功');
    console.log('📤 推送ID:', result);
    return true;
  } catch (error) {
    console.error('❌ 系统推送失败:', error.message);
    return false;
  }
}

// 测试直接HTTP v1 API调用
async function testDirectV1API() {
  console.log('\n🌐 测试直接HTTP v1 API调用...');
  console.log('==============================');
  
  try {
    const serviceAccount = loadServiceAccount();
    
    // 获取访问令牌
    await firebasePushV1.getAccessToken(serviceAccount);
    
    // 构造消息
    const message = {
      notification: {
        title: 'HTTP v1 API直接调用',
        body: '这是直接使用HTTP v1 API发送的消息',
      },
      data: {
        type: 'direct_api_test',
        timestamp: Date.now().toString(),
      },
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#FF9500',
        },
      },
    };
    
    const result = await firebasePushV1.sendMessageV1(CONFIG.testFCMToken, message);
    
    console.log('✅ HTTP v1 API直接调用成功');
    console.log('📤 响应:', result);
    return true;
  } catch (error) {
    console.error('❌ HTTP v1 API直接调用失败:', error.message);
    return false;
  }
}

// 对比新旧API差异
function showAPIComparison() {
  console.log('\n📊 新旧API对比:');
  console.log('===============');
  console.log('');
  console.log('🔴 旧版API (Legacy):');
  console.log('   • 使用服务器密钥 (Server Key)');
  console.log('   • 端点: https://fcm.googleapis.com/fcm/send');
  console.log('   • Authorization: key=<server_key>');
  console.log('   • 功能较为基础');
  console.log('   • 将在2024年6月20日之后逐步弃用');
  console.log('');
  console.log('🟢 新版API (HTTP v1):');
  console.log('   • 使用服务账号密钥 (Service Account)');
  console.log('   • 端点: https://fcm.googleapis.com/v1/projects/{project-id}/messages:send');
  console.log('   • Authorization: Bearer <access_token>');
  console.log('   • 支持更丰富的推送配置');
  console.log('   • 更好的错误处理和安全性');
  console.log('   • 官方推荐，长期支持');
  console.log('');
  console.log('💡 推荐使用:');
  console.log('   • Firebase Admin SDK (自动处理认证)');
  console.log('   • 或直接HTTP v1 API调用');
}

// 显示迁移建议
function showMigrationAdvice() {
  console.log('\n🔄 迁移建议:');
  console.log('=============');
  console.log('1. 立即升级到新版API避免服务中断');
  console.log('2. 下载并配置服务账号密钥');
  console.log('3. 测试所有推送功能');
  console.log('4. 逐步替换项目中的旧版API调用');
  console.log('5. 监控推送成功率和错误日志');
  console.log('');
  console.log('⚠️ 重要提醒:');
  console.log('   • 保管好服务账号密钥文件');
  console.log('   • 不要将密钥文件提交到版本控制');
  console.log('   • 定期轮换服务账号密钥');
}

// 主测试函数
async function runTests() {
  console.log('🚀 Firebase Cloud Messaging HTTP v1 API 测试');
  console.log('==============================================');
  console.log(`项目ID: ${CONFIG.projectId}`);
  console.log(`测试Token: ${CONFIG.testFCMToken.substring(0, 20)}...`);
  
  try {
    // 检查配置
    if (CONFIG.testFCMToken === 'your_test_fcm_token_here') {
      console.log('\n⚠️ 请先配置测试FCM Token');
      console.log('在CONFIG.testFCMToken中填入实际的设备Token');
      return;
    }
    
    // 加载服务账号
    const serviceAccount = loadServiceAccount();
    
    // 初始化Firebase推送服务
    console.log('\n🔄 初始化Firebase推送服务...');
    await firebasePushV1.initialize(serviceAccount, CONFIG.projectId);
    
    // 运行测试
    const tests = [
      { name: '消息推送', fn: testMessagePush },
      { name: '来电推送', fn: testCallPush },
      { name: '系统推送', fn: testSystemPush },
      { name: 'HTTP v1 API直接调用', fn: testDirectV1API },
    ];
    
    let passedTests = 0;
    
    for (const test of tests) {
      const passed = await test.fn();
      if (passed) passedTests++;
      
      // 等待2秒避免频率限制
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // 显示结果
    console.log('\n📊 测试结果:');
    console.log('============');
    console.log(`✅ 通过: ${passedTests}/${tests.length}`);
    console.log(`❌ 失败: ${tests.length - passedTests}/${tests.length}`);
    
    if (passedTests === tests.length) {
      console.log('\n🎉 所有测试通过！Firebase HTTP v1 API配置正确');
    } else {
      console.log('\n⚠️ 部分测试失败，请检查配置和网络连接');
    }
    
    // 显示API对比和迁移建议
    showAPIComparison();
    showMigrationAdvice();
    
  } catch (error) {
    console.error('\n❌ 测试过程中出现错误:', error.message);
    console.log('\n🔧 排查建议:');
    console.log('1. 检查服务账号密钥文件是否正确');
    console.log('2. 确认Firebase项目ID是否正确');
    console.log('3. 检查网络连接');
    console.log('4. 确认FCM Token是否有效');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  testMessagePush,
  testCallPush,
  testSystemPush,
  testDirectV1API,
  CONFIG,
}; 