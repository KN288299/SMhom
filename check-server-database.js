const fs = require('fs');
const path = require('path');

console.log('=== 检查服务器数据库配置 ===\n');

// 1. 检查 .env 文件
console.log('1. 检查 .env 文件:');
try {
  if (fs.existsSync('.env')) {
    const envContent = fs.readFileSync('.env', 'utf8');
    console.log('✅ .env 文件内容:');
    
    // 查找数据库相关配置
    const lines = envContent.split('\n');
    lines.forEach(line => {
      if (line.includes('MONGO') || line.includes('DB') || line.includes('DATABASE')) {
        console.log(`   ${line}`);
      }
    });
  } else {
    console.log('❌ 未找到 .env 文件');
  }
} catch (err) {
  console.log('❌ 读取 .env 文件失败:', err.message);
}

// 2. 检查主要的服务器文件
console.log('\n2. 检查主要服务器文件:');
const serverFiles = [
  'app.js',
  'server.js', 
  'index.js',
  'src/app.js',
  'src/server.js',
  'src/index.js'
];

for (const file of serverFiles) {
  if (fs.existsSync(file)) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      console.log(`\n📄 ${file}:`);
      
      // 查找数据库连接代码
      const lines = content.split('\n');
      let foundDbConfig = false;
      
      lines.forEach((line, index) => {
        if (line.includes('mongoose.connect') || 
            line.includes('MongoClient') ||
            line.includes('mongodb://') ||
            line.includes('process.env.MONGO') ||
            line.includes('process.env.DB')) {
          console.log(`   第${index + 1}行: ${line.trim()}`);
          foundDbConfig = true;
        }
      });
      
      if (!foundDbConfig) {
        console.log('   未找到明显的数据库连接配置');
      }
      
    } catch (err) {
      console.log(`   ❌ 读取失败: ${err.message}`);
    }
  }
}

// 3. 检查配置文件夹
console.log('\n3. 检查配置文件夹:');
const configDirs = ['config', 'src/config'];

for (const dir of configDirs) {
  if (fs.existsSync(dir)) {
    try {
      const files = fs.readdirSync(dir);
      console.log(`\n📁 ${dir}/ 文件夹:`);
      
      files.forEach(file => {
        if (file.includes('db') || file.includes('database') || file.includes('mongo')) {
          const filePath = path.join(dir, file);
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            console.log(`\n   📄 ${file}:`);
            
            const lines = content.split('\n');
            lines.forEach((line, index) => {
              if (line.includes('mongodb://') || 
                  line.includes('homeservice') ||
                  line.includes('MONGO') ||
                  line.includes('DB_')) {
                console.log(`     第${index + 1}行: ${line.trim()}`);
              }
            });
          } catch (err) {
            console.log(`     ❌ 读取 ${file} 失败`);
          }
        }
      });
    } catch (err) {
      console.log(`❌ 读取 ${dir} 目录失败: ${err.message}`);
    }
  }
}

// 4. 检查当前正在运行的进程
console.log('\n4. 检查运行中的 Node.js 进程:');
const { exec } = require('child_process');

exec('ps aux | grep node', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ 无法获取进程信息');
    return;
  }
  
  const lines = stdout.split('\n');
  lines.forEach(line => {
    if (line.includes('node') && !line.includes('grep') && line.trim()) {
      console.log(`   ${line}`);
    }
  });
});

// 5. 检查 PM2 进程（如果使用的话）
setTimeout(() => {
  console.log('\n5. 检查 PM2 进程:');
  exec('pm2 list', (error, stdout, stderr) => {
    if (error) {
      console.log('❌ 未安装 PM2 或无正在运行的进程');
    } else {
      console.log('✅ PM2 进程列表:');
      console.log(stdout);
    }
    
    // 检查 PM2 日志
    exec('pm2 logs --lines 10', (error, stdout, stderr) => {
      if (!error && stdout) {
        console.log('\n📋 最近的 PM2 日志:');
        console.log(stdout);
      }
    });
  });
}, 1000);

console.log('\n=== 检查完成 ===');
console.log('请查看上述输出，确认服务器使用的数据库配置。');
