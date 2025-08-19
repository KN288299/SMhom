const mongoose = require('mongoose');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

async function checkCurrentDatabaseAndSwitch() {
    try {
        // 首先检查当前项目的数据库配置
        console.log('=== 检查当前数据库配置 ===');
        
        // 检查环境变量
        console.log('MONGODB_URI 环境变量:', process.env.MONGODB_URI || '未设置');
        
        // 默认连接字符串（来自db.js配置）
        const defaultConnectionString = 'mongodb://127.0.0.1:27017/homeservicechat';
        const currentConnectionString = process.env.MONGODB_URI || defaultConnectionString;
        
        console.log('当前使用的连接字符串:', currentConnectionString);
        
        // 连接到当前配置的数据库
        console.log('\n=== 连接到当前数据库 ===');
        await mongoose.connect(currentConnectionString);
        console.log('已连接到数据库:', mongoose.connection.host);
        console.log('数据库名称:', mongoose.connection.name);
        
        // 检查当前数据库中的集合
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('\n当前数据库中的集合:');
        collections.forEach(col => {
            console.log(`- ${col.name}`);
        });
        
        // 检查staffs集合的记录数量
        if (collections.some(col => col.name === 'staffs')) {
            const Staff = mongoose.model('Staff', new mongoose.Schema({}, { strict: false }), 'staffs');
            const count = await Staff.countDocuments();
            console.log(`\nstaffs集合中有 ${count} 条记录`);
            
            // 显示几个示例记录
            const samples = await Staff.find({}).limit(3).select('name image');
            console.log('\n示例记录:');
            samples.forEach(staff => {
                console.log(`- ${staff.name}: ${staff.image || '无图片'}`);
            });
        }
        
        // 断开当前连接
        await mongoose.disconnect();
        console.log('\n已断开当前数据库连接');
        
        // 如果当前不是本地数据库，尝试连接本地数据库
        if (currentConnectionString !== defaultConnectionString) {
            console.log('\n=== 尝试连接本地数据库 ===');
            console.log('本地数据库连接字符串:', defaultConnectionString);
            
            try {
                await mongoose.connect(defaultConnectionString);
                console.log('成功连接到本地数据库:', mongoose.connection.host);
                console.log('本地数据库名称:', mongoose.connection.name);
                
                // 检查本地数据库中的集合
                const localCollections = await mongoose.connection.db.listCollections().toArray();
                console.log('\n本地数据库中的集合:');
                localCollections.forEach(col => {
                    console.log(`- ${col.name}`);
                });
                
                // 检查本地staffs集合
                if (localCollections.some(col => col.name === 'staffs')) {
                    const LocalStaff = mongoose.model('LocalStaff', new mongoose.Schema({}, { strict: false }), 'staffs');
                    const localCount = await LocalStaff.countDocuments();
                    console.log(`\n本地staffs集合中有 ${localCount} 条记录`);
                } else {
                    console.log('\n本地数据库中没有staffs集合');
                }
                
            } catch (localError) {
                console.error('连接本地数据库失败:', localError.message);
                console.log('请确保MongoDB服务正在运行');
            }
        } else {
            console.log('\n当前已经在使用本地数据库');
        }

    } catch (error) {
        console.error('检查数据库时出错:', error);
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
            console.log('\n脚本执行完成，已断开数据库连接');
        }
    }
}

checkCurrentDatabaseAndSwitch();
