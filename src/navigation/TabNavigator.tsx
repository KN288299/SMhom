import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { getPageConfig, PageConfig } from '../services/pageConfigService';
import { iOSTabBarStyles, isIOS } from '../styles/iOSStyles';

// 导入页面
import HomeScreen from '../screens/HomeScreen';
import OrderScreen from '../screens/OrderScreen';
import YuZuTangScreen from '../screens/YuZuTangScreen';
import MessageScreen from '../screens/MessageScreen';
import PersonalInfoScreen from '../screens/PersonalInfoScreen';
import { HomeIcon, OrderIcon, MessageIcon, UserIcon } from '../assets/icons';

// 定义标签导航参数类型
export type TabParamList = {
  Home: undefined;
  Order: undefined;
  YuZuTang: undefined;
  Message: undefined;
  Profile: undefined;
};

// 创建底部标签导航
const Tab = createBottomTabNavigator<TabParamList>();

// 中间按钮的自定义占位组件
const YuZuTangButton = ({ onPress, config }: { onPress: () => void; config: PageConfig }) => {
  return (
    <TouchableOpacity style={styles.yuZuTangContainer} onPress={onPress}>
      <View style={[styles.yuZuTangButton, { backgroundColor: config.centerButtonColor }]}>
        <Text style={styles.yuZuTangText}>{config.centerButtonText}</Text>
      </View>
    </TouchableOpacity>
  );
};

// 个人页面组件已替换为PersonalInfoScreen

const MainTabNavigator = () => {
  const [pageConfig, setPageConfig] = useState<PageConfig>({
    centerButtonText: '御足堂',
    centerButtonColor: '#ff6b81',
    bannerImages: []
  });

  // 加载页面配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getPageConfig();
        setPageConfig(config);
      } catch (error) {
        console.error('加载页面配置失败:', error);
      }
    };
    
    loadConfig();
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#ff6b81',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: isIOS ? iOSTabBarStyles.tabBarStyle : {
          height: 60,
          borderTopWidth: 1,
          borderTopColor: '#eee',
          backgroundColor: '#fff',
        },
        tabBarShowLabel: true,
        tabBarLabelStyle: isIOS ? iOSTabBarStyles.tabBarLabelStyle : {
          fontSize: 12,
          marginTop: -5,
          marginBottom: 5,
          fontWeight: 'normal',
        },
        tabBarIconStyle: isIOS ? iOSTabBarStyles.tabBarIconStyle : {},
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{
          tabBarLabel: '首页',
          tabBarIcon: ({ color, focused }) => (
            <HomeIcon size={24} active={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Order" 
        component={OrderScreen}
        options={{
          tabBarLabel: '订单',
          tabBarIcon: ({ color, focused }) => (
            <OrderIcon size={24} active={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="YuZuTang" 
        component={YuZuTangScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => null,
          tabBarButton: (props: any) => (
            <YuZuTangButton
              config={pageConfig}
              onPress={() => props.onPress && props.onPress()}
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Message" 
        component={MessageScreen}
        options={{
          tabBarLabel: '消息',
          tabBarIcon: ({ color, focused }) => (
            <MessageIcon size={24} active={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={PersonalInfoScreen}
        options={{
          tabBarLabel: '我的',
          tabBarIcon: ({ color, focused }) => (
            <UserIcon size={24} active={focused} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  yuZuTangContainer: {
    height: 60,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  yuZuTangButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  yuZuTangText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    fontSize: 18,
    color: '#666',
  },
});

export default MainTabNavigator; 