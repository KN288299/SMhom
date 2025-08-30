import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Geolocation from '@react-native-community/geolocation';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  locationName: string;
}

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSendLocation: (location: LocationData) => void;
}

const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  onClose,
  onSendLocation,
}) => {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapCenter, setMapCenter] = useState({
    latitude: 39.9042,
    longitude: 116.4074,
  });
  const webViewRef = useRef<WebView>(null);

  // 请求定位权限 - 优化版本
  const requestLocationPermission = async () => {
    try {
      console.log('📍 检查定位权限...');
      
      // 增强防御性编程：检查PERMISSIONS模块是否正确加载
      let ANDROID_PERMISSIONS;
      try {
        if (!PERMISSIONS || !PERMISSIONS.ANDROID || !PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION) {
          console.warn('⚠️ [LocationPicker] PERMISSIONS.ANDROID未加载，使用默认权限字符串');
          ANDROID_PERMISSIONS = {
            ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
            ACCESS_COARSE_LOCATION: 'android.permission.ACCESS_COARSE_LOCATION',
          };
        } else {
          ANDROID_PERMISSIONS = PERMISSIONS.ANDROID;
        }
      } catch (permError) {
        console.warn('⚠️ [LocationPicker] 权限模块加载异常，使用默认权限:', permError);
        ANDROID_PERMISSIONS = {
          ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
          ACCESS_COARSE_LOCATION: 'android.permission.ACCESS_COARSE_LOCATION',
        };
      }

      const fineLocationPermission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE 
        : ANDROID_PERMISSIONS.ACCESS_FINE_LOCATION as any;
        
      const coarseLocationPermission = Platform.OS === 'android'
        ? ANDROID_PERMISSIONS.ACCESS_COARSE_LOCATION as any
        : fineLocationPermission;

      // 先检查现有权限状态
      const [fineResult, coarseResult] = await Promise.all([
        check(fineLocationPermission),
        Platform.OS === 'android' ? check(coarseLocationPermission) : Promise.resolve(RESULTS.GRANTED)
      ]);
      
      console.log('📍 权限状态 - 精确:', fineResult, '粗略:', coarseResult);
      
      // 如果已有任何定位权限，直接返回
      if (fineResult === RESULTS.GRANTED || coarseResult === RESULTS.GRANTED) {
        console.log('📍 已有定位权限');
        return true;
      }
      
      // 如果权限被拒绝，尝试请求
      if (fineResult === RESULTS.DENIED || coarseResult === RESULTS.DENIED) {
        console.log('📍 请求定位权限...');
        
        const requestPromises = [];
        
        if (fineResult === RESULTS.DENIED) {
          requestPromises.push(request(fineLocationPermission));
        }
        
        if (Platform.OS === 'android' && coarseResult === RESULTS.DENIED) {
          requestPromises.push(request(coarseLocationPermission));
        }
        
        const requestResults = await Promise.all(requestPromises);
        const hasPermission = requestResults.some(result => result === RESULTS.GRANTED);
        
        console.log('📍 权限请求结果:', requestResults, '有权限:', hasPermission);
        return hasPermission;
      }
      
      // 权限被永久拒绝
      if (fineResult === RESULTS.BLOCKED || coarseResult === RESULTS.BLOCKED) {
        console.log('📍 权限被永久拒绝');
        Alert.alert(
          '定位权限被拒绝',
          '请在设置中允许应用访问位置信息',
          [
            { text: '取消', style: 'cancel' },
            { text: '去设置', onPress: () => {} } // 可以添加打开设置的逻辑
          ]
        );
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('📍 请求定位权限失败:', error);
      return false;
    }
  };

  // 获取当前位置 - 优化版本
  const getCurrentLocation = async () => {
    setLoading(true);
    
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert('权限不足', '需要位置权限才能获取当前位置');
        setLoading(false);
        return;
      }

      console.log('📍 开始获取位置...');

      // 先尝试快速获取缓存位置
      const fastLocationPromise = new Promise<LocationData>((resolve, reject) => {
        Geolocation.getCurrentPosition(
          (position) => {
            console.log('📍 快速定位成功:', position.coords);
            const { latitude, longitude, accuracy } = position.coords;
            
            // 先创建基本位置信息
            const location: LocationData = {
              latitude,
              longitude,
              address: `正在获取地址信息... (精度: ${accuracy?.toFixed(0)}m)`,
              locationName: '我的位置',
            };
            
            // 异步获取详细地址信息
            reverseGeocode(latitude, longitude).then(({ locationName, address }) => {
              const updatedLocation: LocationData = {
                latitude,
                longitude,
                address: `${address} (精度: ${accuracy?.toFixed(0)}m)`,
                locationName: `${locationName} (当前位置)`,
              };
              setCurrentLocation(updatedLocation);
              setSelectedLocation(updatedLocation);
              console.log('📍 当前位置地址解析完成:', updatedLocation);
            }).catch(() => {
              // 地址解析失败，保持基本信息
              const fallbackLocation: LocationData = {
                latitude,
                longitude,
                address: `坐标: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (精度: ${accuracy?.toFixed(0)}m)`,
                locationName: '我的位置',
              };
              setCurrentLocation(fallbackLocation);
              setSelectedLocation(fallbackLocation);
            });
            
            resolve(location);
          },
          (error) => {
            console.log('📍 快速定位失败:', error.message);
            reject(error);
          },
          {
            enableHighAccuracy: false, // 快速模式，使用网络定位
            timeout: 5000, // 5秒超时
            maximumAge: 60000, // 接受1分钟内的缓存位置
          }
        );
      });

      // 同时尝试高精度定位
      const accurateLocationPromise = new Promise<LocationData>((resolve, reject) => {
        Geolocation.getCurrentPosition(
          (position) => {
            console.log('📍 精确定位成功:', position.coords);
            const { latitude, longitude, accuracy } = position.coords;
            
            // 先创建基本位置信息
            const location: LocationData = {
              latitude,
              longitude,
              address: `正在获取地址信息... (精度: ${accuracy?.toFixed(0)}m)`,
              locationName: '我的位置 (精确)',
            };
            
            // 异步获取详细地址信息
            reverseGeocode(latitude, longitude).then(({ locationName, address }) => {
              const updatedLocation: LocationData = {
                latitude,
                longitude,
                address: `${address} (精度: ${accuracy?.toFixed(0)}m)`,
                locationName: `${locationName} (精确位置)`,
              };
              
              // 只有在这是当前选中的位置时才更新
              setSelectedLocation((current) => {
                if (current && Math.abs(current.latitude - latitude) < 0.001 && Math.abs(current.longitude - longitude) < 0.001) {
                  return updatedLocation;
                }
                return current;
              });
              
              console.log('📍 精确位置地址解析完成:', updatedLocation);
            }).catch(() => {
              // 地址解析失败，保持基本信息
              console.log('📍 精确位置地址解析失败，保持坐标信息');
            });
            
            resolve(location);
          },
          (error) => {
            console.log('📍 精确定位失败:', error.message);
            reject(error);
          },
          {
            enableHighAccuracy: true, // 高精度模式，使用GPS
            timeout: 15000, // 15秒超时
            maximumAge: 30000, // 接受30秒内的缓存位置
          }
        );
      });

      try {
        // 使用Promise.race，谁先成功就用谁的结果
        const location = await Promise.race([fastLocationPromise, accurateLocationPromise]);
        
        console.log('📍 位置获取成功:', location);
        setCurrentLocation(location);
        setSelectedLocation(location);
        setMapCenter({
          latitude: location.latitude,
          longitude: location.longitude,
        });
        
        // 更新WebView中的地图
        if (webViewRef.current) {
          webViewRef.current.postMessage(JSON.stringify({
            type: 'updateLocation',
            latitude: location.latitude,
            longitude: location.longitude,
          }));
        }
        
        setLoading(false);

        // 如果是快速定位成功，继续等待精确定位（静默更新）
        if (location.locationName === '我的位置') {
          accurateLocationPromise.then((accurateLocation) => {
            console.log('📍 精确定位完成，更新位置');
            setCurrentLocation(accurateLocation);
            setSelectedLocation(accurateLocation);
            setMapCenter({
              latitude: accurateLocation.latitude,
              longitude: accurateLocation.longitude,
            });
            
            // 更新WebView中的地图
            if (webViewRef.current) {
              webViewRef.current.postMessage(JSON.stringify({
                type: 'updateLocation',
                latitude: accurateLocation.latitude,
                longitude: accurateLocation.longitude,
              }));
            }
          }).catch(() => {
            // 精确定位失败，但已有快速定位结果，不处理
            console.log('📍 精确定位失败，保持快速定位结果');
          });
        }

      } catch (error) {
        console.error('📍 所有定位方式都失败:', error);
        
        // 如果定位失败，提供一个模拟位置选项
        Alert.alert(
          '定位失败',
          '无法获取当前位置。是否使用模拟位置进行测试？',
          [
            { text: '取消', style: 'cancel', onPress: () => setLoading(false) },
            {
              text: '使用模拟位置',
              onPress: () => {
                const mockLocation: LocationData = {
                  latitude: 39.9042 + (Math.random() - 0.5) * 0.01,
                  longitude: 116.4074 + (Math.random() - 0.5) * 0.01,
                  address: '模拟位置: 北京市区附近',
                  locationName: '模拟位置',
                };
                
                setCurrentLocation(mockLocation);
                setSelectedLocation(mockLocation);
                setMapCenter({
                  latitude: mockLocation.latitude,
                  longitude: mockLocation.longitude,
                });
                
                // 更新WebView中的地图
                if (webViewRef.current) {
                  webViewRef.current.postMessage(JSON.stringify({
                    type: 'updateLocation',
                    latitude: mockLocation.latitude,
                    longitude: mockLocation.longitude,
                  }));
                }
                
                setLoading(false);
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('📍 定位权限或其他错误:', error);
      setLoading(false);
      Alert.alert('定位错误', '获取位置时发生错误，请稍后重试');
    }
  };

  // 组件显示时获取位置
  useEffect(() => {
    if (visible) {
      getCurrentLocation();
    }
  }, [visible]);

  // 发送位置
  const handleSendLocation = () => {
    if (selectedLocation) {
      onSendLocation(selectedLocation);
      onClose();
    }
  };

  // 逆地理编码获取地址信息
  const reverseGeocode = async (latitude: number, longitude: number): Promise<{ locationName: string; address: string }> => {
    console.log('📍 开始逆地理编码:', { latitude, longitude });
    
    // 方案1：使用本地省市县数据库（最可靠）
    try {
      const { getDetailedAddress } = await import('../data/chinaRegions');
      const result = getDetailedAddress(latitude, longitude);
      console.log('📍 本地数据库解析结果:', result);
      
      // 如果找到了详细地址，直接返回
      if (result.address && !result.address.includes('经度:')) {
        return result;
      }
    } catch (error) {
      console.log('📍 本地数据库解析失败:', error);
    }
    
    // 方案2：尝试使用OpenStreetMap Nominatim API（如果网络可用）
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=zh-CN`,
        {
          method: 'GET',
          headers: {
            'User-Agent': 'SMhom/1.0',
            'Accept': 'application/json',
          },
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📍 Nominatim API响应成功');
        
        if (data && data.address) {
          const addr = data.address;
          
          // 构建详细地址 - 按中国地址格式：省市区街道门牌号
          const addressParts = [];
          
          // 省份
          if (addr.state || addr.province) {
            addressParts.push(addr.state || addr.province);
          }
          
          // 城市
          if (addr.city || addr.municipality || addr.county) {
            addressParts.push(addr.city || addr.municipality || addr.county);
          }
          
          // 区县
          if (addr.suburb || addr.district || addr.subdistrict) {
            addressParts.push(addr.suburb || addr.district || addr.subdistrict);
          }
          
          // 街道/社区
          if (addr.neighbourhood || addr.quarter || addr.village) {
            addressParts.push(addr.neighbourhood || addr.quarter || addr.village);
          }
          
          // 道路
          if (addr.road || addr.street) {
            addressParts.push(addr.road || addr.street);
          }
          
          // 门牌号
          if (addr.house_number) {
            addressParts.push(addr.house_number + '号');
          }
          
          // 位置名称（优先使用具体的地点名称）
          const locationName = addr.name || 
                              addr.shop || 
                              addr.amenity || 
                              addr.building || 
                              addr.tourism ||
                              addr.office ||
                              addr.leisure ||
                              (addr.road ? addr.road : null) ||
                              '选择的位置';
          
          // 完整地址
          const fullAddress = addressParts.length > 0 ? addressParts.join('') : data.display_name;
          
          console.log('📍 Nominatim解析出的地址:', { locationName, address: fullAddress });
          
          return {
            locationName,
            address: fullAddress
          };
        }
      }
    } catch (error: any) {
      console.log('📍 Nominatim逆地理编码失败或超时:', error.message);
    }
    
    // 方案3：使用本地数据库的基础匹配（备用方案）
    try {
      const { findRegionByCoordinates } = await import('../data/chinaRegions');
      const result = findRegionByCoordinates(latitude, longitude);
      console.log('📍 使用本地基础匹配:', result);
      return result;
    } catch (error) {
      console.log('📍 本地基础匹配失败:', error);
    }
    
    // 最终备用方案：返回坐标信息
    console.log('📍 使用最终备用方案');
    return {
      locationName: '选择的位置',
      address: `经度: ${longitude.toFixed(4)}°, 纬度: ${latitude.toFixed(4)}°`
    };
  };

  // 处理来自WebView的消息
  const handleWebViewMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📍 WebView消息:', data);
      
      if (data.type === 'locationSelected') {
        // 显示临时位置信息
        const tempLocation: LocationData = {
          latitude: data.latitude,
          longitude: data.longitude,
          address: '正在获取地址信息...',
          locationName: '选择的位置',
        };
        
        setSelectedLocation(tempLocation);
        setMapCenter({
          latitude: data.latitude,
          longitude: data.longitude,
        });
        
        // 异步获取详细地址信息
        try {
          const { locationName, address } = await reverseGeocode(data.latitude, data.longitude);
          
          const detailedLocation: LocationData = {
            latitude: data.latitude,
            longitude: data.longitude,
            address,
            locationName,
          };
          
          setSelectedLocation(detailedLocation);
          console.log('📍 地址解析完成:', detailedLocation);
        } catch (error) {
          console.error('📍 地址解析失败:', error);
          // 保持基本的坐标信息
          setSelectedLocation({
            latitude: data.latitude,
            longitude: data.longitude,
            address: `坐标: ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`,
            locationName: '选择的位置',
          });
        }
      } else if (data.type === 'mapReady') {
        setMapReady(true);
        console.log('📍 地图加载完成');
      }
    } catch (error) {
      console.error('📍 解析WebView消息失败:', error);
    }
  };

  // 生成简单地图HTML（使用OpenStreetMap，无需API密钥）
  const generateMapHTML = () => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>选择位置</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style type="text/css">
        body, html { 
            margin: 0; 
            padding: 0; 
            width: 100%; 
            height: 100%; 
            font-family: Arial, sans-serif;
        }
        #mapid { 
            height: 100%; 
            width: 100%; 
        }
        .custom-div-icon {
            background: #ff6b81;
            border-radius: 50% 50% 50% 0;
            width: 20px;
            height: 20px;
            transform: rotate(-45deg);
            border: 2px solid #fff;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        }
        .custom-div-icon::after {
            content: '';
            position: absolute;
            width: 8px;
            height: 8px;
            margin: 6px;
            background: #fff;
            border-radius: 50%;
        }
    </style>
</head>
<body>
    <div id="mapid"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script type="text/javascript">
        // 使用高德地图作为底图（国内访问较好）
        var mymap = L.map('mapid').setView([${mapCenter.latitude}, ${mapCenter.longitude}], 15);

        // 添加高德地图图层
        L.tileLayer('http://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
            attribution: '&copy; 高德地图',
            maxZoom: 18,
        }).addTo(mymap);

        // 自定义标记图标
        var customIcon = L.divIcon({
            className: 'custom-div-icon',
            iconSize: [20, 20],
            iconAnchor: [10, 20]
        });

        var marker = L.marker([${mapCenter.latitude}, ${mapCenter.longitude}], {
            icon: customIcon,
            draggable: true
        }).addTo(mymap);

        // 地图点击事件
        mymap.on('click', function(e) {
            var lat = e.latlng.lat;
            var lng = e.latlng.lng;
            
            marker.setLatLng([lat, lng]);
            mymap.setView([lat, lng], mymap.getZoom());
            
            // 发送消息给React Native
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'locationSelected',
                    latitude: lat,
                    longitude: lng
                }));
            }
        });

        // 标记拖拽事件
        marker.on('dragend', function(e) {
            var lat = e.target.getLatLng().lat;
            var lng = e.target.getLatLng().lng;
            
            // 发送消息给React Native
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'locationSelected',
                    latitude: lat,
                    longitude: lng
                }));
            }
        });
        
        // 监听来自React Native的消息
        window.addEventListener('message', function(e) {
            try {
                var data = JSON.parse(e.data);
                if (data.type === 'updateLocation') {
                    marker.setLatLng([data.latitude, data.longitude]);
                    mymap.setView([data.latitude, data.longitude], mymap.getZoom());
                }
            } catch (err) {
                console.error('解析消息失败:', err);
            }
        });
        
        // 地图加载完成
        mymap.whenReady(function() {
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'mapReady'
                }));
            }
        });
        
        // 添加缩放控制
        L.control.zoom({
            position: 'topright'
        }).addTo(mymap);
    </script>
</body>
</html>
    `;
  };

  // 地图显示区域
  const renderMapView = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff6b81" />
          <Text style={styles.loadingText}>正在获取位置...</Text>
          <Text style={styles.loadingSubText}>
            正在尝试快速定位和精确定位{'\n'}
            请确保已开启位置服务
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: generateMapHTML() }}
          style={styles.webView}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.webViewLoading}>
              <ActivityIndicator size="small" color="#ff6b81" />
              <Text style={styles.webViewLoadingText}>地图加载中...</Text>
            </View>
          )}
          onMessage={handleWebViewMessage}
          onError={(error) => {
            console.error('📍 WebView加载错误:', error);
          }}
        />
        
                 {/* 地图说明文字 */}
         <View style={styles.mapInstruction}>
           <Text style={styles.instructionText}>点击地图选择位置 • 拖拽标记调整</Text>
         </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent={true}
    >
      <SafeAreaView style={styles.container}>
        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>选择位置</Text>
          <TouchableOpacity 
            style={[styles.sendButton, !selectedLocation && styles.disabledButton]} 
            onPress={handleSendLocation}
            disabled={!selectedLocation}
          >
            <Text style={[styles.sendButtonText, !selectedLocation && styles.disabledText]}>
              发送
            </Text>
          </TouchableOpacity>
        </View>

        {/* 地图区域 */}
        <View style={styles.mapSection}>
          {renderMapView()}
        </View>

        {/* 位置信息 */}
        {selectedLocation && (
          <View style={styles.locationInfo}>
            <View style={styles.locationItem}>
              <Icon name="location" size={20} color="#ff6b81" />
              <View style={styles.locationText}>
                <Text style={styles.locationName}>{selectedLocation.locationName}</Text>
                <Text style={styles.locationAddress}>{selectedLocation.address}</Text>
              </View>
            </View>
          </View>
        )}

        {/* 底部操作区 */}
        <View style={styles.bottomActions}>
          <TouchableOpacity 
            style={styles.myLocationButton} 
            onPress={getCurrentLocation}
            disabled={loading}
          >
            <Icon name="navigate" size={20} color="#fff" />
            <Text style={styles.myLocationText}>当前位置</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ff6b81',
    borderRadius: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  disabledText: {
    color: '#999',
  },
  mapSection: {
    flex: 1,
    position: 'relative',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  loadingSubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  webViewLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  mapInstruction: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  instructionText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  locationInfo: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  locationText: {
    flex: 1,
    marginLeft: 12,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  bottomActions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  myLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
  },
  myLocationText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default LocationPickerModal; 