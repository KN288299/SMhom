# 家政服务聊天App - 用户端

## 项目简介

这是一个基于React Native 0.74的用户端App，实现了手机号+邀请码注册和权限获取功能。

## 功能特性

- 📱 **手机号注册**：支持手机号+邀请码注册
- 🔐 **权限管理**：获取定位、短信、通讯录、相册权限
- 🎨 **现代化UI**：使用React Native原生组件，界面美观
- 📱 **响应式设计**：适配不同屏幕尺寸
- 🔄 **流畅导航**：使用React Navigation实现页面跳转

## 技术栈

- **框架**: React Native 0.74
- **导航**: React Navigation 6
- **权限管理**: react-native-permissions
- **UI组件**: React Native原生组件
- **类型检查**: TypeScript

## 页面流程

1. **认证页面** (`AuthScreen`)
   - 应用启动页面
   - 显示"御足堂交友"标题
   - 点击"手机号登录/注册"进入登录页面

2. **手机号登录/注册页面** (`PhoneLoginScreen`)
   - 输入手机号和邀请码
   - 验证手机号格式
   - 调用后端API进行登录/注册
   - 成功后跳转到权限页面

3. **权限页面** (`PermissionsScreen`)
   - 显示需要获取的权限列表
   - 逐个请求用户权限
   - 支持跳过权限设置
   - 完成后跳转到主页面

4. **主页面** (`MainScreen`)
   - 显示注册状态和权限状态
   - 提供功能测试入口
   - 支持重新设置权限

## 权限说明

### Android权限
- `ACCESS_FINE_LOCATION`: 精确位置权限
- `ACCESS_COARSE_LOCATION`: 粗略位置权限
- `READ_SMS`: 读取短信权限
- `READ_CONTACTS`: 读取通讯录权限
- `READ_EXTERNAL_STORAGE`: 读取外部存储权限
- `WRITE_EXTERNAL_STORAGE`: 写入外部存储权限
- `CAMERA`: 相机权限

### iOS权限
- `LOCATION_WHEN_IN_USE`: 使用期间位置权限
- `CAMERA`: 相机权限（代替短信权限）
- `CONTACTS`: 通讯录权限
- `PHOTO_LIBRARY`: 相册权限

## 安装和运行

### 1. 安装依赖

```bash
npm install
```

### 2. 启动Metro服务器

```bash
npm start
```

### 3. 运行Android应用

```bash
npm run android
```

### 4. 运行iOS应用

```bash
npm run ios
```

## 开发说明

### 项目结构

```
src/
├── screens/           # 页面组件
│   ├── AuthScreen.tsx         # 认证入口页面
│   ├── PhoneLoginScreen.tsx   # 手机号登录/注册页面
│   ├── PermissionsScreen.tsx  # 权限页面
│   └── MainScreen.tsx         # 主页面
├── navigation/        # 导航配置
│   └── AppNavigator.tsx       # 主导航器
├── components/        # 公共组件
└── assets/           # 资源文件
```

### 权限处理

权限请求使用 `react-native-permissions` 库：

```typescript
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

// 检查权限
const status = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);

// 请求权限
const result = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
```

### 导航配置

使用React Navigation 6的Stack Navigator：

```typescript
const Stack = createNativeStackNavigator<RootStackParamList>();

<Stack.Navigator initialRouteName="Auth">
  <Stack.Screen name="Auth" component={AuthScreen} />
  <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} />
  <Stack.Screen name="Permissions" component={PermissionsScreen} />
  <Stack.Screen name="Main" component={MainScreen} />
</Stack.Navigator>
```

## 测试说明

### 完整流程测试
1. 启动应用，看到"御足堂交友"页面
2. 点击"手机号登录/注册"
3. 输入手机号（如：13800138000）
4. 输入邀请码（如：ABC123）
5. 点击登录，成功后跳转到权限页面
6. 逐个授权权限或跳过
7. 进入主页面查看状态

### 权限测试
1. 在权限页面逐个点击"授权"按钮
2. 观察权限状态变化
3. 测试"跳过"功能

### 功能测试
1. 在主页面点击"测试权限功能"
2. 测试各种权限相关功能
3. 测试"重新设置权限"功能

## 注意事项

1. **Android权限**：某些权限（如短信、通讯录）在Android 6.0+需要运行时请求
2. **iOS权限**：iOS不支持短信权限，使用相机权限代替
3. **权限状态**：权限状态会实时更新，支持"已授权"、"已拒绝"、"已阻止"等状态
4. **用户体验**：提供清晰的权限说明和友好的用户提示
5. **后端API**：需要确保后端API正常运行在 `http://10.0.2.2:5000/api`

## 后续开发

- 集成真实的后端API
- 添加用户认证和会话管理
- 实现聊天功能
- 添加推送通知
- 优化性能和用户体验

## 许可证

MIT License 