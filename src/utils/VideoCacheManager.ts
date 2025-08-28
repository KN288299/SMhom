import RNFS from 'react-native-fs';
import NetInfo from '@react-native-community/netinfo';

type PrefetchOptions = {
  wifiOnly?: boolean;
  maxSizeMB?: number; // 允许预取的最大文件大小（MB），未知大小时不限制
  timeoutMs?: number;
};

const VIDEO_CACHE_DIR = `${RNFS.CachesDirectoryPath}/video_cache_v2`;
const DEFAULT_MAX_CACHE_BYTES = 300 * 1024 * 1024; // 300MB

const ensureCacheDir = async (): Promise<void> => {
  try {
    const exists = await RNFS.exists(VIDEO_CACHE_DIR);
    if (!exists) {
      await RNFS.mkdir(VIDEO_CACHE_DIR);
    }
  } catch (e) {
    // 忽略目录创建失败，后续操作会安全失败
  }
};

const safeFileName = (url: string): string => {
  // 将URL编码，并截断过长名称，保留扩展名（若可解析）
  const uri = encodeURIComponent(url);
  const parts = url.split('?')[0].split('#')[0].split('.');
  const extCandidate = parts.length > 1 ? parts.pop() || '' : '';
  const ext = (extCandidate || 'mp4').toLowerCase();
  const base = uri.replace(/[^a-zA-Z0-9_%\-\.]/g, '_').slice(0, 100);
  return `${base}.${ext}`;
};

const pathForUrl = (url: string): string => {
  return `${VIDEO_CACHE_DIR}/${safeFileName(url)}`;
};

const getCacheSize = async (): Promise<number> => {
  try {
    await ensureCacheDir();
    const files = await RNFS.readDir(VIDEO_CACHE_DIR);
    return files.reduce((sum, f) => sum + (f.size || 0), 0);
  } catch {
    return 0;
  }
};

const cleanupLRU = async (maxBytes: number = DEFAULT_MAX_CACHE_BYTES): Promise<void> => {
  try {
    await ensureCacheDir();
    const files = await RNFS.readDir(VIDEO_CACHE_DIR);
    let total = files.reduce((sum, f) => sum + (f.size || 0), 0);
    if (total <= maxBytes) return;

    const sortable = files
      .filter(f => f.isFile())
      .map(f => ({ path: f.path, name: f.name, size: f.size || 0, mtime: f.mtime ? new Date(f.mtime).getTime() : 0 }))
      .sort((a, b) => a.mtime - b.mtime); // 最旧优先删除

    for (const f of sortable) {
      if (total <= Math.floor(maxBytes * 0.8)) break; // 清到80%
      try {
        await RNFS.unlink(f.path);
        total -= f.size;
      } catch {
        // 忽略删除失败
      }
    }
  } catch {
    // 忽略清理异常
  }
};

const isWifiConnected = async (): Promise<boolean> => {
  try {
    const state = await NetInfo.fetch();
    return state.type === 'wifi' && (state.isConnected ?? false);
  } catch {
    return false;
  }
};

const headContentLength = async (url: string, timeoutMs: number = 8000): Promise<number | null> => {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal as any });
    clearTimeout(id);
    const len = res.headers.get('content-length');
    if (len) return parseInt(len, 10) || null;
    return null;
  } catch {
    return null;
  }
};

export const getCachedPath = async (url: string): Promise<string | null> => {
  try {
    if (!url || url.startsWith('file://') || url.startsWith('ph://') || url.startsWith('assets-library://')) {
      return null;
    }
    const toFile = pathForUrl(url);
    const exists = await RNFS.exists(toFile);
    return exists ? toFile : null;
  } catch {
    return null;
  }
};

export const prefetch = async (url: string, opts: PrefetchOptions = {}): Promise<boolean> => {
  try {
    if (!url) return false;
    if (url.startsWith('file://') || url.startsWith('ph://') || url.startsWith('assets-library://')) {
      return false; // 本地文件无需缓存
    }

    if (opts.wifiOnly) {
      const onWifi = await isWifiConnected();
      if (!onWifi) return false;
    }

    await ensureCacheDir();
    const toFile = pathForUrl(url);
    const exists = await RNFS.exists(toFile);
    if (exists) return true;

    // 可选：检查文件大小，超过阈值则跳过
    if (opts.maxSizeMB && opts.maxSizeMB > 0) {
      const len = await headContentLength(url, opts.timeoutMs ?? 8000);
      if (len && len > opts.maxSizeMB * 1024 * 1024) {
        return false;
      }
    }

    const result = await RNFS.downloadFile({
      fromUrl: url,
      toFile,
      connectionTimeout: 10000,
      readTimeout: 60000,
      background: true,
      discretionary: true,
    }).promise;

    if (result.statusCode === 200) {
      // 触摸mtime以便LRU排序
      try { await RNFS.touch(toFile, new Date(), new Date()); } catch {}
      // 超限清理
      await cleanupLRU();
      return true;
    }

    // 失败清理半文件
    try { await RNFS.unlink(toFile); } catch {}
    return false;
  } catch {
    return false;
  }
};

export const clearAll = async (): Promise<void> => {
  try {
    const exists = await RNFS.exists(VIDEO_CACHE_DIR);
    if (!exists) return;
    const files = await RNFS.readDir(VIDEO_CACHE_DIR);
    for (const f of files) {
      try { await RNFS.unlink(f.path); } catch {}
    }
  } catch {}
};

export default {
  ensureCacheDir,
  getCachedPath,
  prefetch,
  getCacheSize,
  cleanupLRU,
  clearAll,
  pathForUrl,
};


