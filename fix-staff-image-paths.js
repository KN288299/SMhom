const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/homeservicechat', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'Connection error:'));
db.once('open', async function() {
    console.log('Connected to MongoDB');
    
    try {
        // Get the staffs collection
        const staffsCollection = db.collection('staffs');
        
        // Find all documents with image paths that need to be updated
        const staffsWithImages = await staffsCollection.find({
            image: { $regex: '^/uploads/employees/' }
        }).toArray();
        
        console.log(`Found ${staffsWithImages.length} staff records with /uploads/employees/ paths`);
        
        if (staffsWithImages.length === 0) {
            console.log('No records need updating');
            process.exit(0);
        }
        
        // Show sample of what will be updated
        console.log('\nSample records to be updated:');
        staffsWithImages.slice(0, 5).forEach(staff => {
            console.log(`${staff.name}: ${staff.image} -> ${staff.image.replace('/uploads/employees/', '/uploads/staff/')}`);
        });
        
        // Ask for confirmation
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        rl.question('\nDo you want to proceed with updating these paths? (y/n): ', async (answer) => {
            if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
                console.log('Updating image paths...');
                
                // Update all records
                const result = await staffsCollection.updateMany(
                    { image: { $regex: '^/uploads/employees/' } },
                    [
                        {
                            $set: {
                                image: {
                                    $replaceOne: {
                                        input: "$image",
                                        find: "/uploads/employees/",
                                        replacement: "/uploads/staff/"
                                    }
                                }
                            }
                        }
                    ]
                );
                
                console.log(`Updated ${result.modifiedCount} records`);
                
                // Verify the update
                const updatedStaffs = await staffsCollection.find({
                    image: { $regex: '^/uploads/staff/' }
                }).limit(5).toArray();
                
                console.log('\nSample updated records:');
                updatedStaffs.forEach(staff => {
                    console.log(`${staff.name}: ${staff.image}`);
                });
                
            } else {
                console.log('Update cancelled');
            }
            
            rl.close();
            mongoose.connection.close();
        });
        
    } catch (error) {
        console.error('Error:', error);
        mongoose.connection.close();
    }
});