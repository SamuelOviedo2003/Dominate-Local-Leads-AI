// Debug webpack configuration for deployment troubleshooting
// This file helps identify module resolution issues

module.exports = {
  resolve: {
    // Add debugging for module resolution
    plugins: [
      {
        apply(resolver) {
          resolver.hooks.beforeResolve.tap('DebugPlugin', (request) => {
            if (process.env.WEBPACK_DEBUG === 'true') {
              console.log('Resolving:', request.request, 'from:', request.context)
            }
          })
          
          resolver.hooks.afterResolve.tap('DebugPlugin', (request) => {
            if (process.env.WEBPACK_DEBUG === 'true') {
              console.log('Resolved to:', request.path)
            }
          })
          
          resolver.hooks.noResolve.tap('DebugPlugin', (request) => {
            console.error('❌ Failed to resolve:', request.request, 'from:', request.context)
          })
        }
      }
    ]
  }
}