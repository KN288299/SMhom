/*
  Patch react-native-compressor Swift warnings:
  - expression implicitly coerced from 'String?' to 'Any'
  by explicitly providing a default string for optional localizedDescription.
*/

const fs = require('fs');
const path = require('path');

function applyPatch(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log('[patch-rn-compressor] File not found, skipping:', filePath);
    return;
  }

  const original = fs.readFileSync(filePath, 'utf8');

  // 仅在 print(...) 内部为可选的 localizedDescription 提供默认值，保留原有换行/缩进
  const writingRegex = /(print\("Failed to start writing\. Error:",\s*writer\.error\?\.localizedDescription)(\)\s*)/g;
  let modified = original.replace(
    writingRegex,
    '$1 ?? "unknown"$2'
  );

  const readingRegex = /(print\("Failed to start reading\. Error:",\s*reader\.error\?\.localizedDescription)(\)\s*)/g;
  modified = modified.replace(
    readingRegex,
    '$1 ?? "unknown"$2'
  );

  if (modified !== original) {
    fs.writeFileSync(filePath, modified, 'utf8');
    console.log('[patch-rn-compressor] Applied warning fix to', filePath);
  } else {
    console.log('[patch-rn-compressor] No changes needed for', filePath);
  }
}

function main() {
  const target = path.join(
    __dirname,
    '..',
    'node_modules',
    'react-native-compressor',
    'ios',
    'Audio',
    'FormatConverter',
    'FormatConverter+Compressed.swift'
  );
  applyPatch(target);
}

try {
  main();
} catch (err) {
  console.warn('[patch-rn-compressor] Failed with error:', err && err.message ? err.message : err);
  // Do not fail install if patching fails
}


