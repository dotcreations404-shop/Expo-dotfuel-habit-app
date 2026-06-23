import React, { useState, useEffect } from 'react';
import { View, Pressable, Modal, Platform, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { DotFuelColors, Radius, Spacing } from '@/constants/colors';
import * as Haptics from 'expo-haptics';

const PWA_DISMISS_KEY = 'dotfuel_pwa_dismissed_at';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function getMobileDetect() {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') {
    return { isMobile: false, isIos: false, isAndroid: false, isSafari: false, isChrome: false, isInApp: false };
  }
  
  const ua = navigator.userAgent || '';
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isMobile = isIos || isAndroid;
  
  // Detect standard in-app browser user agents
  const isInApp = /FBAN|FBAV|Instagram|Twitter|TwitterAndroid|Line|MicroMessenger|WhatsApp|FB_IAB|FB4A|FBIE|Messenger|Snapchat/i.test(ua);
  
  // iOS Safari (crios is chrome on iOS, fxios is firefox on iOS)
  const isSafari = isIos && /Safari/i.test(ua) && !/CriOS/i.test(ua) && !/FxiOS/i.test(ua) && !isInApp;
  
  // Android Chrome
  const isChrome = isAndroid && /Chrome/i.test(ua) && !/wv/i.test(ua) && !isInApp;
  
  return { isMobile, isIos, isAndroid, isSafari, isChrome, isInApp };
}

const ShareIcon = () => (
  <View style={{
    width: 20, height: 20, backgroundColor: '#1E49CF', borderRadius: 5,
    alignItems: 'center', justifyContent: 'center',
  }}>
    <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '900', marginTop: -2 }}>↑</Text>
  </View>
);

const StepBadge = ({ num }: { num: number }) => (
  <View style={{
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: DotFuelColors.lime,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 16,
  }}>
    <Text style={{ color: DotFuelColors.lime, fontFamily: 'Inter', fontSize: 13, fontWeight: '900' }}>
      {num}
    </Text>
  </View>
);

const StepCard = ({ num, title, desc, icon }: { num: number, title: string, desc: string, icon?: React.ReactNode }) => (
  <View style={{
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: DotFuelColors.surface, borderRadius: Radius.lg,
    padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)',
  }}>
    <StepBadge num={num} />
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '800', color: DotFuelColors.white }}>
          {title}
        </Text>
        {icon}
      </View>
      <Text style={{ fontSize: 11, color: DotFuelColors.muted, lineHeight: 16 }}>
        {desc}
      </Text>
    </View>
  </View>
);

export default function PwaInstallModal() {
  const [visible, setVisible] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Check standalone mode (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) return;

    const detect = getMobileDetect();
    if (!detect.isMobile) return;

    // Check dismissal cooldown (7 days)
    const dismissedAt = localStorage.getItem(PWA_DISMISS_KEY);
    if (dismissedAt) {
      const timePassed = Date.now() - parseInt(dismissedAt, 10);
      if (timePassed < SEVEN_DAYS_MS) {
        return;
      }
    }

    // Delay popup slightly for a smoother load experience (1.5 seconds)
    const timer = setTimeout(() => {
      setVisible(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    if (Platform.OS === 'ios') Haptics.selectionAsync();
    setVisible(false);
    localStorage.setItem(PWA_DISMISS_KEY, Date.now().toString());
  };

  const handleCopyLink = async () => {
    if (Platform.OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await navigator.clipboard.writeText('https://app.dotfuel.shop');
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      Alert.alert('Copy Failed', 'Please copy app.dotfuel.shop manually.');
    }
  };

  if (!visible) return null;

  const detect = getMobileDetect();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleDismiss}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'flex-end',
        alignItems: 'center',
      }}>
        {/* Bounds inside the mobile frame */}
        <View style={{
          backgroundColor: DotFuelColors.card,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderWidth: 1,
          borderColor: DotFuelColors.cardBorder,
          padding: 24,
          paddingBottom: 40,
          width: '100%',
          maxWidth: 480, // Matches max web layout bounds
        }}>
          {/* Top handle pill */}
          <View style={{
            width: 40, height: 4,
            backgroundColor: DotFuelColors.surface,
            borderRadius: 2, alignSelf: 'center', marginBottom: 16
          }} />

          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '900', color: DotFuelColors.white }}>
              📱 Use Dot Fuel as an App
            </Text>
            <Pressable onPress={handleDismiss} style={{ padding: 4 }}>
              <Text style={{ fontSize: 18, color: DotFuelColors.muted, fontWeight: 'bold' }}>✕</Text>
            </Pressable>
          </View>

          {/* Conditional Instructions based on browser agent */}
          {detect.isInApp ? (
            // CASE A: Inside an in-app browser (Instagram, WhatsApp, Facebook, Telegram)
            <View style={{ gap: 14, marginBottom: 24 }}>
              <Text style={{ fontSize: 12, color: DotFuelColors.muted, lineHeight: 18 }}>
                You are currently inside an in-app browser which does not support installing web apps. Copy the link below and open it directly in Safari (for iPhone) or Chrome (for Android) to place it on your home screen.
              </Text>
              
              <View style={{
                backgroundColor: DotFuelColors.surface,
                borderRadius: Radius.lg,
                padding: 14,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.05)',
                alignItems: 'center',
                marginVertical: 10,
              }}>
                <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 'bold', color: DotFuelColors.lime }}>
                  https://app.dotfuel.shop
                </Text>
              </View>

              <Pressable
                onPress={handleCopyLink}
                style={({ pressed }) => ({
                  backgroundColor: copyFeedback ? DotFuelColors.limeLight : DotFuelColors.lime,
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: 'center',
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '900', color: DotFuelColors.black, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {copyFeedback ? '✓ COPIED!' : 'Copy Link'}
                </Text>
              </Pressable>
            </View>
          ) : detect.isIos ? (
            // CASE B: iOS Safari
            <View style={{ gap: 10, marginBottom: 24 }}>
              <Text style={{ fontSize: 12, color: DotFuelColors.muted, marginBottom: 6, lineHeight: 18 }}>
                Add Dot Fuel to your home screen to use it like a native mobile app with full-screen view.
              </Text>

              <StepCard
                num={1}
                title="Tap the Share button"
                icon={<ShareIcon />}
                desc="Find it at the bottom centre of your Safari browser bar"
              />
              <StepCard
                num={2}
                title="Select 'Add to Home Screen'"
                desc="Scroll down in the share sheet until you see this option"
              />
              <StepCard
                num={3}
                title="Tap 'Add' in the top right"
                desc="Dot Fuel will appear on your home screen like a native app"
              />
            </View>
          ) : (
            // CASE C: Android / Chrome
            <View style={{ gap: 10, marginBottom: 24 }}>
              <Text style={{ fontSize: 12, color: DotFuelColors.muted, marginBottom: 6, lineHeight: 18 }}>
                Add Dot Fuel to your home screen to use it like a native mobile app with full-screen view.
              </Text>

              <StepCard
                num={1}
                title="Tap the Menu button (⋮)"
                desc="Find the three dots in the top-right corner of Chrome browser bar"
              />
              <StepCard
                num={2}
                title="Select 'Add to Home screen'"
                desc="Or select 'Install app' if it's visible in the Chrome menu list"
              />
              <StepCard
                num={3}
                title="Tap 'Add' or 'Install'"
                desc="Confirm to place the Dot Fuel app shortcut directly on your home screen"
              />
            </View>
          )}

          {/* Dismiss button */}
          <Pressable
            onPress={handleDismiss}
            style={({ pressed }) => ({
              backgroundColor: DotFuelColors.surface,
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: 'center',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '800', color: DotFuelColors.white }}>
              MAYBE LATER
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
