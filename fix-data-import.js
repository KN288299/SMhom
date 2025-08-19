const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 连接数据库
mongoose.connect('mongodb://localhost:27017/homeservice', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// 员工模型 - 修复版本
const staffSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: false }, // 改为可选字段
    email: String,
    position: String,
    department: String,
    hireDate: Date,
    salary: Number,
    status: { type: String, default: 'active' },
    image: String,
    photos: [String],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Staff = mongoose.model('Staff', staffSchema);

async function importStaffData() {
    try {
        console.log('🔄 开始导入员工数据...');
        
        // 读取JSON文件
        const dataPath = 'uploads/admin-temp/extract-1755466997419/staff-data.json';
        const jsonData = fs.readFileSync(dataPath, 'utf8');
        const data = JSON.parse(jsonData);
        
        console.log(`📊 发现 ${data.totalCount} 个员工记录`);
        
        // 清空现有数据（可选）
        const existingCount = await Staff.countDocuments();
        console.log(`🗃️ 数据库中现有 ${existingCount} 条记录`);
        
        if (existingCount > 0) {
            console.log('⚠️ 数据库不为空，跳过清空步骤');
        }
        
        // 批量导入
        let successCount = 0;
        let errorCount = 0;
        
        for (const staffData of data.staff) {
            try {
                // 处理缺失的必填字段
                if (!staffData.phone || staffData.phone === '') {
                    staffData.phone = `138${Math.floor(10000000 + Math.random() * 90000000)}`;
                    console.log(`📱 为 ${staffData.name} 生成电话号码: ${staffData.phone}`);
                }
                
                // 处理图片路径
                if (staffData.image) {
                    // 将临时路径转换为永久路径
                    const oldPath = staffData.image;
                    const fileName = path.basename(oldPath);
                    staffData.image = `/uploads/employees/${fileName}`;
                }
                
                if (staffData.photos && staffData.photos.length > 0) {
                    staffData.photos = staffData.photos.map(photo => {
                        const fileName = path.basename(photo);
                        return `/uploads/employees/${fileName}`;
                    });
                }
                
                // 创建员工记录
                const staff = new Staff(staffData);
                await staff.save();
                successCount++;
                
                if (successCount % 50 === 0) {
                    console.log(`✅ 已导入 ${successCount} 条记录...`);
                }
                
            } catch (error) {
                errorCount++;
                console.error(`❌ 导入失败 (${staffData.name}):`, error.message);
            }
        }
        
        console.log('\n📈 导入结果统计:');
        console.log(`✅ 成功导入: ${successCount} 条`);
        console.log(`❌ 导入失败: ${errorCount} 条`);
        console.log(`📊 总计处理: ${successCount + errorCount} 条`);
        
        // 验证导入结果
        const finalCount = await Staff.countDocuments();
        console.log(`\n🎯 数据库最终记录数: ${finalCount}`);
        
        // 显示几个示例记录
        const samples = await Staff.find({}).limit(3).select('name image photos');
        console.log('\n📋 导入示例:');
        samples.forEach(staff => {
            console.log(`- ${staff.name}: ${staff.image || '无头像'}`);
            if (staff.photos && staff.photos.length > 0) {
                console.log(`  相册: ${staff.photos.length} 张照片`);
            }
        });
        
    } catch (error) {
        console.error('💥 导入过程发生错误:', error);
    } finally {
        mongoose.disconnect();
        console.log('\n🔐 数据库连接已关闭');
    }
}

// 执行导入
importStaffData();
