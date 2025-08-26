import React, { memo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/Ionicons';

interface LocationMessageItemProps {
  latitude: number;
  longitude: number;
  locationName?: string;
  address?: string;
  isMe: boolean;
  timestamp: Date;
  onPress?: () => void;
}

const LocationMessageItem: React.FC<LocationMessageItemProps> = ({
  latitude,
  longitude,
  locationName = '位置',
  address = '',
  isMe,
  timestamp,
  onPress,
}) => {
  const [imageLoadError, setImageLoadError] = useState(false);
  // 格式化时间
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // 打开外部地图应用
  const openInMaps = () => {
    const mapUrls = [
      // 高德地图
      `amapuri://openFeature?featureName=ViewMap&lat=${latitude}&lon=${longitude}&zoom=15&maptype=standard&markers=${latitude},${longitude}`,
      // 百度地图
      `baidumap://map/marker?location=${latitude},${longitude}&title=${encodeURIComponent(locationName)}&src=ios.baidu.openAPIdemo`,
      // 腾讯地图
      `qqmap://map/marker?marker_coord=${latitude},${longitude}&marker_title=${encodeURIComponent(locationName)}`,
      // iOS 原生地图
      `maps://maps.apple.com/?ll=${latitude},${longitude}&q=${encodeURIComponent(locationName)}`,
      // 通用地图链接
      `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(locationName)})`,
    ];

    // 尝试打开各种地图应用
    const tryOpenMap = async (index = 0) => {
      if (index >= mapUrls.length) {
        // 如果所有地图都无法打开，显示坐标信息
        Alert.alert(
          '位置信息',
          `${locationName}\n${address}\n\n坐标: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          [
            { text: '取消', style: 'cancel' },
            { 
              text: '复制坐标', 
              onPress: () => {
                // 这里可以实现复制到剪贴板的功能
                Alert.alert('提示', '坐标已复制');
              }
            },
          ]
        );
        return;
      }

      try {
        const canOpen = await Linking.canOpenURL(mapUrls[index]);
        if (canOpen) {
          await Linking.openURL(mapUrls[index]);
        } else {
          // 尝试下一个地图应用
          tryOpenMap(index + 1);
        }
      } catch (error) {
        // 尝试下一个地图应用
        tryOpenMap(index + 1);
      }
    };

    tryOpenMap();
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      openInMaps();
    }
  };

  // 生成地图HTML（缩略图模式）
  const generateThumbnailHTML = () => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>位置缩略图</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style type="text/css">
        body, html { 
            margin: 0; 
            padding: 0; 
            width: 100%; 
            height: 100%; 
            font-family: Arial, sans-serif;
            overflow: hidden;
        }
        #mapid { 
            height: 100%; 
            width: 100%; 
        }
        .leaflet-control-container {
            display: none !important;
        }
        .custom-marker {
            background: #ff6b81;
            border-radius: 50% 50% 50% 0;
            width: 15px;
            height: 15px;
            transform: rotate(-45deg);
            border: 2px solid #fff;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        }
    </style>
</head>
<body>
    <div id="mapid"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        var mymap = L.map('mapid', {
            zoomControl: false,
            attributionControl: false,
            dragging: false,
            touchZoom: false,
            doubleClickZoom: false,
            scrollWheelZoom: false,
            boxZoom: false,
            keyboard: false
        }).setView([${latitude}, ${longitude}], 15);

        var mapLayers = [
            {
                name: 'AutoNavi',
                url: 'http://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
                attribution: '高德地图',
                maxZoom: 18
            },
            {
                name: 'AutoNavi2',
                url: 'http://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
                attribution: '高德地图',
                maxZoom: 18
            },
            {
                name: 'OSM',
                url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                attribution: 'OpenStreetMap',
                maxZoom: 19
            }
        ];

        var currentLayer = null;

        function addMapLayer(index) {
            if (index >= mapLayers.length) {
                console.log('所有地图源都无法加载');
                return;
            }

            var layer = mapLayers[index];
            console.log('尝试加载地图:', layer.name);

            if (currentLayer) {
                mymap.removeLayer(currentLayer);
            }

            currentLayer = L.tileLayer(layer.url, {
                attribution: layer.attribution,
                maxZoom: layer.maxZoom
            });

            currentLayer.on('tileerror', function(error) {
                console.log('地图瓦片加载错误:', error);
                setTimeout(() => addMapLayer(index + 1), 1000);
            });

            currentLayer.on('tileload', function() {
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'thumbnailReady',
                        layer: layer.name
                    }));
                }
            });

            currentLayer.addTo(mymap);
        }

        // 开始加载地图
        addMapLayer(0);

        // 创建自定义图标
        var customIcon = L.divIcon({
            className: 'custom-marker',
            iconSize: [15, 15],
            iconAnchor: [7, 15]
        });

        // 添加标记
        var marker = L.marker([${latitude}, ${longitude}], {
            icon: customIcon
        }).addTo(mymap);
    </script>
</body>
</html>`;
  };

  // 简化地址显示 - 只保留主要信息
  const getSimplifiedAddress = () => {
    if (!address || address.includes('正在获取') || address.includes('坐标:') || address.includes('经度:')) {
      return locationName || '位置';
    }
    
    // 提取省市信息，移除详细街道地址
    const addressParts = address.split(/[省市区县]/);
    if (addressParts.length >= 2) {
      // 返回省市级别的地址
      const province = addressParts[0] + '省';
      const city = addressParts[1] ? addressParts[1] + '市' : '';
      return city ? `${province}${city}` : province;
    }
    
    // 如果无法解析，返回原地址的前20个字符
    return address.length > 20 ? address.substring(0, 20) + '...' : address;
  };

  return (
    <View style={[styles.container, isMe ? styles.myMessage : styles.otherMessage]}>
      <TouchableOpacity style={styles.locationCard} onPress={handlePress}>
        {/* 地图缩略图 */}
        <View style={styles.mapThumbnail}>
          <WebView
            source={{ html: generateThumbnailHTML() }}
            style={styles.thumbnailWebView}
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === 'thumbnailReady') {
                  console.log('📍 地图缩略图加载完成:', data.layer);
                }
              } catch (error) {
                console.error('📍 解析地图消息失败:', error);
              }
            }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            bounces={false}
            onError={() => {
              console.log('WebView地图加载失败，显示占位图');
              setImageLoadError(true);
            }}
          />
          
          {/* 如果WebView加载失败，显示占位图 */}
          {imageLoadError && (
            <View style={styles.placeholderOverlay}>
              <View style={styles.mapGrid}>
                <View style={[styles.gridItem, styles.gridItem1]} />
                <View style={[styles.gridItem, styles.gridItem2]} />
                <View style={[styles.gridItem, styles.gridItem3]} />
                <View style={[styles.gridItem, styles.gridItem4]} />
              </View>
              <Icon name="map" size={24} color="#ff6b81" style={styles.mapIcon} />
            </View>
          )}
          
          {/* 查看提示 */}
          <View style={styles.viewHint}>
            <Icon name="eye" size={12} color="#fff" />
            <Text style={styles.viewHintText}>查看</Text>
          </View>
        </View>

        {/* 位置信息 */}
        <View style={styles.locationInfo}>
          {/* 位置标题和地址 */}
          <View style={styles.locationContent}>
            <View style={styles.locationHeader}>
              <Icon name="location" size={16} color="#ff6b81" />
              <Text style={styles.locationTitle} numberOfLines={1}>
                {locationName || '位置'}
              </Text>
            </View>
            
            {/* 简化地址 */}
            <Text style={styles.simplifiedAddress} numberOfLines={1}>
              {getSimplifiedAddress()}
            </Text>
          </View>

          {/* 查看提示 */}
          <View style={styles.actionHint}>
            <Icon name="chevron-forward" size={16} color="#ccc" />
          </View>
        </View>
      </TouchableOpacity>

      {/* 时间显示已移除 */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 16,
    maxWidth: '75%',
  },
  myMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minWidth: 240,
    overflow: 'hidden',
  },
  mapThumbnail: {
    height: 120,
    backgroundColor: '#f8f9fa',
    position: 'relative',
    overflow: 'hidden',
  },
  thumbnailWebView: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  markerOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -15 }, { translateY: -15 }],
  },
  locationMarker: {
    backgroundColor: '#ff6b81',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  viewHint: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewHintText: {
    fontSize: 10,
    color: '#fff',
    marginLeft: 4,
  },
  locationInfo: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationContent: {
    flex: 1,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginLeft: 6,
    flex: 1,
  },
  simplifiedAddress: {
    fontSize: 13,
    color: '#666',
    marginLeft: 22,
  },
  actionHint: {
    padding: 4,
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  placeholderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  mapGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: '50%',
    height: '50%',
  },
  gridItem1: {
    backgroundColor: '#e8f4f8',
  },
  gridItem2: {
    backgroundColor: '#f0f8e8',
  },
  gridItem3: {
    backgroundColor: '#f8f0e8',
  },
  gridItem4: {
    backgroundColor: '#f8e8f0',
  },
  mapIcon: {
    zIndex: 1,
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  myTimestamp: {
    textAlign: 'right',
  },
  otherTimestamp: {
    textAlign: 'left',
  },
});

// 使用memo优化性能
export default memo(LocationMessageItem, (prevProps, nextProps) => {
  return (
    prevProps.latitude === nextProps.latitude &&
    prevProps.longitude === nextProps.longitude &&
    prevProps.locationName === nextProps.locationName &&
    prevProps.address === nextProps.address &&
    prevProps.isMe === nextProps.isMe &&
    prevProps.timestamp.getTime() === nextProps.timestamp.getTime()
  );
}); 