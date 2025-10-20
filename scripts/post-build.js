#!/usr/bin/env node

/**
 * Post-build script to ensure public assets are properly copied to standalone output
 * Required for Next.js standalone builds in production deployments
 */

const fs = require('fs');
const path = require('path');

function copyRecursively(source, target) {
  // Create target directory if it doesn't exist
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  // Get all items in source directory
  const items = fs.readdirSync(source);

  for (const item of items) {
    const sourcePath = path.join(source, item);
    const targetPath = path.join(target, item);

    // Check if item is directory or file
    if (fs.lstatSync(sourcePath).isDirectory()) {
      copyRecursively(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`✅ Copied: ${sourcePath} -> ${targetPath}`);
    }
  }
}

function sleep(ms) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    // Busy wait - not ideal but works everywhere
  }
}

function waitForStandaloneBuild(standalonePath, maxRetries = 10, delayMs = 500) {
  for (let i = 0; i < maxRetries; i++) {
    if (fs.existsSync(standalonePath)) {
      console.log('✅ Standalone build directory found');
      return true;
    }
    console.log(`⏳ Waiting for standalone build... (attempt ${i + 1}/${maxRetries})`);
    sleep(delayMs);
  }
  return false;
}

function main() {
  console.log('🚀 Starting post-build asset copy for standalone deployment...');

  const publicSource = path.join(__dirname, '..', 'public');
  const standaloneTarget = path.join(__dirname, '..', '.next', 'standalone', 'public');

  // Verify source exists
  if (!fs.existsSync(publicSource)) {
    console.error('❌ Error: public directory not found at', publicSource);
    process.exit(1);
  }

  // Verify standalone build exists (with retries)
  const standalonePath = path.join(__dirname, '..', '.next', 'standalone');
  if (!waitForStandaloneBuild(standalonePath)) {
    console.error('❌ Error: standalone build not found after waiting. Run `npm run build` first.');
    process.exit(1);
  }

  try {
    console.log(`📁 Copying public assets from ${publicSource} to ${standaloneTarget}...`);
    copyRecursively(publicSource, standaloneTarget);
    
    // Verify logo file was copied
    const logoTarget = path.join(standaloneTarget, 'images', 'DominateLocalLeadsLogo.png');
    if (fs.existsSync(logoTarget)) {
      console.log('✅ Logo file verified in standalone build');
    } else {
      console.warn('⚠️  Warning: Logo file not found in standalone build');
    }

    console.log('🎉 Post-build asset copy completed successfully!');
  } catch (error) {
    console.error('❌ Error during asset copy:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { copyRecursively, main };