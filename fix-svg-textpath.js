const fs = require('fs');
const path = require('path');

console.log('修复React Native SVG TextPath类型不匹配问题...');

// 获取项目根目录
const projectRoot = process.cwd();
const textPathFile = path.join(projectRoot, 'node_modules/react-native-svg/apple/Text/RNSVGTextPath.mm');
const textPathHeaderFile = path.join(projectRoot, 'node_modules/react-native-svg/apple/Text/RNSVGTextPath.h');

// 检查文件是否存在
if (fs.existsSync(textPathFile)) {
    // 备份原始文件
    fs.copyFileSync(textPathFile, `${textPathFile}.bak`);
    
    console.log(`正在修复: ${textPathFile}`);
    
    // 创建正确类型匹配的实现
    const correctImplementation = `/**
 * Copyright (c) 2015-present, Horcrux.
 * All rights reserved.
 *
 * This source code is licensed under the MIT-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RNSVGTextPath.h"
#import <React/RCTLog.h>

@implementation RNSVGTextPath

- (void)setHref:(NSString *)href
{
    if ([href isEqualToString:_href]) {
        return;
    }
    [self invalidate];
    _href = href;
}

- (void)setStartOffset:(RNSVGLength *)startOffset
{
    if ([startOffset isEqualTo:_startOffset]) {
        return;
    }
    [self invalidate];
    _startOffset = startOffset;
}

- (void)setMethod:(NSString *)method
{
    if ([method isEqualToString:_method]) {
        return;
    }
    [self invalidate];
    _method = method;
}

- (void)setMidLine:(NSString *)midLine
{
    if ([midLine isEqualToString:_midLine]) {
        return;
    }
    [self invalidate];
    _midLine = midLine;
}

- (void)setSpacing:(NSString *)spacing
{
    if ([spacing isEqualToString:_spacing]) {
        return;
    }
    [self invalidate];
    _spacing = spacing;
}

- (void)setSide:(NSString *)side
{
    if ([side isEqualToString:_side]) {
        return;
    }
    [self invalidate];
    _side = side;
}

@end
`;

    // 写入修复的实现
    fs.writeFileSync(textPathFile, correctImplementation, 'utf8');
    console.log('✅ 已修复 RNSVGTextPath.mm 类型不匹配问题');

    // 检查头文件，确保属性定义正确
    if (fs.existsSync(textPathHeaderFile)) {
        const headerContent = fs.readFileSync(textPathHeaderFile, 'utf8');
        
        // 检查是否有类型不匹配的枚举定义
        if (!headerContent.includes('NSString *method') || 
            !headerContent.includes('NSString *midLine') || 
            !headerContent.includes('NSString *spacing') || 
            !headerContent.includes('NSString *side')) {
            
            console.log('需要修复头文件中的属性定义...');
            
            // 备份头文件
            fs.copyFileSync(textPathHeaderFile, `${textPathHeaderFile}.bak`);
            
            // 修复头文件内容 - 确保所有属性都是NSString类型
            let fixedHeaderContent = headerContent;
            
            // 替换可能的枚举类型定义为NSString
            fixedHeaderContent = fixedHeaderContent.replace(
                /@property\s*\(.*\)\s*enum\s+RNSVGTextPathMethod\s+method;/g, 
                '@property (nonatomic, strong) NSString *method;'
            );
            
            fixedHeaderContent = fixedHeaderContent.replace(
                /@property\s*\(.*\)\s*enum\s+RNSVGTextPathMidLine\s+midLine;/g, 
                '@property (nonatomic, strong) NSString *midLine;'
            );
            
            fixedHeaderContent = fixedHeaderContent.replace(
                /@property\s*\(.*\)\s*enum\s+RNSVGTextPathSpacing\s+spacing;/g, 
                '@property (nonatomic, strong) NSString *spacing;'
            );
            
            fixedHeaderContent = fixedHeaderContent.replace(
                /@property\s*\(.*\)\s*enum\s+RNSVGTextPathSide\s+side;/g, 
                '@property (nonatomic, strong) NSString *side;'
            );
            
            // 写入修复的头文件
            fs.writeFileSync(textPathHeaderFile, fixedHeaderContent, 'utf8');
            console.log('✅ 已修复 RNSVGTextPath.h 属性定义');
        } else {
            console.log('头文件属性定义正确，无需修复');
        }
    } else {
        console.log(`⚠️ 警告: 找不到头文件 ${textPathHeaderFile}`);
    }
} else {
    console.log(`⚠️ 警告: 找不到文件 ${textPathFile}`);
}

console.log('修复完成!'); 