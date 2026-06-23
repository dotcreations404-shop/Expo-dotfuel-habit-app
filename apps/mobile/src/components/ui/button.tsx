import React from 'react';
import { Pressable, PressableProps, StyleSheet, ViewStyle, StyleProp, TextStyle, ActivityIndicator } from 'react-native';
import { Text } from './text';
import { DotFuelColors } from '@/constants/colors';

export interface ButtonProps extends PressableProps {
  /** The text to display inside the button */
  title?: string;
  /** Primary creates the filled lime button. Ghost creates the transparent border button. */
  variant?: 'primary' | 'ghost';
  /** Optional custom styling for the container */
  style?: StyleProp<ViewStyle>;
  /** Optional custom styling for the text */
  textStyle?: StyleProp<TextStyle>;
  /** Disable the button interaction and lower opacity */
  disabled?: boolean;
  /** Show an ActivityIndicator and disable the button */
  loading?: boolean;
}

/**
 * Universal Button component implementing DotFuel design system tokens.
 * Matches `.btn-primary` and `.btn-ghost` from the reference HTML.
 */
export const Button = React.forwardRef<any, ButtonProps>(
  ({ title, variant = 'primary', style, textStyle, disabled, loading, children, ...props }, ref) => {
    const showDisabled = disabled || loading;
    
    return (
      <Pressable
        ref={ref}
        disabled={showDisabled}
        style={({ pressed }) => [
          styles.base,
          variant === 'primary' ? styles.primary : styles.ghost,
          showDisabled && styles.disabled,
          pressed && !showDisabled && styles.pressed,
          style,
        ]}
        {...props}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? DotFuelColors.black : DotFuelColors.lime}
          />
        ) : title ? (
          <Text
            style={[
              variant === 'primary' ? styles.primaryText : styles.ghostText,
              textStyle,
            ]}
          >
            {title}
          </Text>
        ) : (
          children
        )}
      </Pressable>
    );
  }
);

Button.displayName = 'Button';

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderRadius: 14,
  },
  primary: {
    backgroundColor: DotFuelColors.lime,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.35,
  },
  primaryText: {
    color: DotFuelColors.black,
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  ghostText: {
    color: DotFuelColors.text,
    fontWeight: '700',
    fontSize: 14,
  },
});
