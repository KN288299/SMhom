const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

async function checkPathMismatchAndFix() {
    try {
        // 连接数据库
        await mongoose.connect('mongodb://127.0.0.1:27017/homeservicechat');
        console.log('已连接到数据库');

        // 定义Staff模型
        const Staff = mongoose.model('Staff', new mongoose.Schema({}, { strict: false }), 'staffs');

        // 获取所有员工记录
        const allStaff = await Staff.find({}).select('name image');
        console.log(`总共找到 ${allStaff.length} 条员工记录`);

        // 检查不同路径格式的分布
        const pathStats = {
            employees: 0,  // /uploads/employees/
            staff: 0,      // /uploads/staff/
            other: 0,      // 其他格式
            empty: 0       // 空或无效
        };

        const samples = {
            employees: [],
            staff: [],
            other: [],
            empty: []
        };

        allStaff.forEach(staff => {
            if (!staff.image) {
                pathStats.empty++;
                if (samples.empty.length < 3) samples.empty.push(staff.name);
            } else if (staff.image.includes('/uploads/employees/')) {
                pathStats.employees++;
                if (samples.employees.length < 3) samples.employees.push(`${staff.name}: ${staff.image}`);
            } else if (staff.image.includes('/uploads/staff/')) {
                pathStats.staff++;
                if (samples.staff.length < 3) samples.staff.push(`${staff.name}: ${staff.image}`);
            } else {
                pathStats.other++;
                if (samples.other.length < 3) samples.other.push(`${staff.name}: ${staff.image}`);
            }
        });

        console.log('\n=== 路径格式分布 ===');
        console.log(`/uploads/employees/ 格式: ${pathStats.employees} 条`);
        console.log(`/uploads/staff/ 格式: ${pathStats.staff} 条`);
        console.log(`其他格式: ${pathStats.other} 条`);
        console.log(`空值: ${pathStats.empty} 条`);

        // 显示示例
        if (samples.employees.length > 0) {
            console.log('\n/uploads/employees/ 示例:');
            samples.employees.forEach(sample => console.log(`  ${sample}`));
        }
        if (samples.staff.length > 0) {
            console.log('\n/uploads/staff/ 示例:');
            samples.staff.forEach(sample => console.log(`  ${sample}`));
        }

        // 检查实际文件存在情况
        console.log('\n=== 检查实际文件存在情况 ===');
        
        // 检查uploads目录结构
        const uploadsPath = './uploads';
        try {
            const uploadsContents = await fs.readdir(uploadsPath);
            console.log('uploads目录内容:', uploadsContents);
            
            // 检查employees目录
            if (uploadsContents.includes('employees')) {
                const employeesFiles = await fs.readdir(path.join(uploadsPath, 'employees'));
                console.log(`employees目录中有 ${employeesFiles.length} 个文件`);
                if (employeesFiles.length > 0) {
                    console.log('employees目录示例文件:', employeesFiles.slice(0, 3));
                }
            } else {
                console.log('employees目录不存在');
            }
            
            // 检查staff目录
            if (uploadsContents.includes('staff')) {
                const staffFiles = await fs.readdir(path.join(uploadsPath, 'staff'));
                console.log(`staff目录中有 ${staffFiles.length} 个文件`);
                if (staffFiles.length > 0) {
                    console.log('staff目录示例文件:', staffFiles.slice(0, 3));
                }
            } else {
                console.log('staff目录不存在');
            }
            
        } catch (err) {
            console.log('无法读取uploads目录:', err.message);
        }

        // 随机检查几个文件是否真实存在
        console.log('\n=== 随机验证文件存在性 ===');
        const randomStaff = allStaff
            .filter(s => s.image && (s.image.includes('/uploads/employees/') || s.image.includes('/uploads/staff/')))
            .slice(0, 5);

        for (const staff of randomStaff) {
            const filePath = `.${staff.image}`;
            try {
                await fs.access(filePath);
                console.log(`✓ 存在: ${staff.name} -> ${staff.image}`);
            } catch {
                console.log(`✗ 缺失: ${staff.name} -> ${staff.image}`);
                
                // 尝试检查是否存在对应的另一种路径格式
                let alternatePath;
                if (staff.image.includes('/uploads/employees/')) {
                    alternatePath = staff.image.replace('/uploads/employees/', '/uploads/staff/');
                } else if (staff.image.includes('/uploads/staff/')) {
                    alternatePath = staff.image.replace('/uploads/staff/', '/uploads/employees/');
                }
                
                if (alternatePath) {
                    try {
                        await fs.access(`.${alternatePath}`);
                        console.log(`  → 但是存在: ${alternatePath}`);
                    } catch {
                        console.log(`  → 也不存在: ${alternatePath}`);
                    }
                }
            }
        }

    } catch (error) {
        console.error('检查过程中出错:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n脚本执行完成');
    }
}

checkPathMismatchAndFix();
