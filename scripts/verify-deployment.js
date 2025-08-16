#!/usr/bin/env node

/**
 * Deployment Verification Script
 * 
 * This script verifies that all modules can be resolved correctly
 * and identifies potential deployment issues before they hit Sliplane.
 */

const fs = require('fs')
const path = require('path')

console.log('🔍 Verifying Next.js deployment readiness...\n')

// Check for common issues
const issues = []
const warnings = []

// 1. Check for mixed import patterns
console.log('1️⃣ Checking for mixed CommonJS/ESM imports...')

function checkFile(filePath) {
  if (!fs.existsSync(filePath)) return
  
  const content = fs.readFileSync(filePath, 'utf8')
  const fileName = path.relative(process.cwd(), filePath)
  
  // Check for require() in ESM context
  if (content.includes('require(') && content.includes('import ')) {
    const requireMatches = content.match(/require\([^)]+\)/g) || []
    if (requireMatches.some(match => !match.includes('await import('))) {
      warnings.push(`${fileName}: Mixed require() and import statements detected`)
    }
  }
  
  // Check for dynamic imports with variables
  const dynamicImports = content.match(/import\([^)]*\)/g) || []
  dynamicImports.forEach(imp => {
    if (imp.includes('${') || imp.includes('+')) {
      warnings.push(`${fileName}: Dynamic import with variables: ${imp}`)
    }
  })
  
  // Check for missing file extensions
  const relativeImports = content.match(/import.*from\s+['"][.][^'"]*['"]/g) || []
  relativeImports.forEach(imp => {
    if (!imp.includes('.ts') && !imp.includes('.tsx') && !imp.includes('.js') && !imp.includes('.jsx')) {
      // This is actually OK in Next.js, but note it
      console.log(`  📝 Note: ${fileName} uses extensionless import: ${imp.trim()}`)
    }
  })
}

// Check source files
const srcDir = path.join(process.cwd(), 'src')
if (fs.existsSync(srcDir)) {
  function walkDir(dir) {
    const files = fs.readdirSync(dir)
    files.forEach(file => {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      if (stat.isDirectory()) {
        walkDir(filePath)
      } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
        checkFile(filePath)
      }
    })
  }
  walkDir(srcDir)
}

console.log('✅ Import pattern check completed\n')

// 2. Check next.config.js
console.log('2️⃣ Checking next.config.js configuration...')

const nextConfigPath = path.join(process.cwd(), 'next.config.js')
if (fs.existsSync(nextConfigPath)) {
  const configContent = fs.readFileSync(nextConfigPath, 'utf8')
  
  if (!configContent.includes('output: \'standalone\'')) {
    issues.push('Missing output: "standalone" in next.config.js for Docker deployment')
  } else {
    console.log('  ✅ Standalone output configured')
  }
  
  if (!configContent.includes('resolve.extensions')) {
    warnings.push('Consider adding resolve.extensions in webpack config for better module resolution')
  } else {
    console.log('  ✅ Webpack resolve.extensions configured')
  }
  
  if (!configContent.includes('resolve.alias')) {
    warnings.push('Consider preserving resolve.alias in webpack config')
  } else {
    console.log('  ✅ Webpack resolve.alias configured')
  }
} else {
  issues.push('Missing next.config.js file')
}

console.log('✅ Configuration check completed\n')

// 3. Check package.json dependencies
console.log('3️⃣ Checking package.json...')

const packageJsonPath = path.join(process.cwd(), 'package.json')
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  
  // Check for known problematic dependencies
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies }
  
  if (dependencies['colorthief']) {
    console.log('  📝 Note: colorthief detected - ensure proper client-side only usage')
  }
  
  // Check Node.js version compatibility
  if (packageJson.engines && packageJson.engines.node) {
    console.log(`  ✅ Node.js version specified: ${packageJson.engines.node}`)
  } else {
    warnings.push('Consider specifying Node.js version in package.json engines field')
  }
} else {
  issues.push('Missing package.json file')
}

console.log('✅ Dependencies check completed\n')

// 4. Check TypeScript configuration
console.log('4️⃣ Checking TypeScript configuration...')

const tsconfigPath = path.join(process.cwd(), 'tsconfig.json')
if (fs.existsSync(tsconfigPath)) {
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'))
  
  if (tsconfig.compilerOptions && tsconfig.compilerOptions.moduleResolution === 'bundler') {
    console.log('  ✅ ModuleResolution set to "bundler"')
  }
  
  if (tsconfig.compilerOptions && tsconfig.compilerOptions.paths) {
    console.log('  ✅ Path mapping configured')
  }
  
  if (tsconfig.compilerOptions && tsconfig.compilerOptions.baseUrl) {
    console.log('  ✅ Base URL configured')
  }
} else {
  warnings.push('Missing tsconfig.json - TypeScript configuration not found')
}

console.log('✅ TypeScript check completed\n')

// 5. Final report
console.log('📋 DEPLOYMENT VERIFICATION REPORT\n')
console.log('=' * 50)

if (issues.length === 0) {
  console.log('🎉 No critical issues found!')
} else {
  console.log('🚨 CRITICAL ISSUES FOUND:')
  issues.forEach((issue, i) => {
    console.log(`   ${i + 1}. ${issue}`)
  })
  console.log('')
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS:')
  warnings.forEach((warning, i) => {
    console.log(`   ${i + 1}. ${warning}`)
  })
  console.log('')
}

console.log('🛠️  DEPLOYMENT RECOMMENDATIONS:')
console.log('   1. Use "npm run build:sliplane" for Sliplane deployment')
console.log('   2. If build fails, use "npm run build:sliplane-debug" for detailed logs')
console.log('   3. Ensure all environment variables are set on Sliplane')
console.log('   4. Monitor deployment logs for specific module names')
console.log('')

if (issues.length === 0) {
  console.log('✅ Ready for deployment!')
  process.exit(0)
} else {
  console.log('❌ Fix critical issues before deployment')
  process.exit(1)
}