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

  // Target only the two known print lines to keep the change minimal and safe
  let modified = original.replace(
    /(print\("Failed to start writing\. Error:",\s*writer\.error\?\.localizedDescription\)\s*)/g,
    'print("Failed to start writing. Error:", writer.error?.localizedDescription ?? "unknown")'
  );

  modified = modified.replace(
    /(print\("Failed to start reading\. Error:",\s*reader\.error\?\.localizedDescription\)\s*)/g,
    'print("Failed to start reading. Error:", reader.error?.localizedDescription ?? "unknown")'
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


