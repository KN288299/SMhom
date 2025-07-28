/**
 * 此脚本用于解决React-Core产生的重复头文件问题
 * 通过删除React/RCTDefines.h文件，保留React/Base/RCTDefines.h
 */

const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

console.log('开始修复React-Core重复头文件问题...');

// Node modules根目录
const nodeModulesPath = path.resolve(process.cwd(), 'node_modules');
const reactNativePath = path.join(nodeModulesPath, 'react-native');

// 定义两个可能冲突的文件路径
const baseDefinesPath = path.join(reactNativePath, 'React/Base/RCTDefines.h');
const reactDefinesPath = path.join(reactNativePath, 'React/RCTDefines.h');

// 检查文件是否存在
if (fs.existsSync(reactDefinesPath)) {
  console.log(`删除冲突文件: ${reactDefinesPath}`);
  fs.unlinkSync(reactDefinesPath);
  console.log('✅ 已删除冲突文件');
} else {
  console.log(`冲突文件不存在: ${reactDefinesPath}`);
}

// 确保基本文件存在
if (!fs.existsSync(baseDefinesPath)) {
  console.log(`错误: 基础头文件不存在: ${baseDefinesPath}`);
  process.exit(1);
} else {
  console.log(`✅ 基础头文件存在: ${baseDefinesPath}`);
}

// 尝试直接修改React-Core.podspec
const podspecPath = path.join(nodeModulesPath, 'react-native', 'ReactCommon', 'React-Core.podspec');
if (fs.existsSync(podspecPath)) {
  console.log(`修改React-Core.podspec: ${podspecPath}`);
  let podspecContent = fs.readFileSync(podspecPath, 'utf8');
  
  // 备份原始文件
  fs.writeFileSync(`${podspecPath}.bak`, podspecContent);
  
  // 修改podspec以避免复制React/RCTDefines.h
  podspecContent = podspecContent.replace(
    /s\.header_dir\s*=\s*"React"/,
    's.header_dir = "React"\n  s.pod_target_xcconfig = { "HEADER_SEARCH_PATHS" => "$(PODS_TARGET_SRCROOT)/ReactCommon ${PODS_ROOT}/boost" }'
  );
  
  fs.writeFileSync(podspecPath, podspecContent);
  console.log('✅ 已修改React-Core.podspec');
} else {
  console.log(`未找到React-Core.podspec: ${podspecPath}`);
}

// 创建修复Podfile脚本
const fixPodfilePath = path.join(process.cwd(), 'ios', 'fix-react-podfile.rb');
const fixPodfileScript = `
# 修复React-Core重复头文件的Ruby脚本
def fix_react_core_headers(installer)
  puts "\\n[FIX] 修复React-Core重复头文件问题..."
  installer.pods_project.targets.each do |target|
    if target.name == 'React-Core'
      puts "找到目标: #{target.name}"
      
      # 遍历所有构建阶段
      target.build_phases.each do |phase|
        if phase.is_a?(Xcodeproj::Project::Object::PBXHeadersBuildPhase) ||
           phase.is_a?(Xcodeproj::Project::Object::PBXCopyFilesBuildPhase)
          
          # 查找重复的RCTDefines.h文件引用
          defines_files = phase.files.select do |file|
            file_path = file.file_ref.path.to_s
            file_path.end_with?('/RCTDefines.h') && !file_path.include?('/Base/')
          end
          
          if defines_files.count > 0
            puts "找到#{defines_files.count}个需要移除的RCTDefines.h引用"
            defines_files.each do |file|
              puts "移除文件引用: #{file.file_ref.path}"
              phase.remove_build_file(file)
            end
          end
        end
      end
    end
  end
end
`;

fs.writeFileSync(fixPodfilePath, fixPodfileScript);
console.log(`✅ 已创建修复脚本: ${fixPodfilePath}`);

// 修改主Podfile以添加调用
const podfilePath = path.join(process.cwd(), 'ios', 'Podfile');
if (fs.existsSync(podfilePath)) {
  console.log(`修改Podfile添加修复脚本调用: ${podfilePath}`);
  let podfileContent = fs.readFileSync(podfilePath, 'utf8');
  
  // 备份原始文件
  fs.writeFileSync(`${podfilePath}.bak`, podfileContent);
  
  // 检查是否已经包含了修复脚本的引用
  if (!podfileContent.includes('fix-react-podfile.rb')) {
    // 在Podfile顶部添加引用
    podfileContent = `require_relative 'fix-react-podfile.rb'\n\n${podfileContent}`;
    
    // 查找post_install位置并添加调用
    if (podfileContent.includes('post_install do |installer|')) {
      podfileContent = podfileContent.replace(
        /post_install do \|installer\|/,
        'post_install do |installer|\n  # 修复React-Core重复头文件问题\n  fix_react_core_headers(installer)'
      );
    } else {
      // 如果没有post_install，添加一个
      podfileContent += `
# 添加修复React-Core重复头文件问题
post_install do |installer|
  fix_react_core_headers(installer)
end
`;
    }
    
    fs.writeFileSync(podfilePath, podfileContent);
    console.log('✅ 已修改Podfile添加修复脚本调用');
  } else {
    console.log('Podfile已包含修复脚本引用，无需修改');
  }
} else {
  console.log(`错误: 未找到Podfile: ${podfilePath}`);
}

// 删除Pods和缓存
try {
  console.log('清除Pods和缓存...');
  
  const iosPath = path.join(process.cwd(), 'ios');
  const podsPath = path.join(iosPath, 'Pods');
  
  if (fs.existsSync(podsPath)) {
    try {
      child_process.execSync('rm -rf Pods', { cwd: iosPath });
    } catch (error) {
      console.log(`警告: 无法删除Pods目录: ${error.message}`);
    }
  }
  
  const podfileLockPath = path.join(iosPath, 'Podfile.lock');
  if (fs.existsSync(podfileLockPath)) {
    fs.unlinkSync(podfileLockPath);
  }
  
  console.log('✅ 清除完成');
} catch (error) {
  console.log(`警告: 清除过程中发生错误: ${error.message}`);
}

console.log('\n修复完成！请重新运行pod install来应用更改。'); 