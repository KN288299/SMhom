import React, { useEffect, useRef, useMemo, memo } from 'react';
import { Card, Typography, Space } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface LocationMapProps {
  locationData: {
    latitude: number;
    longitude: number;
    address?: string;
    locationName?: string;
    timestamp?: string;
  };
  height?: number;
}

const LocationMap: React.FC<LocationMapProps> = memo(({ 
  locationData, 
  height = 300 
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasInitialized = useRef(false);

  // 使用useMemo缓存地图HTML
  const mapHTML = useMemo(() => {
    const { latitude, longitude, address = '', locationName = '用户位置' } = locationData;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>用户位置</title>
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
            min-width: 200px;
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
            line-height: 1.4;
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
        // 初始化地图 - 添加性能优化选项
        var mymap = L.map('mapid', {
            preferCanvas: true,
            renderer: L.canvas(),
            zoomControl: false,
            attributionControl: true
        }).setView([${latitude}, ${longitude}], 15);

        // 使用单一稳定的地图源避免重复尝试
        var tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19,
            // 性能优化配置
            keepBuffer: 2,
            maxNativeZoom: 18,
            tileSize: 256,
            zoomOffset: 0,
            detectRetina: false,
            updateWhenIdle: true,
            updateWhenZooming: false
        });

        // 直接添加地图图层
        tileLayer.addTo(mymap);

        // 创建自定义标记
        var customIcon = L.divIcon({
            className: 'custom-div-icon',
            iconSize: [20, 20],
            iconAnchor: [10, 20],
            popupAnchor: [0, -20]
        });

        // 添加标记和弹出框
        var marker = L.marker([${latitude}, ${longitude}], {
            icon: customIcon
        }).addTo(mymap);

        // 创建弹出框内容
        var popupContent = \`
            <div class="location-popup">
                <div class="location-name">${locationName}</div>
                \${${address ? `'<div class="location-address">' + '${address}' + '</div>'` : `''`}}
                <div class="location-coords">
                    ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
                </div>
            </div>
        \`;

        marker.bindPopup(popupContent).openPopup();

        // 添加缩放控制
        L.control.zoom({
            position: 'topright'
        }).addTo(mymap);
    </script>
</body>
</html>
    `;
  }, [locationData.latitude, locationData.longitude, locationData.address, locationData.locationName]);

  // 只在首次或位置变化时更新iframe内容
  useEffect(() => {
    if (iframeRef.current && locationData && !hasInitialized.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(mapHTML);
        doc.close();
        hasInitialized.current = true;
      }
    }
  }, [mapHTML]);

  if (!locationData || !locationData.latitude || !locationData.longitude) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          <EnvironmentOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
          <div>暂无位置信息</div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title={
        <Space>
          <EnvironmentOutlined />
          <span>用户位置</span>
        </Space>
      }
      size="small"
    >
      <div style={{ marginBottom: '12px' }}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {locationData.locationName && (
            <Text strong>{locationData.locationName}</Text>
          )}
          {locationData.address && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {locationData.address}
            </Text>
          )}
          <Text 
            code 
            style={{ fontSize: '11px' }}
            title="经纬度坐标"
          >
            {locationData.latitude.toFixed(6)}, {locationData.longitude.toFixed(6)}
          </Text>
          {locationData.timestamp && (
            <Text type="secondary" style={{ fontSize: '11px' }}>
              采集时间: {new Date(locationData.timestamp).toLocaleString('zh-CN')}
            </Text>
          )}
        </Space>
      </div>
      
      <iframe
        ref={iframeRef}
        style={{
          width: '100%',
          height: `${height}px`,
          border: '1px solid #d9d9d9',
          borderRadius: '6px',
        }}
        title="用户位置地图"
      />
    </Card>
  );
});

LocationMap.displayName = 'LocationMap';

export default LocationMap;
