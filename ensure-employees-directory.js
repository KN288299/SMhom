const fs = require('fs');
const path = require('path');

function ensureEmployeesDirectory() {
    console.log('📁 检查和创建 uploads/employees 目录...');
    
    const employeesDir = path.join(__dirname, 'uploads/employees');
    
    try {
        // 检查目录是否存在
        if (fs.existsSync(employeesDir)) {
            const stats = fs.statSync(employeesDir);
            if (stats.isDirectory()) {
                console.log('✅ uploads/employees 目录已存在');
                
                // 统计现有文件
                const files = fs.readdirSync(employeesDir);
                console.log(`📊 目录中现有 ${files.length} 个文件`);
                
                if (files.length > 0) {
                    console.log('📋 文件示例:');
                    files.slice(0, 5).forEach(file => {
                        const filePath = path.join(employeesDir, file);
                        const stats = fs.statSync(filePath);
                        const sizeKB = Math.round(stats.size / 1024);
                        console.log(`  - ${file} (${sizeKB}KB)`);
                    });
                    
                    if (files.length > 5) {
                        console.log(`  - ... 还有 ${files.length - 5} 个文件`);
                    }
                }
                
                return true;
            } else {
                console.log('❌ uploads/employees 存在但不是目录，删除并重新创建...');
                fs.unlinkSync(employeesDir);
            }
        }
        
        // 创建目录（包括父目录）
        console.log('📁 创建 uploads/employees 目录...');
        fs.mkdirSync(employeesDir, { recursive: true });
        console.log('✅ uploads/employees 目录创建成功');
        
        // 设置目录权限（如果在 Linux/Mac 上）
        if (process.platform !== 'win32') {
            fs.chmodSync(employeesDir, 0o755);
            console.log('🔐 目录权限设置完成');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ 创建目录时出错:', error);
        return false;
    }
}

function checkUploadsStructure() {
    console.log('\n📂 检查 uploads 目录结构...');
    
    const uploadsDir = path.join(__dirname, 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
        console.log('📁 创建 uploads 根目录...');
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // 检查各个子目录
    const subdirs = ['employees', 'staff', 'images', 'admin-temp'];
    
    subdirs.forEach(subdir => {
        const dirPath = path.join(uploadsDir, subdir);
        const exists = fs.existsSync(dirPath);
        
        if (exists) {
            const files = fs.readdirSync(dirPath);
            console.log(`✅ ${subdir}/ (${files.length} 个文件)`);
        } else {
            console.log(`❌ ${subdir}/ (不存在)`);
        }
    });
}

function main() {
    console.log('🚀 开始检查和创建必要的目录结构...\n');
    
    // 检查整体结构
    checkUploadsStructure();
    
    // 确保 employees 目录存在
    const success = ensureEmployeesDirectory();
    
    if (success) {
        console.log('\n🎉 目录结构检查完成！');
        console.log('现在可以安全地重新导入员工数据了。');
    } else {
        console.log('\n❌ 目录创建失败，请检查权限或手动创建目录。');
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = {
    ensureEmployeesDirectory,
    checkUploadsStructure
};
