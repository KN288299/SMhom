const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function verifyImageFix() {
    try {
        // 连接数据库
        await mongoose.connect('mongodb://127.0.0.1:27017/homeservicechat');
        console.log('已连接到数据库');

        // 获取集合
        const db = mongoose.connection.db;
        const staffsCollection = db.collection('staffs');

        console.log('🔍 验证路径修改结果...\n');

        // 随机检查10个员工的图片
        const randomStaff = await staffsCollection.aggregate([
            { $sample: { size: 10 } }
        ]).toArray();

        let existsCount = 0;
        let missingCount = 0;

        console.log('=== 随机验证10个员工的图片文件 ===');
        
        for (const staff of randomStaff) {
            if (staff.image) {
                // 检查数据库路径格式
                const dbPath = staff.image;
                // 转换为实际文件系统路径
                const filePath = path.join(__dirname, staff.image.replace(/^\//, ''));
                
                const exists = fs.existsSync(filePath);
                if (exists) {
                    console.log(`✅ ${staff.name}: ${dbPath} (文件存在)`);
                    existsCount++;
                } else {
                    console.log(`❌ ${staff.name}: ${dbPath} (文件不存在)`);
                    missingCount++;
                }
            } else {
                console.log(`⚠️  ${staff.name}: 没有图片路径`);
            }
        }

        console.log(`\n📊 验证结果:`);
        console.log(`✅ 文件存在: ${existsCount} 个`);
        console.log(`❌ 文件缺失: ${missingCount} 个`);
        console.log(`📈 成功率: ${(existsCount / (existsCount + missingCount) * 100).toFixed(1)}%`);

        // 检查uploads/employees目录状态
        const employeesDir = path.join(__dirname, 'uploads/employees');
        if (fs.existsSync(employeesDir)) {
            const files = fs.readdirSync(employeesDir);
            console.log(`\n📁 uploads/employees 目录有 ${files.length} 个文件`);
            
            if (files.length > 0) {
                console.log('示例文件:');
                files.slice(0, 3).forEach(file => {
                    console.log(`  - ${file}`);
                });
            }
        } else {
            console.log(`\n❌ uploads/employees 目录不存在`);
        }

        // 检查是否还有使用错误路径的记录
        const wrongPathCount = await staffsCollection.countDocuments({
            $or: [
                { image: { $regex: '^/uploads/staff/' } },
                { photos: { $elemMatch: { $regex: '^/uploads/staff/' } } }
            ]
        });

        if (wrongPathCount > 0) {
            console.log(`\n⚠️  还有 ${wrongPathCount} 条记录使用错误路径`);
        } else {
            console.log(`\n✅ 所有记录的路径都已修正`);
        }

        // 统计路径分布
        const pathStats = await staffsCollection.aggregate([
            {
                $group: {
                    _id: {
                        $cond: [
                            { $regexMatch: { input: "$image", regex: "^/uploads/employees/" } },
                            "/uploads/employees/",
                            "其他格式"
                        ]
                    },
                    count: { $sum: 1 }
                }
            }
        ]).toArray();

        console.log('\n📈 当前路径格式分布:');
        pathStats.forEach(stat => {
            console.log(`${stat._id}: ${stat.count} 条`);
        });

    } catch (error) {
        console.error('验证过程中出错:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n验证完成');
    }
}

verifyImageFix();
