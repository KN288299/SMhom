const mongoose = require('mongoose');

async function fixPathBackToEmployees() {
    try {
        // 连接数据库
        await mongoose.connect('mongodb://127.0.0.1:27017/homeservicechat');
        console.log('已连接到数据库');

        // 获取集合
        const db = mongoose.connection.db;
        const staffsCollection = db.collection('staffs');

        // 统计需要修改的记录
        const countToUpdate = await staffsCollection.countDocuments({
            $or: [
                { image: { $regex: '^/uploads/staff/' } },
                { photos: { $elemMatch: { $regex: '^/uploads/staff/' } } }
            ]
        });

        console.log(`找到 ${countToUpdate} 条需要修改路径的记录`);

        if (countToUpdate === 0) {
            console.log('没有需要修改的记录');
            return;
        }

        // 显示几个示例
        const samples = await staffsCollection.find({
            image: { $regex: '^/uploads/staff/' }
        }).limit(3).toArray();

        console.log('\n修改示例:');
        samples.forEach(staff => {
            console.log(`${staff.name}: ${staff.image} -> ${staff.image.replace('/uploads/staff/', '/uploads/employees/')}`);
        });

        console.log('\n开始批量修改...');

        // 修改主图片路径
        const imageResult = await staffsCollection.updateMany(
            { image: { $regex: '^/uploads/staff/' } },
            [
                {
                    $set: {
                        image: {
                            $replaceOne: {
                                input: "$image",
                                find: "/uploads/staff/",
                                replacement: "/uploads/employees/"
                            }
                        }
                    }
                }
            ]
        );

        console.log(`✅ 修改主图片路径: ${imageResult.modifiedCount} 条记录`);

        // 修改照片集路径
        const photosResult = await staffsCollection.updateMany(
            { photos: { $elemMatch: { $regex: '^/uploads/staff/' } } },
            [
                {
                    $set: {
                        photos: {
                            $map: {
                                input: "$photos",
                                as: "photo",
                                in: {
                                    $replaceOne: {
                                        input: "$$photo",
                                        find: "/uploads/staff/",
                                        replacement: "/uploads/employees/"
                                    }
                                }
                            }
                        }
                    }
                }
            ]
        );

        console.log(`✅ 修改照片集路径: ${photosResult.modifiedCount} 条记录`);

        // 验证修改结果
        const finalCount = await staffsCollection.countDocuments({
            $or: [
                { image: { $regex: '^/uploads/staff/' } },
                { photos: { $elemMatch: { $regex: '^/uploads/staff/' } } }
            ]
        });

        console.log(`\n🎯 修改完成，剩余使用 /uploads/staff/ 路径的记录: ${finalCount}`);

        // 显示修改后的示例
        const updatedSamples = await staffsCollection.find({
            image: { $regex: '^/uploads/employees/' }
        }).limit(3).toArray();

        console.log('\n修改后示例:');
        updatedSamples.forEach(staff => {
            console.log(`${staff.name}: ${staff.image}`);
        });

    } catch (error) {
        console.error('修改过程中出错:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n脚本执行完成');
    }
}

fixPathBackToEmployees();
