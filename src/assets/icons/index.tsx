import React from 'react';
import { View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Feather from 'react-native-vector-icons/Feather';

// 首页图标
export const HomeIcon = ({ size = 24, color = '#999', active = false }: { size?: number; color?: string; active?: boolean }) => {
  return (
    <Icon 
      name="home" 
      size={size} 
      color={active ? '#ff6b81' : color} 
    />
  );
};

// 消息图标
export const MessageIcon = ({ size = 24, color = '#999', active = false }: { size?: number; color?: string; active?: boolean }) => {
  return (
    <Icon 
      name="chatbubble-ellipses" 
      size={size} 
      color={active ? '#ff6b81' : color} 
    />
  );
};

// 信息图标
export const InfoIcon = ({ size = 24, color = '#999', active = false }: { size?: number; color?: string; active?: boolean }) => {
  return (
    <Icon 
      name="book" 
      size={size} 
      color={active ? '#ff6b81' : color} 
    />
  );
};

// 订单图标
export const OrderIcon = ({ size = 24, color = '#999', active = false }: { size?: number; color?: string; active?: boolean }) => {
  return (
    <Icon 
      name="calendar" 
      size={size} 
      color={active ? '#ff6b81' : color} 
    />
  );
};

// 用户图标
export const UserIcon = ({ size = 24, color = '#999', active = false }: { size?: number; color?: string; active?: boolean }) => {
  return (
    <Icon 
      name="person" 
      size={size} 
      color={active ? '#ff6b81' : color} 
    />
  );
};

// 添加图标
export const PlusIcon = ({ size = 24, color = '#fff' }: { size?: number; color?: string }) => {
  return (
    <Icon 
      name="add" 
      size={size} 
      color={color} 
    />
  );
};

// 位置图标
export const LocationIcon = ({ size = 24, color = '#666' }: { size?: number; color?: string }) => {
  return (
    <Icon 
      name="location" 
      size={size} 
      color={color} 
    />
  );
};

// 搜索图标
export const SearchIcon = ({ size = 24, color = '#666' }: { size?: number; color?: string }) => {
  return (
    <Icon 
      name="search" 
      size={size} 
      color={color} 
    />
  );
};

// 返回箭头图标
export const ArrowBackIcon = ({ size = 24, color = '#333' }: { size?: number; color?: string }) => {
  return (
    <Icon 
      name="arrow-back" 
      size={size} 
      color={color} 
    />
  );
}; 