import React from 'react';
import { Text as RNText, TextProps, StyleSheet, Platform } from 'react-native';

export const Text = React.forwardRef<RNText, TextProps>(({ style, ...props }, ref) => {
  const resolveStyle = (s: any): any => {
    if (!s) return s;
    if (Array.isArray(s)) {
      return s.map(resolveStyle);
    }
    
    const flattened = StyleSheet.flatten(s);
    if (!flattened) return s;

    const { fontFamily, fontWeight, ...rest } = flattened;

    const weightStr = String(fontWeight || '400');
    let resolvedFont = 'Inter_400Regular';

    if (weightStr === '300') {
      resolvedFont = 'Inter_300Light';
    } else if (weightStr === '500') {
      resolvedFont = 'Inter_500Medium';
    } else if (weightStr === '600') {
      resolvedFont = 'Inter_600SemiBold';
    } else if (weightStr === '700' || weightStr === 'bold') {
      resolvedFont = 'Inter_700Bold';
    } else if (weightStr === '800') {
      resolvedFont = 'Inter_800ExtraBold';
    } else if (weightStr === '900') {
      resolvedFont = 'Inter_900Black';
    }

    return {
      ...rest,
      fontFamily: resolvedFont,
      fontWeight: undefined,
    };
  };

  return <RNText ref={ref} style={resolveStyle(style)} {...props} />;
});

Text.displayName = 'Text';
