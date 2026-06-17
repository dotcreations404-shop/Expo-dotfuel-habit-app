import { useState, useEffect, useRef } from 'react';
import { View, TextInput, Pressable, ScrollView, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown, SlideInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { DotFuelColors, Spacing, Radius } from '@/constants/colors';
import type { DotDuoProfile, DotDuoMessage, UserProfile } from '@/lib/types';

export default function DotDuoScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<DotDuoProfile | null>(null);
  const [partner, setPartner] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<DotDuoMessage[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  
  // Preferences form
  const [goal, setGoal] = useState('balance');
  const [diet, setDiet] = useState('any');
  const [vibe, setVibe] = useState('relaxed');
  const [myGender, setMyGender] = useState('any');
  const [partnerGender, setPartnerGender] = useState('any');
  const [matching, setMatching] = useState(false);
  
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (user) loadState();
  }, [user]);

  // Subscribe to messages if we have a partner
  useEffect(() => {
    if (!user || !profile?.partner_id) return;
    
    const sub = supabase
      .channel('dot_duo_chat')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'dot_duo_messages',
        filter: `receiver_id=eq.${user.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as DotDuoMessage]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        if (process.env.EXPO_OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [user, profile?.partner_id]);

  const loadState = async () => {
    setLoading(true);
    try {
      const { data: p } = await supabase.from('dot_duo_profiles')
        .select('*').eq('user_id', user!.id).single();
      
      if (p) {
        setProfile(p);
        if (p.partner_id) {
          const { data: part } = await supabase.from('users').select('*').eq('id', p.partner_id).single();
          if (part) setPartner(part);
          
          const { data: msgs } = await supabase.from('dot_duo_messages')
            .select('*')
            .or(`and(sender_id.eq.${user!.id},receiver_id.eq.${p.partner_id}),and(sender_id.eq.${p.partner_id},receiver_id.eq.${user!.id})`)
            .order('created_at', { ascending: true });
          if (msgs) setMessages(msgs);
        }
      }
    } catch (err) {
      console.log('Error loading duo state', err);
    }
    setLoading(false);
  };

  const handleMatch = async () => {
    setMatching(true);
    if (process.env.EXPO_OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // In a real app, this would be an edge function that finds the best match.
    // For now, we'll upsert the preference and just set "is_looking" to true.
    const myProfile = {
      user_id: user!.id,
      goal, diet, vibe, gender: myGender, partner_gender: partnerGender,
      is_looking: true
    };
    
    await supabase.from('dot_duo_profiles').upsert(myProfile);
    await loadState(); // reload to show looking state
    setMatching(false);
  };

  const sendMessage = async () => {
    if (!inputMsg.trim() || !profile?.partner_id) return;
    const content = inputMsg.trim();
    setInputMsg('');
    
    const msg = {
      sender_id: user!.id,
      receiver_id: profile.partner_id,
      content
    };
    
    // Optimistic UI
    const tempMsg = { ...msg, id: Date.now().toString(), created_at: new Date().toISOString() } as DotDuoMessage;
    setMessages(prev => [...prev, tempMsg]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    
    await supabase.from('dot_duo_messages').insert(msg);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: DotFuelColors.black, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={DotFuelColors.lime} />
      </View>
    );
  }

  // ── STATE 1: Preferences / Looking for match ──
  if (!profile || !profile.partner_id) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DotFuelColors.black }} edges={['top', 'left', 'right']}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing['2xl'], paddingBottom: 100 }}>
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={{
              width: 72, height: 72, borderRadius: 36, backgroundColor: DotFuelColors.surface,
              alignItems: 'center', justifyContent: 'center', marginBottom: 16
            }}>
              <Text style={{ fontSize: 32 }}>🤝</Text>
            </View>
            <Text style={{ fontFamily: 'Inter', fontSize: 28, fontWeight: '900', color: DotFuelColors.white, marginBottom: 8, letterSpacing: -0.5 }}>
              Find Your Dot Duo
            </Text>
            <Text style={{ fontSize: 13, color: DotFuelColors.muted, lineHeight: 20, marginBottom: 32 }}>
              Get matched with an accountability partner. Share your daily macro summaries and keep each other on track.
            </Text>

            {profile?.is_looking ? (
              <View style={{ backgroundColor: DotFuelColors.card, borderRadius: Radius.xl, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: DotFuelColors.lime }}>
                <ActivityIndicator color={DotFuelColors.lime} size="large" style={{ marginBottom: 16 }} />
                <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '800', color: DotFuelColors.lime, textTransform: 'uppercase' }}>
                  Finding Match...
                </Text>
                <Text style={{ fontSize: 13, color: DotFuelColors.muted, textAlign: 'center', marginTop: 8 }}>
                  We're looking for someone with similar goals. You'll be notified when a match is found.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 24 }}>
                <PrefSection title="Your Goal" value={goal} setValue={setGoal} options={[
                  { id: 'burn', label: 'Fat Loss' }, { id: 'balance', label: 'Maintain' }, { id: 'build', label: 'Muscle Gain' }
                ]} />
                <PrefSection title="Diet Type" value={diet} setValue={setDiet} options={[
                  { id: 'any', label: 'Any' }, { id: 'veg', label: 'Vegetarian' }, { id: 'high-protein', label: 'High Protein' }
                ]} />
                <PrefSection title="Chat Vibe" value={vibe} setValue={setVibe} options={[
                  { id: 'strict', label: 'Strict' }, { id: 'relaxed', label: 'Relaxed' }
                ]} />
                
                <Button
                  title={matching ? 'Matching...' : 'MATCH ME 🤝'}
                  onPress={handleMatch}
                  disabled={matching}
                  style={{ marginTop: 12 }}
                />
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── STATE 2: Chat ──
  const initial = partner?.name?.[0]?.toUpperCase() || '?';
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DotFuelColors.black }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
        <View style={{ 
          flexDirection: 'row', alignItems: 'center', padding: 16, 
          borderBottomWidth: 1, borderBottomColor: DotFuelColors.surfaceBorder,
          backgroundColor: 'rgba(10,10,10,0.8)'
        }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#ff6496', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '900', color: '#fff' }}>{partner?.name || 'Your Dot Duo'}</Text>
            <Text style={{ fontSize: 11, color: '#ff6496', fontWeight: '600' }}>Accountability Partner · Online</Text>
          </View>
          <Pressable style={{ backgroundColor: 'rgba(255,100,150,0.12)', borderWidth: 1, borderColor: 'rgba(255,100,150,0.25)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 14 }}>🔥</Text>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#ff6496' }}>Share</Text>
          </Pressable>
        </View>

        <ScrollView 
          ref={scrollRef}
          style={{ flex: 1 }} 
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          <View style={{ alignItems: 'center', marginVertical: 20 }}>
            <Text style={{ fontSize: 11, color: DotFuelColors.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>
              You matched with {partner?.name} 🎉
            </Text>
          </View>
          
          {messages.map((msg, i) => {
            const isMe = msg.sender_id === user!.id;
            return (
              <Animated.View key={msg.id} entering={SlideInUp.duration(300)} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, maxWidth: '85%' }}>
                {!isMe && (
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#ff6496', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff' }}>{initial}</Text>
                  </View>
                )}
                <View style={{ backgroundColor: isMe ? DotFuelColors.lime : DotFuelColors.surface, padding: 12, borderRadius: 18, borderBottomRightRadius: isMe ? 4 : 18, borderBottomLeftRadius: isMe ? 18 : 4 }}>
                  <Text style={{ fontSize: 14, color: isMe ? DotFuelColors.black : DotFuelColors.white, fontWeight: isMe ? '600' : '500' }}>
                    {msg.content}
                  </Text>
                </View>
              </Animated.View>
            );
          })}
        </ScrollView>

        <View style={{ padding: 12, paddingBottom: process.env.EXPO_OS === 'ios' ? 24 : 12, backgroundColor: DotFuelColors.black, borderTopWidth: 1, borderTopColor: DotFuelColors.surfaceBorder, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TextInput
            value={inputMsg}
            onChangeText={setInputMsg}
            placeholder="Message your Duo..."
            placeholderTextColor={DotFuelColors.muted}
            style={{ flex: 1, backgroundColor: DotFuelColors.card, borderWidth: 1, borderColor: DotFuelColors.cardBorder, borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, color: DotFuelColors.white, fontSize: 15, maxHeight: 100 }}
            multiline
          />
          <Pressable onPress={sendMessage} disabled={!inputMsg.trim()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: inputMsg.trim() ? '#ff6496' : DotFuelColors.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: inputMsg.trim() ? DotFuelColors.white : DotFuelColors.muted, fontSize: 16, fontWeight: '900' }}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


// Helper component for preference buttons
function PrefSection({ title, value, setValue, options }: { title: string, value: string, setValue: (v: string) => void, options: { id: string, label: string }[] }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 11, color: DotFuelColors.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map(opt => {
          const isSelected = value === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => { setValue(opt.id); if (process.env.EXPO_OS === 'ios') Haptics.selectionAsync(); }}
              style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, backgroundColor: isSelected ? 'rgba(255,140,0,0.1)' : DotFuelColors.surface, borderWidth: 1, borderColor: isSelected ? 'rgba(255,140,0,0.6)' : 'rgba(255,255,255,0.1)' }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? '#ff8c00' : DotFuelColors.muted }}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
