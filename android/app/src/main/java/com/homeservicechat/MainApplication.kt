package com.homeservicechat

import android.app.Application
import android.util.Log
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> {
            val packages = PackageList(this).packages
            // 添加调试日志
            Log.d("ReactNative", "初始化Native模块，包数量：${packages.size}")
            
            // 记录所有已加载的包
            for (pkg in packages) {
                Log.d("ReactNative", "已加载包: ${pkg.javaClass.name}")
            }
            
            return packages
        }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
        
        // 添加Metro服务器URL配置，确保使用正确的IP地址
        // 如果是模拟器，localhost和10.0.2.2都可能有效
        // 如果是真机，则需要使用电脑的局域网IP地址
        override fun getJSBundleFile(): String? {
          // 如果你想强制使用预打包的bundle，取消下面一行注释
          // return super.getJSBundleFile()
          return null // 返回null会使用getBundleAssetName()或连接到开发服务器
        }
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, OpenSourceMergedSoMapping)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
    // 添加调试日志
    Log.d("ReactNative", "MainApplication已创建，初始化完成")
  }
}
