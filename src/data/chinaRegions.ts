// 中国省市县区域数据
export interface RegionBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface ChinaRegion {
  name: string;
  fullName: string;
  bounds: RegionBounds;
  level: 'province' | 'city' | 'district';
  parent?: string;
}

// 中国主要省份和城市的坐标范围
export const chinaRegions: ChinaRegion[] = [
  // 直辖市
  {
    name: '北京',
    fullName: '北京市',
    bounds: { minLat: 39.4, maxLat: 41.6, minLng: 115.7, maxLng: 117.4 },
    level: 'city'
  },
  {
    name: '上海',
    fullName: '上海市',
    bounds: { minLat: 30.7, maxLat: 31.9, minLng: 120.9, maxLng: 122.2 },
    level: 'city'
  },
  {
    name: '天津',
    fullName: '天津市',
    bounds: { minLat: 38.6, maxLat: 40.3, minLng: 116.7, maxLng: 118.1 },
    level: 'city'
  },
  {
    name: '重庆',
    fullName: '重庆市',
    bounds: { minLat: 28.1, maxLat: 32.2, minLng: 105.3, maxLng: 110.1 },
    level: 'city'
  },

  // 广东省
  {
    name: '广东',
    fullName: '广东省',
    bounds: { minLat: 20.1, maxLat: 25.5, minLng: 109.7, maxLng: 117.3 },
    level: 'province'
  },
  {
    name: '广州',
    fullName: '广东省广州市',
    bounds: { minLat: 22.8, maxLat: 23.9, minLng: 113.0, maxLng: 114.0 },
    level: 'city',
    parent: '广东'
  },
  {
    name: '深圳',
    fullName: '广东省深圳市',
    bounds: { minLat: 22.4, maxLat: 22.9, minLng: 113.8, maxLng: 114.6 },
    level: 'city',
    parent: '广东'
  },
  {
    name: '东莞',
    fullName: '广东省东莞市',
    bounds: { minLat: 22.9, maxLat: 23.3, minLng: 113.6, maxLng: 114.1 },
    level: 'city',
    parent: '广东'
  },
  {
    name: '佛山',
    fullName: '广东省佛山市',
    bounds: { minLat: 22.8, maxLat: 23.2, minLng: 112.8, maxLng: 113.4 },
    level: 'city',
    parent: '广东'
  },

  // 江苏省
  {
    name: '江苏',
    fullName: '江苏省',
    bounds: { minLat: 30.7, maxLat: 35.3, minLng: 116.4, maxLng: 121.9 },
    level: 'province'
  },
  {
    name: '南京',
    fullName: '江苏省南京市',
    bounds: { minLat: 31.6, maxLat: 32.4, minLng: 118.4, maxLng: 119.2 },
    level: 'city',
    parent: '江苏'
  },
  {
    name: '苏州',
    fullName: '江苏省苏州市',
    bounds: { minLat: 31.0, maxLat: 31.8, minLng: 119.8, maxLng: 121.2 },
    level: 'city',
    parent: '江苏'
  },

  // 浙江省
  {
    name: '浙江',
    fullName: '浙江省',
    bounds: { minLat: 27.0, maxLat: 31.4, minLng: 118.0, maxLng: 123.0 },
    level: 'province'
  },
  {
    name: '杭州',
    fullName: '浙江省杭州市',
    bounds: { minLat: 29.8, maxLat: 30.6, minLng: 119.7, maxLng: 120.7 },
    level: 'city',
    parent: '浙江'
  },
  {
    name: '宁波',
    fullName: '浙江省宁波市',
    bounds: { minLat: 29.0, maxLat: 30.0, minLng: 121.0, maxLng: 122.0 },
    level: 'city',
    parent: '浙江'
  },

  // 山东省
  {
    name: '山东',
    fullName: '山东省',
    bounds: { minLat: 34.4, maxLat: 38.4, minLng: 114.8, maxLng: 122.7 },
    level: 'province'
  },
  {
    name: '青岛',
    fullName: '山东省青岛市',
    bounds: { minLat: 35.8, maxLat: 36.9, minLng: 119.8, maxLng: 121.1 },
    level: 'city',
    parent: '山东'
  },
  {
    name: '济南',
    fullName: '山东省济南市',
    bounds: { minLat: 36.4, maxLat: 37.1, minLng: 116.7, maxLng: 117.4 },
    level: 'city',
    parent: '山东'
  },

  // 河北省
  {
    name: '河北',
    fullName: '河北省',
    bounds: { minLat: 36.0, maxLat: 42.6, minLng: 113.5, maxLng: 119.8 },
    level: 'province'
  },
  {
    name: '石家庄',
    fullName: '河北省石家庄市',
    bounds: { minLat: 37.8, maxLat: 38.5, minLng: 114.2, maxLng: 115.0 },
    level: 'city',
    parent: '河北'
  },

  // 湖北省
  {
    name: '湖北',
    fullName: '湖北省',
    bounds: { minLat: 29.0, maxLat: 33.3, minLng: 108.3, maxLng: 116.1 },
    level: 'province'
  },
  {
    name: '武汉',
    fullName: '湖北省武汉市',
    bounds: { minLat: 30.1, maxLat: 31.0, minLng: 113.7, maxLng: 115.0 },
    level: 'city',
    parent: '湖北'
  },

  // 四川省
  {
    name: '四川',
    fullName: '四川省',
    bounds: { minLat: 26.0, maxLat: 34.3, minLng: 97.3, maxLng: 108.5 },
    level: 'province'
  },
  {
    name: '成都',
    fullName: '四川省成都市',
    bounds: { minLat: 30.1, maxLat: 31.4, minLng: 103.4, maxLng: 104.9 },
    level: 'city',
    parent: '四川'
  },

  // 陕西省
  {
    name: '陕西',
    fullName: '陕西省',
    bounds: { minLat: 31.4, maxLat: 39.6, minLng: 105.5, maxLng: 111.2 },
    level: 'province'
  },
  {
    name: '西安',
    fullName: '陕西省西安市',
    bounds: { minLat: 33.8, maxLat: 34.8, minLng: 108.0, maxLng: 109.8 },
    level: 'city',
    parent: '陕西'
  },

  // 辽宁省
  {
    name: '辽宁',
    fullName: '辽宁省',
    bounds: { minLat: 38.7, maxLat: 43.4, minLng: 118.8, maxLng: 125.5 },
    level: 'province'
  },
  {
    name: '大连',
    fullName: '辽宁省大连市',
    bounds: { minLat: 38.8, maxLat: 39.9, minLng: 121.0, maxLng: 122.2 },
    level: 'city',
    parent: '辽宁'
  },
  {
    name: '沈阳',
    fullName: '辽宁省沈阳市',
    bounds: { minLat: 41.5, maxLat: 42.0, minLng: 123.0, maxLng: 123.8 },
    level: 'city',
    parent: '辽宁'
  },

  // 福建省
  {
    name: '福建',
    fullName: '福建省',
    bounds: { minLat: 23.5, maxLat: 28.4, minLng: 115.8, maxLng: 120.4 },
    level: 'province'
  },
  {
    name: '厦门',
    fullName: '福建省厦门市',
    bounds: { minLat: 24.2, maxLat: 24.7, minLng: 117.8, maxLng: 118.5 },
    level: 'city',
    parent: '福建'
  },
  {
    name: '福州',
    fullName: '福建省福州市',
    bounds: { minLat: 25.9, maxLat: 26.4, minLng: 119.0, maxLng: 119.8 },
    level: 'city',
    parent: '福建'
  },

  // 湖南省
  {
    name: '湖南',
    fullName: '湖南省',
    bounds: { minLat: 24.6, maxLat: 30.1, minLng: 108.8, maxLng: 114.2 },
    level: 'province'
  },
  {
    name: '长沙',
    fullName: '湖南省长沙市',
    bounds: { minLat: 27.8, maxLat: 28.4, minLng: 112.6, maxLng: 113.2 },
    level: 'city',
    parent: '湖南'
  },

  // 河南省
  {
    name: '河南',
    fullName: '河南省',
    bounds: { minLat: 31.4, maxLat: 36.4, minLng: 110.4, maxLng: 116.6 },
    level: 'province'
  },
  {
    name: '郑州',
    fullName: '河南省郑州市',
    bounds: { minLat: 34.4, maxLat: 35.0, minLng: 113.0, maxLng: 114.0 },
    level: 'city',
    parent: '河南'
  },

  // 安徽省
  {
    name: '安徽',
    fullName: '安徽省',
    bounds: { minLat: 29.4, maxLat: 34.7, minLng: 114.9, maxLng: 119.3 },
    level: 'province'
  },
  {
    name: '合肥',
    fullName: '安徽省合肥市',
    bounds: { minLat: 31.5, maxLat: 32.1, minLng: 117.0, maxLng: 117.8 },
    level: 'city',
    parent: '安徽'
  },
];

// 根据坐标查找对应的地区
export function findRegionByCoordinates(latitude: number, longitude: number): {
  locationName: string;
  address: string;
} {
  // 首先查找最精确的城市匹配
  const cityMatch = chinaRegions
    .filter(region => region.level === 'city')
    .find(region => {
      const { bounds } = region;
      return latitude >= bounds.minLat && latitude <= bounds.maxLat &&
             longitude >= bounds.minLng && longitude <= bounds.maxLng;
    });

  if (cityMatch) {
    return {
      locationName: cityMatch.name,
      address: cityMatch.fullName
    };
  }

  // 如果没有找到城市，查找省份
  const provinceMatch = chinaRegions
    .filter(region => region.level === 'province')
    .find(region => {
      const { bounds } = region;
      return latitude >= bounds.minLat && latitude <= bounds.maxLat &&
             longitude >= bounds.minLng && longitude <= bounds.maxLng;
    });

  if (provinceMatch) {
    return {
      locationName: provinceMatch.name + '地区',
      address: provinceMatch.fullName + '范围内'
    };
  }

  // 都没找到，返回坐标信息
  return {
    locationName: '选择的位置',
    address: `经度: ${longitude.toFixed(4)}°, 纬度: ${latitude.toFixed(4)}°`
  };
}

// 获取更详细的地址描述
export function getDetailedAddress(latitude: number, longitude: number): {
  locationName: string;
  address: string;
} {
  const result = findRegionByCoordinates(latitude, longitude);
  
  // 如果找到了城市，尝试添加更多细节
  const cityMatch = chinaRegions
    .filter(region => region.level === 'city')
    .find(region => {
      const { bounds } = region;
      return latitude >= bounds.minLat && latitude <= bounds.maxLat &&
             longitude >= bounds.minLng && longitude <= bounds.maxLng;
    });

  if (cityMatch) {
    // 根据坐标在城市内的相对位置，添加方位描述
    const { bounds } = cityMatch;
    const centerLat = (bounds.minLat + bounds.maxLat) / 2;
    const centerLng = (bounds.minLng + bounds.maxLng) / 2;
    
    let direction = '';
    if (latitude > centerLat && longitude > centerLng) {
      direction = '东北部';
    } else if (latitude > centerLat && longitude < centerLng) {
      direction = '西北部';
    } else if (latitude < centerLat && longitude > centerLng) {
      direction = '东南部';
    } else if (latitude < centerLat && longitude < centerLng) {
      direction = '西南部';
    } else if (latitude > centerLat) {
      direction = '北部';
    } else if (latitude < centerLat) {
      direction = '南部';
    } else if (longitude > centerLng) {
      direction = '东部';
    } else if (longitude < centerLng) {
      direction = '西部';
    } else {
      direction = '中心区域';
    }

    return {
      locationName: `${cityMatch.name}${direction}`,
      address: `${cityMatch.fullName}${direction}`
    };
  }

  return result;
} 