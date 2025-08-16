# Dynamic Color Adaptation System

## Overview
This system automatically extracts colors from business logos and applies them to the header styling, creating a personalized visual experience for each business in the Dominate Local Leads AI platform.

## Features
- **Automatic Color Extraction**: Uses ColorThief to extract dominant colors from business logos
- **Dynamic Header Theming**: Real-time header background adaptation based on extracted colors
- **Accessibility Compliance**: Maintains WCAG 2.1 AA contrast standards automatically
- **Performance Optimized**: Caching, lazy loading, and smooth transitions
- **Multi-tenant Support**: Works seamlessly with business switching for superadmin users
- **Fallback System**: Graceful degradation to brand colors when extraction fails

## Architecture

### Core Components

#### 1. Color Extraction Utility (`/src/lib/color-extraction.ts`)
- **Library**: ColorThief for reliable client-side color extraction
- **Functionality**: Extracts dominant color palette from images
- **Features**:
  - RGB to HEX conversion
  - Color variation generation (dark/light variants)
  - Accessibility text color calculation
  - Intelligent accent color selection
  - Memory caching for performance

#### 2. Dynamic Theme Context (`/src/contexts/DynamicThemeContext.tsx`)
- **Purpose**: Global state management for dynamic colors
- **Features**:
  - React Context for theme state
  - CSS custom properties integration
  - Loading and error state management
  - Theme persistence and caching

#### 3. Enhanced Image Component (`/src/components/ImageWithFallback.tsx`)
- **Enhancement**: Added color extraction trigger capability
- **Features**:
  - Optional color extraction on image load
  - Loading indicators for extraction process
  - CORS-enabled image loading
  - Error handling and fallback support

#### 4. Dynamic Header (`/src/components/UniversalHeader.tsx`)
- **Integration**: Uses dynamic theme context for styling
- **Features**:
  - Real-time color application
  - Smooth CSS transitions
  - Business switching integration
  - Fallback logo color extraction

## Implementation Details

### Color Extraction Process
1. **Image Loading**: CrossOrigin-enabled image element creation
2. **Color Analysis**: ColorThief extracts dominant color and palette
3. **Color Processing**: 
   - Primary color from dominant color
   - Dark/light variants from palette analysis
   - Accent color from secondary palette colors
   - Accessibility-compliant text colors
4. **Caching**: Results stored in memory cache for performance

### Theme Application
1. **CSS Custom Properties**: Dynamic colors set as CSS variables
2. **Gradient Generation**: Header background uses extracted color gradients
3. **Transition Effects**: Smooth 600ms transitions between color changes
4. **Accessibility**: Automatic text color calculation for contrast compliance

### Business Integration
- **Single Business**: Colors extracted from business logo
- **Multi-Business (Superadmin)**: Colors update when switching businesses
- **Fallback**: Main Dominate Local Leads logo colors when no business data

## Usage

### Basic Implementation
The system is automatically active once the `DynamicThemeProvider` wraps your app:

```tsx
<DynamicThemeProvider>
  <YourApp />
</DynamicThemeProvider>
```

### Manual Color Extraction
```tsx
import { useDynamicTheme } from '@/contexts/DynamicThemeContext'

const { extractColors } = useDynamicTheme()
await extractColors(logoUrl, businessId)
```

### Accessing Theme Colors
```tsx
import { useDynamicTheme, useThemeStyles } from '@/contexts/DynamicThemeContext'

const { state } = useDynamicTheme()
const themeStyles = useThemeStyles()

// Access colors
const primaryColor = state.colors.primary
const headerGradient = themeStyles.headerGradient
```

## Configuration

### Color Extraction Options
```tsx
interface ColorExtractionOptions {
  quality?: number        // Image sampling quality (lower = faster)
  colorCount?: number     // Number of colors in palette
  ignoreTransparent?: boolean // Skip transparent pixels
}
```

### Default Configuration
- **Quality**: 10 (good balance of speed and accuracy)
- **Color Count**: 10 (sufficient for palette analysis)
- **Cache**: Enabled by default
- **Transitions**: 600ms cubic-bezier easing

## Accessibility Features

### WCAG Compliance
- **Contrast Ratios**: Automatic calculation ensures 4.5:1 minimum
- **Text Colors**: Smart selection of white/black text based on background
- **Reduced Motion**: Respects `prefers-reduced-motion` user preference
- **High Contrast**: Enhanced visibility in high contrast mode

### Color Analysis
- **Luminance Calculation**: Relative luminance for accurate brightness detection
- **Contrast Checking**: Real-time contrast ratio validation
- **Fallback Colors**: Brand-compliant fallbacks when accessibility requirements aren't met

## Performance Optimizations

### Caching Strategy
- **Memory Cache**: Extracted colors cached per image URL
- **Business Cache**: Colors cached per business ID
- **Cache Management**: Automatic cleanup and manual clearing functions

### Loading Optimizations
- **Dynamic Imports**: ColorThief loaded only when needed
- **Image Preloading**: CrossOrigin image loading for extraction
- **Debounced Extraction**: Prevents duplicate extractions for same image

### Rendering Performance
- **CSS Transitions**: Hardware-accelerated transitions
- **Minimal Repaints**: CSS custom properties prevent layout thrashing
- **Conditional Rendering**: Extraction indicators only when needed

## Browser Support

### Compatibility
- **Modern Browsers**: Chrome 88+, Firefox 78+, Safari 14+, Edge 88+
- **Color Extraction**: Canvas API for image analysis
- **CSS Features**: Custom properties, transitions, gradients
- **Image Loading**: CrossOrigin attribute support

### Fallbacks
- **Extraction Failure**: Automatic fallback to brand colors
- **Old Browsers**: Graceful degradation to static styling
- **Network Issues**: Cached colors or brand defaults

## Troubleshooting

### Common Issues

#### Color Extraction Fails
**Symptoms**: Header remains with default colors
**Causes**: CORS issues, image loading failures, invalid image formats
**Solutions**: 
- Ensure images are served with proper CORS headers
- Check image URLs are accessible
- Verify image formats are supported (JPG, PNG, WebP)

#### Poor Color Quality
**Symptoms**: Extracted colors don't match logo well
**Causes**: Logo has too many colors, poor image quality
**Solutions**:
- Use higher quality logo images
- Adjust colorCount parameter
- Consider manual color override for specific logos

#### Performance Issues
**Symptoms**: Slow color extraction, UI lag
**Causes**: Large images, frequent extractions
**Solutions**:
- Use appropriately sized images (max 300px)
- Implement extraction debouncing
- Clear cache periodically

### Debug Tools

#### Console Logging
```tsx
// Enable debug mode
localStorage.setItem('dynamicTheme.debug', 'true')
```

#### Cache Inspection
```tsx
import { getCachedColors } from '@/lib/color-extraction'
console.log(getCachedColors(imageUrl))
```

#### Theme State
```tsx
const { state } = useDynamicTheme()
console.log('Current theme:', state)
```

## Future Enhancements

### Planned Features
- **Color Palette Presets**: Predefined color schemes for businesses
- **Advanced Color Harmonies**: Complementary, triadic, and split-complementary schemes
- **User Customization**: Manual color override capabilities
- **Theme Persistence**: LocalStorage/database persistence
- **Animation Presets**: Different transition styles
- **Color Blindness Support**: Enhanced accessibility for color vision deficiencies

### Performance Improvements
- **Web Workers**: Background color processing
- **Service Worker**: Offline color caching
- **Progressive Enhancement**: Gradual feature loading
- **CDN Integration**: Cached color analysis results

## API Reference

### DynamicThemeProvider
```tsx
interface DynamicThemeProviderProps {
  children: ReactNode
}
```

### useDynamicTheme Hook
```tsx
interface DynamicThemeContextType {
  state: DynamicThemeState
  extractColors: (logoUrl: string, businessId: string) => Promise<void>
  resetTheme: () => void
  clearError: () => void
}
```

### ExtractedColors Interface
```tsx
interface ExtractedColors {
  primary: string        // Main brand color
  primaryDark: string    // Dark variant for gradients
  primaryLight: string   // Light variant for highlights
  accent: string         // Complementary accent color
  textColor: string      // Accessible text color
  isLightLogo: boolean   // Whether logo is light or dark
}
```

### Color Extraction Functions
```tsx
// Main extraction function
extractColorsFromImage(imageUrl: string, options?: ColorExtractionOptions): Promise<ExtractedColors>

// Cache management
clearColorCache(): void
getCachedColors(imageUrl: string): ExtractedColors | null
preloadColors(imageUrls: string[]): Promise<Map<string, ExtractedColors>>
```

## Best Practices

### Logo Requirements
- **Format**: PNG, JPG, or WebP
- **Size**: 100-300px recommended
- **Quality**: High resolution for better color extraction
- **Background**: Transparent or solid background preferred

### Implementation Guidelines
- **Gradual Rollout**: Test with a subset of businesses first
- **Error Handling**: Always provide fallbacks
- **Performance Monitoring**: Track extraction times and success rates
- **User Feedback**: Collect feedback on color accuracy and preferences

### Design Considerations
- **Brand Consistency**: Ensure extracted colors align with brand guidelines
- **Readability**: Prioritize text readability over aesthetic appeal
- **Accessibility**: Test with various accessibility tools
- **Mobile Experience**: Verify color extraction works on mobile devices

---

## Support and Maintenance

For issues, questions, or feature requests related to the Dynamic Color Adaptation System, refer to the main project documentation or contact the development team.

**System Status**: ✅ Active and Production Ready
**Last Updated**: System implementation completed
**Version**: 1.0.0