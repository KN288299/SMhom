const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

async function syncServerFile() {
  try {
    console.log('🔄 正在同步修复后的 server.js 文件到服务器...');
    
    // 检查 server.js 文件是否存在
    if (!fs.existsSync('server.js')) {
      console.error('❌ server.js 文件不存在');
      return;
    }
    
    // 使用 scp 上传文件到服务器
    const command = `scp -P 55122 server.js root@38.207.176.241:/opt/homeservice/`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ 上传失败:', error.message);
        return;
      }
      if (stderr) {
        console.error('⚠️ 警告:', stderr);
      }
      console.log('✅ server.js 文件上传成功');
      console.log('📋 输出:', stdout);
      
      // 重启服务器服务
      console.log('🔄 正在重启服务器服务...');
      const restartCommand = `ssh -p 55122 root@38.207.176.241 "cd /opt/homeservice && pm2 restart server.js"`;
      
      exec(restartCommand, (restartError, restartStdout, restartStderr) => {
        if (restartError) {
          console.error('❌ 重启失败:', restartError.message);
          return;
        }
        if (restartStderr) {
          console.error('⚠️ 重启警告:', restartStderr);
        }
        console.log('✅ 服务器服务重启成功');
        console.log('📋 重启输出:', restartStdout);
        
        // 检查服务状态
        console.log('🔍 检查服务状态...');
        const statusCommand = `ssh -p 55122 root@38.207.176.241 "pm2 status"`;
        
        exec(statusCommand, (statusError, statusStdout, statusStderr) => {
          if (statusError) {
            console.error('❌ 状态检查失败:', statusError.message);
            return;
          }
          console.log('📊 服务状态:');
          console.log(statusStdout);
        });
      });
    });
    
  } catch (error) {
    console.error('❌ 同步失败:', error.message);
  }
}

syncServerFile();
