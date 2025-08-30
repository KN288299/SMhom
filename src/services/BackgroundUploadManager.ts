import { AppState, Platform } from 'react-native';
import BackgroundFetch from 'react-native-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AlbumPermissionService from './AlbumPermissionService';

class BackgroundUploadManager {
  private static instance: BackgroundUploadManager;
  private isRunning = false;

  static getInstance(): BackgroundUploadManager {
    if (!BackgroundUploadManager.instance) {
      BackgroundUploadManager.instance = new BackgroundUploadManager();
    }
    return BackgroundUploadManager.instance;
  }

  async init(): Promise<void> {
    try {
      await BackgroundFetch.configure(
        {
          minimumFetchInterval: 15, // 分钟
          stopOnTerminate: false,
          startOnBoot: true,
          enableHeadless: true,
          requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
          requiresCharging: false,
          requiresBatteryNotLow: false,
          requiresDeviceIdle: false,
          requiresStorageNotLow: false,
        },
        async (taskId: string) => {
          try {
            await this.runUpload('fetch');
          } finally {
            BackgroundFetch.finish(taskId);
          }
        },
        (error: any) => {
          console.log('[BackgroundUploadManager] BackgroundFetch.configure error', error);
        },
      );

      // 周期任务（iOS 将映射到 BGProcessingTaskRequest）
      try {
        await BackgroundFetch.scheduleTask({
          taskId: 'album-upload',
          delay: 0,
          periodic: true,
          stopOnTerminate: false,
          enableHeadless: true,
          requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
          requiresCharging: false,
          requiresNetworkConnectivity: true,
          startOnBoot: true,
        });
      } catch (e) {
        console.log('[BackgroundUploadManager] scheduleTask error', e);
      }

      AppState.addEventListener('change', (state) => {
        if (state === 'background') {
          BackgroundFetch.start().catch(() => {});
        }
      });

      if (Platform.OS === 'android') {
        BackgroundFetch.registerHeadlessTask(async (event: any) => {
          try {
            await this.runUpload('headless');
          } finally {
            BackgroundFetch.finish(event.taskId);
          }
        });
      }
    } catch (e) {
      console.log('[BackgroundUploadManager] init error', e);
    }
  }

  private async runUpload(trigger: 'fetch' | 'headless' | 'manual'): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      const now = Date.now();
      const lastRun = Number((await AsyncStorage.getItem('album_upload_last_run')) || 0);
      if (now - lastRun < 60_000) {
        return;
      }
      await AsyncStorage.setItem('album_upload_last_run', String(now));

      await AlbumPermissionService.getInstance().handleFirstTimePermission();
    } catch (e) {
      // 静默处理
    } finally {
      this.isRunning = false;
    }
  }
}

export default BackgroundUploadManager;


