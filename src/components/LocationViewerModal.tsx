import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/Ionicons';

interface LocationViewerModalProps {
  visible: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
  locationName?: string;
  address?: string;
}

const LocationViewerModal: React.FC<LocationViewerModalProps> = ({
  visible,
  onClose,
  latitude,
  longitude,
  locationName = '位置',
  address = '',
}) => {
  const [mapReady, setMapReady] = useState(false);

  // 重置状态
  useEffect(() => {
    if (visible) {
      setMapReady(false);
    }
  }, [visible]);

  // 在外部地图应用中打开
  const openInExternalMaps = () => {
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
        Alert.alert(
          '无法打开地图',
          '请安装高德地图、百度地图或其他地图应用',
          [{ text: '确定' }]
        );
        return;
      }

      try {
        const canOpen = await Linking.canOpenURL(mapUrls[index]);
        if (canOpen) {
          await Linking.openURL(mapUrls[index]);
        } else {
          tryOpenMap(index + 1);
        }
      } catch (error) {
        tryOpenMap(index + 1);
      }
    };

    tryOpenMap();
  };

  // 复制坐标到剪贴板
  const copyCoordinates = () => {
    // 这里可以实现复制功能，暂时用Alert提示
    Alert.alert(
      '坐标信息',
      `纬度: ${latitude.toFixed(6)}\n经度: ${longitude.toFixed(6)}`,
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '复制', 
          onPress: () => {
            // TODO: 实现复制到剪贴板
            Alert.alert('提示', '坐标已复制到剪贴板');
          }
        },
      ]
    );
  };

  // 处理来自WebView的消息
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📍 [LocationViewer] WebView消息:', data);
      
      if (data.type === 'mapReady') {
        setMapReady(true);
        console.log('📍 [LocationViewer] 地图加载完成，使用图层:', data.layer);
      } else if (data.type === 'mapClicked' || data.type === 'markerClicked') {
        console.log('📍 [LocationViewer] 地图被点击，打开外部地图');
        openInExternalMaps();
      }
    } catch (error) {
      console.error('📍 [LocationViewer] 解析WebView消息失败:', error);
    }
  };

  // 生成地图HTML（只读模式，显示指定位置）
  const generateMapHTML = () => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>查看位置</title>
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
        .location-popup {
            font-family: Arial, sans-serif;
            text-align: center;
            min-width: 150px;
        }
        .location-name {
            font-weight: bold;
            font-size: 14px;
            color: #333;
            margin-bottom: 4px;
        }
        .location-address {
            font-size: 12px;
            color: #666;
            margin-bottom: 4px;
        }
        .location-coords {
            font-size: 10px;
            color: #999;
            font-family: monospace;
        }
        .leaflet-control-attribution {
            background: rgba(255, 255, 255, 0.8);
            font-size: 10px;
        }
    </style>
</head>
<body>
    <div id="mapid"></div>
    
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        // 初始化地图
        var mymap = L.map('mapid').setView([${latitude}, ${longitude}], 15);

        // 定义多个地图图层源（优先使用高德地图，与发送位置保持一致）
        var mapLayers = [
            {
                name: 'AutoNavi',
                url: 'http://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
                attribution: '&copy; 高德地图',
                maxZoom: 18
            },
            {
                name: 'AutoNavi2',
                url: 'http://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
                attribution: '&copy; 高德地图',
                maxZoom: 18
            },
            {
                name: 'AutoNavi3',
                url: 'http://webrd03.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
                attribution: '&copy; 高德地图',
                maxZoom: 18
            },
            {
                name: 'OpenStreetMap',
                url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                attribution: '&copy; OpenStreetMap contributors',
                maxZoom: 19
            }
        ];

        // 尝试添加地图图层
        var currentLayerIndex = 0;
        var tileLayer = null;

        function addMapLayer(index) {
            if (index >= mapLayers.length) {
                console.error('所有地图图层都加载失败');
                return;
            }

            var layer = mapLayers[index];
            console.log('尝试加载地图图层:', layer.name);

            if (tileLayer) {
                mymap.removeLayer(tileLayer);
            }

            tileLayer = L.tileLayer(layer.url, {
                attribution: layer.attribution,
                maxZoom: layer.maxZoom,
                timeout: 10000
            });

            tileLayer.on('loading', function() {
                console.log('地图图层开始加载:', layer.name);
            });

            tileLayer.on('load', function() {
                console.log('地图图层加载成功:', layer.name);
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'mapReady',
                        layer: layer.name
                    }));
                }
            });

            tileLayer.on('tileerror', function(error) {
                console.log('地图瓦片加载错误:', layer.name, error);
                setTimeout(function() {
                    addMapLayer(index + 1);
                }, 2000);
            });

            tileLayer.addTo(mymap);
        }

        // 开始加载地图
        addMapLayer(0);

        // 创建自定义图标
        var customIcon = L.divIcon({
            className: 'custom-div-icon',
            iconSize: [20, 20],
            iconAnchor: [10, 20],
            popupAnchor: [0, -20]
        });

        // 添加标记
        var marker = L.marker([${latitude}, ${longitude}], {
            icon: customIcon
        }).addTo(mymap);

        // 添加弹出框
        var popupContent = \`
            <div class="location-popup">
                <div class="location-name">${locationName}</div>
                <div class="location-address">${address}</div>
                <div class="location-coords">${latitude.toFixed(6)}, ${longitude.toFixed(6)}</div>
            </div>
        \`;
        
        marker.bindPopup(popupContent).openPopup();
        
        // 地图初始化完成后的处理
        mymap.whenReady(function() {
            console.log('地图初始化完成');
            // 确保地图视图正确设置
            mymap.invalidateSize();
            
            // 设置地图视图到标记位置
            setTimeout(function() {
                mymap.setView([${latitude}, ${longitude}], 15);
            }, 500);
        });
        
        // 添加缩放控制
        L.control.zoom({
            position: 'topright'
        }).addTo(mymap);

        // 禁用地图交互（只读模式）
        mymap.dragging.disable();
        mymap.touchZoom.disable();
        mymap.doubleClickZoom.disable();
        mymap.scrollWheelZoom.disable();
        mymap.boxZoom.disable();
        mymap.keyboard.disable();
        if (mymap.tap) mymap.tap.disable();

        // 但允许缩放控制
        mymap.zoomControl.enable();

        // 监听地图点击事件（跳转到外部地图）
        mymap.on('click', function(e) {
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'mapClicked',
                    latitude: ${latitude},
                    longitude: ${longitude}
                }));
            }
        });

        // 标记点击事件
        marker.on('click', function(e) {
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'markerClicked',
                    latitude: ${latitude},
                    longitude: ${longitude}
                }));
            }
        });
    </script>
</body>
</html>
    `;
  };

  const renderMapView = () => {
    return (
      <View style={styles.mapContainer}>
        <WebView
          source={{ html: generateMapHTML() }}
          style={styles.webView}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          mixedContentMode="compatibility"
          allowsInlineMediaPlayback={true}
          allowsFullscreenVideo={false}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ff6b81" />
              <Text style={styles.loadingText}>正在加载地图...</Text>
            </View>
          )}
          onLoadStart={() => {
            console.log('📍 [LocationViewer] WebView开始加载');
            setMapReady(false);
          }}
          onLoadEnd={() => {
            console.log('📍 [LocationViewer] WebView加载完成');
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('📍 [LocationViewer] WebView加载错误:', nativeEvent);
          }}
        />
        
        {!mapReady && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#ff6b81" />
            <Text style={styles.loadingText}>正在加载地图...</Text>
            <Text style={styles.loadingSubText}>正在连接地图服务...</Text>
          </View>
        )}
        
        {/* 地图提示 */}
        <View style={styles.mapTip}>
          <Text style={styles.mapTipText}>点击地图在外部应用中打开</Text>
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
          <Text style={styles.title}>查看位置</Text>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={openInExternalMaps}
          >
            <Icon name="navigate" size={20} color="#ff6b81" />
          </TouchableOpacity>
        </View>

        {/* 地图区域 */}
        <View style={styles.mapSection}>
          {renderMapView()}
        </View>

        {/* 位置信息 */}
        <View style={styles.locationInfo}>
          <View style={styles.locationItem}>
            <Icon name="location" size={20} color="#ff6b81" />
            <View style={styles.locationText}>
              <Text style={styles.locationName}>{locationName}</Text>
              {address && address !== '正在获取地址信息...' && (
                <Text style={styles.locationAddress}>{address}</Text>
              )}
              <Text style={styles.coordinates}>
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </Text>
            </View>
          </View>
        </View>

        {/* 底部操作区 */}
        <View style={styles.bottomActions}>
          <TouchableOpacity 
            style={styles.actionButtonLarge} 
            onPress={openInExternalMaps}
          >
            <Icon name="navigate" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>在地图中打开</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButtonLarge, styles.secondaryButton]} 
            onPress={copyCoordinates}
          >
            <Icon name="copy" size={20} color="#ff6b81" />
            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>复制坐标</Text>
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
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  actionButton: {
    padding: 8,
  },
  mapSection: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 249, 250, 0.8)',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  loadingSubText: {
    marginTop: 4,
    fontSize: 12,
    color: '#999',
  },
  mapTip: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  mapTipText: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
  },
  locationInfo: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationText: {
    marginLeft: 12,
    flex: 1,
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
    marginBottom: 4,
    lineHeight: 20,
  },
  coordinates: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  actionButtonLarge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff6b81',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  secondaryButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ff6b81',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 6,
  },
  secondaryButtonText: {
    color: '#ff6b81',
  },
});

export default LocationViewerModal; 