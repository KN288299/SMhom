// react-native-get-sms-android 模块声明
declare module 'react-native-get-sms-android' {
  type SmsAndroidType = {
    list: (
      filter: string,
      fail: (error: any) => void,
      success: (count: number, smsList: string) => void
    ) => void;
  };
  
  const SmsAndroid: SmsAndroidType;
  export default SmsAndroid;
}

// 自定义全局类型声明
declare global {
  // 可以添加全局类型定义
}

declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.svg';

// 添加Vector Icons的声明
declare module 'react-native-vector-icons/Ionicons';
declare module 'react-native-vector-icons/MaterialIcons';
declare module 'react-native-vector-icons/FontAwesome';
declare module 'react-native-vector-icons/MaterialCommunityIcons';
declare module 'react-native-vector-icons/Feather';
declare module 'react-native-vector-icons/AntDesign'; 