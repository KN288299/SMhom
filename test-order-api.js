const axios = require('axios');

// 服务器URL
const API_URL = 'http://localhost:5000/api';

// 管理员登录信息
const adminCredentials = {
  username: 'kn6969',
  password: 'cjygsg.520'
};

// 测试函数
async function testOrderAPI() {
  try {
    console.log('开始测试订单API...');
    
    // 1. 登录获取token
    console.log('1. 登录管理员账号');
    const loginResponse = await axios.post(`${API_URL}/admin/login`, adminCredentials);
    const token = loginResponse.data.token;
    console.log('登录成功，获取到token');
    
    // 设置请求头
    const config = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
    
    // 2. 获取订单列表
    console.log('\n2. 获取订单列表');
    try {
      const ordersResponse = await axios.get(`${API_URL}/orders`, config);
      console.log('获取订单列表成功:');
      console.log(`总订单数: ${ordersResponse.data.total}`);
      console.log(`当前页订单数: ${ordersResponse.data.orders?.length || 0}`);
      console.log('订单列表示例:', ordersResponse.data.orders?.slice(0, 2) || '无订单');
    } catch (error) {
      console.error('获取订单列表失败:', error.response?.data || error.message);
    }
    
    // 3. 获取用户列表
    console.log('\n3. 获取用户列表');
    try {
      const usersResponse = await axios.get(`${API_URL}/admin/users`, config);
      console.log('获取用户列表成功:');
      console.log(`用户数量: ${usersResponse.data?.length || 0}`);
      const userId = usersResponse.data?.[0]?._id;
      console.log('用户ID示例:', userId || '无用户');
      
      // 4. 获取员工列表
      console.log('\n4. 获取员工列表');
      const staffResponse = await axios.get(`${API_URL}/staff`, config);
      console.log('获取员工列表成功:');
      console.log(`员工数量: ${staffResponse.data?.length || 0}`);
      const staffId = staffResponse.data?.[0]?._id;
      console.log('员工ID示例:', staffId || '无员工');
      
      // 如果有用户和员工，尝试创建订单
      if (userId && staffId) {
        // 5. 创建订单
        console.log('\n5. 尝试创建订单');
        const orderData = {
          userId,
          staffId,
          appointmentTime: new Date().toISOString(),
          price: 100,
          address: '测试地址',
          notes: '测试备注',
          serviceType: '测试服务',
          status: 'pending'
        };
        
        try {
          const createResponse = await axios.post(`${API_URL}/orders`, orderData, config);
          console.log('创建订单成功:');
          console.log('订单ID:', createResponse.data._id);
          console.log('订单号:', createResponse.data.orderNumber);
          
          // 6. 更新订单状态
          console.log('\n6. 更新订单状态');
          const orderId = createResponse.data._id;
          const updateResponse = await axios.put(
            `${API_URL}/orders/${orderId}/status`, 
            { status: 'accepted' }, 
            config
          );
          console.log('更新订单状态成功:');
          console.log('新状态:', updateResponse.data.status);
          
          // 7. 删除测试订单
          console.log('\n7. 删除测试订单');
          const deleteResponse = await axios.delete(`${API_URL}/orders/${orderId}`, config);
          console.log('删除订单成功:', deleteResponse.data.message);
        } catch (error) {
          console.error('订单操作失败:', error.response?.data || error.message);
        }
      } else {
        console.log('无法创建测试订单，缺少用户或员工数据');
      }
    } catch (error) {
      console.error('获取用户列表失败:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
  }
}

// 执行测试
testOrderAPI(); 