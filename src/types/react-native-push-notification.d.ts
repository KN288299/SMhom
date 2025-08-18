declare module 'react-native-push-notification' {
  export interface PushNotificationConfig {
    permissions?: {
      alert?: boolean;
      badge?: boolean;
      sound?: boolean;
    };
    onRegister?: (token: any) => void;
    onNotification?: (notification: any) => void;
    onAction?: (notification: any) => void;
    onRegistrationError?: (err: any) => void;
    popInitialNotification?: boolean;
    requestPermissions?: boolean;
  }

  export interface LocalNotificationConfig {
    id?: string;
    title?: string;
    message: string;
    data?: any;
    actions?: string[];
    category?: string;
    soundName?: string;
    playSound?: boolean;
    vibrate?: boolean;
    priority?: string;
    importance?: string;
    ongoing?: boolean;
    autoCancel?: boolean;
    largeIcon?: string;
    bigText?: string;
    subText?: string;
  }

  export interface CancelLocalNotificationsConfig {
    id?: string;
  }

  export default class PushNotification {
    static configure(config: PushNotificationConfig): void;
    static localNotification(config: LocalNotificationConfig): void;
    static cancelLocalNotifications(config: CancelLocalNotificationsConfig): void;
  }
}
