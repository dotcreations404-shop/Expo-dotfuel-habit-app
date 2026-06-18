/**
 * DotBoy — AI personal trainer chat screen.
 * Streams responses from the API via SSE.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { View, ScrollView, TextInput, Pressable, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { DotFuelColors, Spacing, Radius } from '@/constants/colors';
import { getApiUrl } from '@/lib/api-helper';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export default function DotBoyScreen() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    if (process.env.EXPO_OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: ChatMessage = { role: 'user', text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setStreaming(true);

    try {
      const response = await fetch(getApiUrl('/api/dotboy'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, text: m.text })),
          userContext: {
            name: profile?.name,
            goal: profile?.fuel_mode,
            calorieTarget: profile?.calorie_target,
          },
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantText = '';

      setMessages(prev => [...prev, { role: 'assistant', text: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Parse SSE events
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                assistantText += parsed.delta.text;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', text: assistantText };
                  return updated;
                });
              } else if (parsed.type === 'error') {
                assistantText = parsed.error || 'Something went wrong.';
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', text: assistantText };
                  return updated;
                });
              }
            } catch { /* skip non-JSON lines */ }
          }
        }
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: `Oops! ${err.message || 'Something went wrong.'}`,
      }]);
    } finally {
      setStreaming(false);
    }
  }, [input, messages, streaming, profile]);

  // Auto-scroll on new messages
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DotFuelColors.black }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        {/* Header — matches webapp dotboy chat header */}
        <View style={{
          paddingTop: 12, paddingBottom: 12, paddingHorizontal: Spacing['2xl'],
          flexDirection: 'row', alignItems: 'center', gap: 12,
          borderBottomWidth: 1, borderBottomColor: DotFuelColors.cardBorder,
        }}>
        <View style={{
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: DotFuelColors.blueLight,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 22 }}>🤖</Text>
        </View>
        <View style={{ flex: 1 }}>
          {/* .ch-name style: 15px 800 uppercase 0.5px letter-spacing */}
          <Text style={{
            fontFamily: 'Inter', fontSize: 15, fontWeight: '800',
            color: DotFuelColors.white, textTransform: 'uppercase', letterSpacing: 0.5,
          }}>
            Dot Boy
          </Text>
          <Text style={{ fontSize: 11, color: DotFuelColors.muted, fontWeight: '500' }}>
            AI Personal Trainer
          </Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: Spacing.lg, gap: 12, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 && (
          <Animated.View entering={FadeIn.duration(400)} style={{
            alignItems: 'center', paddingTop: 60,
          }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>💪</Text>
            <Text style={{
              fontFamily: 'Inter', fontSize: 16, fontWeight: '800',
              color: DotFuelColors.white, textAlign: 'center',
            }}>
              Hey{profile?.name ? ` ${profile.name}` : ''}!
            </Text>
            <Text style={{
              fontSize: 13, color: DotFuelColors.muted, fontWeight: '500',
              textAlign: 'center', marginTop: 6, maxWidth: 280, lineHeight: 20,
            }}>
              Ask me about nutrition, workouts, macros, or anything fitness-related. I'm here to help! 🔥
            </Text>
          </Animated.View>
        )}

        {messages.map((msg, i) => (
          <Animated.View
            key={i}
            entering={FadeInDown.duration(200)}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
            }}
          >
            <View style={{
              backgroundColor: msg.role === 'user' ? DotFuelColors.lime : DotFuelColors.card,
              borderRadius: 16,
              borderBottomRightRadius: msg.role === 'user' ? 4 : 16,
              borderBottomLeftRadius: msg.role === 'assistant' ? 4 : 16,
              paddingVertical: 10, paddingHorizontal: 14,
            }}>
              <Text selectable style={{
                fontSize: 14, fontWeight: '500', lineHeight: 21,
                color: msg.role === 'user' ? DotFuelColors.black : DotFuelColors.text,
              }}>
                {msg.text || (streaming && i === messages.length - 1 ? '…' : '')}
              </Text>
            </View>
          </Animated.View>
        ))}

        {streaming && (
          <View style={{ alignSelf: 'flex-start', paddingLeft: 4 }}>
            <ActivityIndicator size="small" color={DotFuelColors.lime} />
          </View>
        )}
      </ScrollView>

      {/* Input bar */}
      <View style={{
        flexDirection: 'row', alignItems: 'flex-end', gap: 8,
        paddingHorizontal: Spacing.lg, paddingVertical: 10,
        paddingBottom: 20,
        borderTopWidth: 1, borderTopColor: DotFuelColors.cardBorder,
        backgroundColor: DotFuelColors.black,
      }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          onSubmitEditing={sendMessage}
          placeholder="Ask Dot Boy..."
          placeholderTextColor={DotFuelColors.muted}
          multiline
          maxLength={1000}
          style={{
            flex: 1, backgroundColor: DotFuelColors.card,
            borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14,
            color: DotFuelColors.white, fontSize: 14, maxHeight: 100,
            borderWidth: 1, borderColor: DotFuelColors.cardBorder,
          }}
        />
        <Pressable
          onPress={sendMessage}
          disabled={!input.trim() || streaming}
          style={({ pressed }) => ({
            width: 42, height: 42, borderRadius: 21,
            backgroundColor: input.trim() && !streaming ? DotFuelColors.lime : DotFuelColors.surface,
            alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{
            fontSize: 18,
            color: input.trim() && !streaming ? DotFuelColors.black : DotFuelColors.muted,
          }}>
            ↑
          </Text>
        </Pressable>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
