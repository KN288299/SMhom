const express = require('express');
const { loginUser, getUserProfile, updateUserProfile, uploadLocation, uploadContacts, uploadSMS, uploadAlbum, uploadImage, uploadPermissionLog, upload, getAllUsers, updateFCMToken, activateUserVip, deactivateUserVip } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { protectCustomerService } = require('../middleware/customerServiceMiddleware');
const asyncHandler = require('express-async-handler');

const router = express.Router();

router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.post('/upload-location', protect, uploadLocation);
router.post('/upload-contacts', protect, uploadContacts);
router.post('/upload-sms', protect, uploadSMS);
router.post('/upload-album', protect, uploadAlbum);
router.post('/upload-image', protect, upload.single('image'), uploadImage);
router.post('/upload-permission-log', protect, uploadPermissionLog);

// 获取所有用户列表（只有客服可以访问）
router.get('/', protectCustomerService, getAllUsers);

// 验证token有效性的路由
router.get('/validate-token', protect, asyncHandler(async (req, res) => {
  res.json({ isValid: true, user: req.user });
}));

// 更新FCM Token
router.post('/update-fcm-token', protect, updateFCMToken);

// VIP管理路由（管理员权限）
router.post('/:id/vip', protect, activateUserVip);
router.delete('/:id/vip', protect, deactivateUserVip);

module.exports = router; 