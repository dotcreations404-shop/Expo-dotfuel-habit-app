import React from 'react';
import { TextInput as RNTextInput, TextInputProps, StyleSheet, View, Text as RNText } from 'react-native';
import { DotFuelColors } from '@/constants/colors';

export interface InputProps extends TextInputProps {
  /** Optional label displayed above the input */
  label?: string;
  /** Optional unit displayed inside the input on the right (e.g. "kg", "cm") */
  unit?: string;
  /** Indicates if there is an error */
  error?: boolean;
}

/**
 * Universal Input component implementing DotFuel design system tokens.
 * Matches `.text-input`, `.input-label`, and `.input-unit` from the reference HTML.
 */
export const Input = React.forwardRef<RNTextInput, InputProps>(
  ({ label, unit, error, style, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    return (
      <View style={styles.container}>
        {label && <RNText style={styles.label}>{label}</RNText>}
        
        <View style={styles.inputContainer}>
          <RNTextInput
            ref={ref}
            style={[
              styles.input,
              unit ? styles.inputWithUnit : null,
              isFocused ? styles.inputFocused : null,
              error ? styles.inputError : null,
              style,
            ]}
            placeholderTextColor={DotFuelColors.muted}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />
          {unit && <RNText style={styles.unit}>{unit}</RNText>}
        </View>
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: DotFuelColors.muted,
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
    width: '100%',
  },
  input: {
    width: '100%',
    backgroundColor: DotFuelColors.card,
    borderColor: DotFuelColors.surfaceBorder,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 18,
    color: DotFuelColors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  inputFocused: {
    borderColor: DotFuelColors.lime,
  },
  inputError: {
    borderColor: DotFuelColors.red,
  },
  inputWithUnit: {
    paddingRight: 52,
  },
  unit: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -8 }], // Rough estimate for vertical center
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: DotFuelColors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
