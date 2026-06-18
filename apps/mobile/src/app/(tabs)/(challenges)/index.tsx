import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, TextInput, Pressable, KeyboardAvoidingView, ActivityIndicator, Image, Modal, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useRouter, Stack } from 'expo-router';
import Animated, { 
  FadeInDown, 
  FadeIn, 
  SlideInUp, 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming 
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/auth-context';
import { DotFuelColors, Spacing, Radius } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import type { Vol3Participant, Vol3DailyProgress, Vol3ChatMessage, UserProfile } from '@/lib/types';

const PulsingTodayDot = ({ completed, onPress }: { completed: boolean; onPress: () => void }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.7);

  useEffect(() => {
    scale.value = withRepeat(withTiming(1.5, { duration: 1400 }), -1, true);
    opacity.value = withRepeat(withTiming(0.1, { duration: 1400 }), -1, true);
  }, []);

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const color = completed ? DotFuelColors.lime : DotFuelColors.limeLight;
  const border = DotFuelColors.lime;

  return (
    <Pressable onPress={onPress} style={{ width: 22, height: 22, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View style={[{
        position: 'absolute',
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: DotFuelColors.lime,
      }, animatedRingStyle]} />
      <View style={{
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: color,
        borderWidth: 1,
        borderColor: border,
      }} />
    </Pressable>
  );
};

export default function ChallengesScreen() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();

  const [checkingParticipant, setCheckingParticipant] = useState(true);
  const [participant, setParticipant] = useState<Vol3Participant | null>(null);

  // Dashboard states
  const [daysLeft, setDaysLeft] = useState(76);
  const [progressData, setProgressData] = useState<Record<string, Vol3DailyProgress>>({});
  const [leaderboard, setLeaderboard] = useState<(UserProfile & { streak_days: number })[]>([]);
  const [messages, setMessages] = useState<Vol3ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatScrollRef = useRef<ScrollView>(null);

  // Inspector states
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [inspectorVisible, setInspectorVisible] = useState(false);

  const [tasks, setTasks] = useState({
    cleanMeals: false,
    workout: false,
    read: false,
    water: false,
    custom: false,
  });
  const [customTaskName, setCustomTaskName] = useState('');

  const completedCount = Object.values(tasks).filter(Boolean).length;
  const progressPercent = (completedCount / 5) * 100;

  useEffect(() => {
    // Calculate days to Aug 30, 2026
    const end = new Date('2026-08-30T00:00:00Z').getTime();
    const now = new Date().getTime();
    const diff = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
    setDaysLeft(diff);
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        loadParticipant();
      } else {
        setCheckingParticipant(false);
      }
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (participant && participant.status === 'active') {
      loadDashboardData();
      setupChatSubscription();
    }
    return () => {
      supabase.removeAllChannels();
    };
  }, [participant]);

  const loadParticipant = async () => {
    setCheckingParticipant(true);
    try {
      const { data, error } = await supabase
        .from('challenge_vol3_participants')
        .select('*')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .maybeSingle();

      if (data) {
        setParticipant(data);
        if (data.custom_task_title) setCustomTaskName(data.custom_task_title);
      } else {
        setParticipant(null);
      }
    } catch (err) {
      console.log('Error loading participant in Challenges index', err);
      setParticipant(null);
    }
    setCheckingParticipant(false);
  };

  const loadDashboardData = async () => {
    if (!user || !participant) return;

    try {
      // Fetch Daily Progress
      const startDateStr = new Date(participant.joined_at).toISOString().split('T')[0];
      const endDateStr = '2026-08-30';
      const { data: progData } = await supabase
        .from('challenge_vol3_daily_progress')
        .select('*')
        .eq('user_id', user.id)
        .gte('log_date', startDateStr)
        .lte('log_date', endDateStr);

      if (progData) {
        const pMap: Record<string, Vol3DailyProgress> = {};
        progData.forEach(p => pMap[p.log_date] = p);
        setProgressData(pMap);

        // Load today's tasks
        const todayStr = new Date().toISOString().split('T')[0];
        const todayRow = pMap[todayStr];
        if (todayRow) {
          setTasks({
            cleanMeals: todayRow.clean_meals,
            workout: todayRow.workout,
            read: todayRow.read_page,
            water: todayRow.water_synced_override,
            custom: todayRow.custom_task_done,
          });
        }
      }

      // Fetch Leaderboard
      const { data: parts } = await supabase.from('challenge_vol3_participants').select('user_id').eq('status', 'active');
      if (parts && parts.length > 0) {
        const ids = parts.map(p => p.user_id);
        const { data: users } = await supabase.from('users').select('id, name, streak_days').in('id', ids);
        if (users) {
          const sorted = users
            .filter(u => u.name)
            .map(u => ({ ...u, streak_days: u.streak_days || 0 }))
            .sort((a, b) => b.streak_days - a.streak_days);
          setLeaderboard(sorted);
        }
      }

      // Fetch Chat Messages
      const { data: msgs } = await supabase
        .from('challenge_vol3_chat')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (msgs) {
        setMessages(msgs.reverse());
        setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (err) {
      console.log('Error loading dashboard data in Challenges index', err);
    }
  };

  const setupChatSubscription = () => {
    supabase
      .channel('vol3-chat-changes-index')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'challenge_vol3_chat' }, (payload) => {
        setMessages(prev => [...prev, payload.new as Vol3ChatMessage]);
        setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .subscribe();
  };

  const toggleTask = async (key: keyof typeof tasks) => {
    if (!user || !participant) return;
    if (process.env.EXPO_OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const nextVal = !tasks[key];
    setTasks(prev => ({ ...prev, [key]: nextVal }));
    
    const todayStr = new Date().toISOString().split('T')[0];
    const updatedTasks = { ...tasks, [key]: nextVal };
    const completedCount = Object.values(updatedTasks).filter(Boolean).length;
    const isCalculatedSuccess = completedCount >= 4;

    const upsertData = {
      user_id: user.id,
      log_date: todayStr,
      clean_meals: updatedTasks.cleanMeals,
      workout: updatedTasks.workout,
      read_page: updatedTasks.read,
      water_synced_override: updatedTasks.water,
      custom_task_done: updatedTasks.custom,
      is_calculated_success: isCalculatedSuccess,
      revival_applied: progressData[todayStr]?.revival_applied || false
    };

    setProgressData(prev => ({
      ...prev,
      [todayStr]: {
        ...prev[todayStr],
        ...upsertData,
        id: prev[todayStr]?.id || ''
      } as any
    }));

    try {
      const { error } = await supabase
        .from('challenge_vol3_daily_progress')
        .upsert(upsertData, { onConflict: 'user_id,log_date' });
        
      if (error) {
        console.log('Error upserting daily progress', error);
        setTasks(prev => ({ ...prev, [key]: !nextVal }));
        loadDashboardData();
      }
    } catch (err) {
      console.log('Error toggling task', err);
      loadDashboardData();
    }
  };

  const saveCustomTaskTitle = async () => {
    if (!user || !participant) return;
    try {
      await supabase
        .from('challenge_vol3_participants')
        .update({ custom_task_title: customTaskName })
        .eq('user_id', user.id);
    } catch (err) {
      console.log('Error saving custom task title', err);
    }
  };

  const sendChatMessage = async () => {
    if (!user || !chatInput.trim()) return;
    const msgText = chatInput.trim();
    setChatInput('');
    
    try {
      await supabase.from('challenge_vol3_chat').insert({
        user_id: user.id,
        message: msgText,
        profile_name: profile?.name || user.email?.split('@')[0] || 'Challenger',
        image_url: profile?.avatar_url || null
      });
    } catch (err) {
      console.log('Error sending msg', err);
    }
  };

  const handleDotPress = (dateStr: string) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedDate(dateStr);
    setInspectorVisible(true);
  };

  const renderDotMatrix = () => {
    if (!participant) return null;
    
    const startStr = new Date(participant.joined_at).toISOString().split('T')[0];
    const endStr = '2026-08-30';
    const start = new Date(startStr);
    const end = new Date(endStr);
    const todayStr = new Date().toISOString().split('T')[0];

    const timeline = [];
    let curr = new Date(start);
    while (curr <= end) {
      timeline.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }

    return (
      <View style={{ marginTop: 20 }}>
        <Text style={{ color: DotFuelColors.white, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Dot Matrix</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {timeline.map((dateStr) => {
            const isToday = dateStr === todayStr;
            const isFuture = dateStr > todayStr;
            const row = progressData[dateStr];
            
            let complianceCount = 0;
            let revivalApplied = false;
            let successOverride = false;

            if (isToday) {
              complianceCount = completedCount;
            } else if (row) {
              if (row.clean_meals) complianceCount++;
              if (row.workout) complianceCount++;
              if (row.read_page) complianceCount++;
              if (row.water_synced_override) complianceCount++;
              if (row.custom_task_done) complianceCount++;
              revivalApplied = row.revival_applied;
              successOverride = row.is_calculated_success;
            }

            const isCompleted = complianceCount >= 4 || successOverride || revivalApplied;

            if (isToday) {
              return (
                <PulsingTodayDot 
                  key={dateStr}
                  completed={isCompleted}
                  onPress={() => handleDotPress(dateStr)}
                />
              );
            }

            let color: string = 'transparent';
            let border: string = 'rgba(255,255,255,0.15)';

            if (!isFuture) {
              if (isCompleted) {
                color = DotFuelColors.lime;
                border = DotFuelColors.lime;
              } else {
                color = 'rgba(255, 59, 59, 0.15)';
                border = 'rgba(255, 59, 59, 0.4)';
              }
            }

            return (
              <Pressable
                key={dateStr}
                onPress={() => handleDotPress(dateStr)}
                style={({ pressed }) => [{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: color,
                  borderWidth: 1,
                  borderColor: border,
                  opacity: pressed ? 0.7 : 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                }]}
              >
                {isCompleted && !isFuture && (
                  <View style={{
                    position: 'absolute',
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: DotFuelColors.lime,
                    opacity: 0.15,
                  }} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  // Loading spinner during hydration pass
  if (checkingParticipant) {
    return (
      <View style={{ flex: 1, backgroundColor: DotFuelColors.black, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={DotFuelColors.lime} />
      </View>
    );
  }

  // Render dashboard directly if user is an active participant
  if (participant && participant.status === 'active') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DotFuelColors.black }} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Smooth header greeting */}
            <View style={{
              paddingTop: 16, paddingHorizontal: Spacing['2xl'],
              paddingBottom: Spacing.xl,
            }}>
              <Text style={{
                fontFamily: 'Inter', fontSize: 26, fontWeight: '900',
                color: DotFuelColors.white, letterSpacing: -0.5,
              }}>
                Welcome Back, {profile?.name || user?.email?.split('@')[0] || 'Athlete'}!
              </Text>
              <Text style={{
                fontSize: 13, color: DotFuelColors.lime, fontWeight: '600', marginTop: 4,
              }}>
                Volume 3 Active Workspace
              </Text>
            </View>

            <Animated.View entering={FadeIn.duration(400)} style={{ paddingHorizontal: Spacing['2xl'] }}>
              {/* Time Remaining & Matrix */}
              <View style={{
                backgroundColor: DotFuelColors.card, borderRadius: Radius['2xl'],
                padding: 20, borderWidth: 1, borderColor: 'rgba(194,240,0,0.1)'
              }}>
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ color: DotFuelColors.lime, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>Time Remaining</Text>
                  <Text style={{ fontFamily: 'Inter', fontSize: 36, fontWeight: '900', color: DotFuelColors.white, marginTop: 4 }}>{daysLeft} Days</Text>
                  <Text style={{ fontSize: 11, color: DotFuelColors.muted, fontWeight: '600', marginTop: 4 }}>Ends 30 Aug 2026</Text>
                </View>
                {renderDotMatrix()}
              </View>

              {/* Tasks Checklist */}
              <View style={{ marginTop: 14, backgroundColor: DotFuelColors.card, borderRadius: Radius['2xl'], padding: 20 }}>
                <Text style={{ color: DotFuelColors.lime, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>Today's Tasks</Text>
                <Text style={{ fontSize: 11, color: DotFuelColors.muted, fontWeight: '600', marginBottom: 14 }}>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</Text>
                
                <View style={{ height: 6, backgroundColor: DotFuelColors.surface, borderRadius: 3, marginBottom: 16, overflow: 'hidden' }}>
                  <Animated.View style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: DotFuelColors.lime }} />
                </View>

                {[
                  { id: 'cleanMeals', emoji: '🥗', label: 'All day clean meals' },
                  { id: 'workout', emoji: '🏋️', label: 'Daily workout / 10k steps' },
                  { id: 'read', emoji: '📖', label: 'Read a page' },
                  { id: 'water', emoji: '💧', label: '4 ltrs of water (Synced)' }
                ].map((task) => {
                  const isDone = tasks[task.id as keyof typeof tasks];
                  return (
                    <Pressable
                      key={task.id}
                      onPress={() => toggleTask(task.id as keyof typeof tasks)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
                        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)'
                      }}
                    >
                      <Text style={{ fontSize: 20, width: 36 }}>{task.emoji}</Text>
                      <Text style={{ flex: 1, fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: isDone ? DotFuelColors.muted : DotFuelColors.white, textDecorationLine: isDone ? 'line-through' : 'none' }}>
                        {task.label}
                      </Text>
                      <View style={{
                        width: 24, height: 24, borderRadius: 8, borderWidth: 2,
                        borderColor: isDone ? DotFuelColors.lime : DotFuelColors.surface,
                        backgroundColor: isDone ? DotFuelColors.lime : 'transparent',
                        alignItems: 'center', justifyContent: 'center'
                      }}>
                        {isDone && <Text style={{ color: DotFuelColors.black, fontSize: 14, fontWeight: 'bold' }}>✓</Text>}
                      </View>
                    </Pressable>
                  );
                })}
                
                {/* Custom task */}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
                  <Text style={{ fontSize: 20, width: 36 }}>✨</Text>
                  <TextInput
                    value={customTaskName}
                    onChangeText={setCustomTaskName}
                    onBlur={saveCustomTaskTitle}
                    onSubmitEditing={saveCustomTaskTitle}
                    placeholder="My custom daily habit"
                    placeholderTextColor={DotFuelColors.muted}
                    style={{
                      flex: 1, fontFamily: 'Inter', fontSize: 14, fontWeight: '600',
                      color: tasks.custom ? DotFuelColors.muted : DotFuelColors.white,
                      textDecorationLine: tasks.custom ? 'line-through' : 'none',
                    }}
                  />
                  <Pressable
                    onPress={() => toggleTask('custom')}
                    style={{
                      width: 24, height: 24, borderRadius: 8, borderWidth: 2,
                      borderColor: tasks.custom ? DotFuelColors.lime : DotFuelColors.surface,
                      backgroundColor: tasks.custom ? DotFuelColors.lime : 'transparent',
                      alignItems: 'center', justifyContent: 'center'
                    }}>
                    {tasks.custom && <Text style={{ color: DotFuelColors.black, fontSize: 14, fontWeight: 'bold' }}>✓</Text>}
                  </Pressable>
                </View>
              </View>

              {/* Revivals */}
              <View style={{ marginTop: 14, flexDirection: 'row', backgroundColor: DotFuelColors.card, borderRadius: Radius['2xl'], padding: 20, alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '900', color: DotFuelColors.white }}>Streak Revivals</Text>
                  <Text style={{ fontSize: 12, color: DotFuelColors.lime, fontWeight: '700', marginTop: 4 }}>🎟️ {participant.revivals_remaining} tokens remaining</Text>
                </View>
                <Pressable style={{ backgroundColor: 'rgba(194,240,0,0.1)', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 }}>
                  <Text style={{ color: DotFuelColors.lime, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>USE REVIVAL</Text>
                </Pressable>
              </View>

              {/* Live Leaderboard Standings */}
              <View style={{ marginTop: 14, backgroundColor: DotFuelColors.card, borderRadius: Radius['2xl'], padding: 20 }}>
                <Text style={{ color: DotFuelColors.white, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>Challenger Board 🏆</Text>
                {leaderboard.length === 0 ? (
                  <Text style={{ color: DotFuelColors.muted, fontSize: 12, textAlign: 'center', marginVertical: 20 }}>Loading standings...</Text>
                ) : (
                  <View style={{ gap: 12 }}>
                    {leaderboard.map((u, i) => {
                      const rank = i + 1;
                      const isMe = u.id === user?.id;
                      const maxStreak = Math.max(leaderboard[0]?.streak_days || 1, 1);
                      const barPct = Math.round((u.streak_days / maxStreak) * 100);

                      return (
                        <Animated.View key={u.id} entering={FadeInDown.delay(i * 50)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          <Text style={{ width: 24, fontSize: 16, textAlign: 'center' }}>
                            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                          </Text>
                          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isMe ? DotFuelColors.limeLight : DotFuelColors.surface, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: isMe ? DotFuelColors.black : DotFuelColors.white, fontWeight: '800' }}>{u.name[0].toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: isMe ? DotFuelColors.lime : DotFuelColors.white }}>
                                {u.name} {isMe && '(You)'}
                              </Text>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: DotFuelColors.muted }}>🔥 {u.streak_days}</Text>
                            </View>
                            <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                              <View style={{ width: `${barPct}%`, height: '100%', backgroundColor: u.streak_days > 0 ? '#FF8C00' : 'transparent' }} />
                            </View>
                          </View>
                        </Animated.View>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Chat feed */}
              <View style={{ marginTop: 14, backgroundColor: DotFuelColors.card, borderRadius: Radius['2xl'], overflow: 'hidden', height: 400 }}>
                <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                  <Text style={{ color: DotFuelColors.white, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>Challenger Social Feed 💬</Text>
                </View>
                <ScrollView ref={chatScrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
                  {messages.length === 0 ? (
                    <Text style={{ color: DotFuelColors.muted, fontSize: 12, textAlign: 'center', marginTop: 20 }}>Welcome to the Chat! Say hi 👋</Text>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.user_id === user?.id;
                      const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      return (
                        <Animated.View key={msg.id} entering={SlideInUp} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%', flexDirection: isMe ? 'row-reverse' : 'row', gap: 8 }}>
                          <View style={{ alignSelf: 'flex-end', marginBottom: 16 }}>
                            {msg.image_url ? (
                              <Image source={{ uri: msg.image_url }} style={{ width: 24, height: 24, borderRadius: 12 }} />
                            ) : (
                              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: DotFuelColors.surface, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 10, color: DotFuelColors.muted, fontWeight: 'bold' }}>{msg.profile_name?.charAt(0).toUpperCase() || '?'}</Text>
                              </View>
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            {!isMe && <Text style={{ fontSize: 10, color: DotFuelColors.muted, fontWeight: '700', marginBottom: 4, marginLeft: 4 }}>{msg.profile_name}</Text>}
                            <View style={{ backgroundColor: isMe ? DotFuelColors.blue : DotFuelColors.surface, padding: 12, borderRadius: 16, borderBottomRightRadius: isMe ? 4 : 16, borderBottomLeftRadius: isMe ? 16 : 4 }}>
                              <Text style={{ fontSize: 14, color: DotFuelColors.white, lineHeight: 20 }}>{msg.message}</Text>
                            </View>
                            <Text style={{ fontSize: 9, color: DotFuelColors.muted, marginTop: 4, textAlign: isMe ? 'right' : 'left', marginRight: isMe ? 4 : 0, marginLeft: isMe ? 0 : 4 }}>{time}</Text>
                          </View>
                        </Animated.View>
                      );
                    })
                  )}
                </ScrollView>
                <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <TextInput
                    value={chatInput}
                    onChangeText={setChatInput}
                    placeholder="Share your progress..."
                    placeholderTextColor={DotFuelColors.muted}
                    style={{ flex: 1, backgroundColor: DotFuelColors.surface, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: DotFuelColors.white, fontFamily: 'Inter', fontSize: 14 }}
                  />
                  <Pressable onPress={sendChatMessage} disabled={!chatInput.trim()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: chatInput.trim() ? DotFuelColors.blue : DotFuelColors.surface, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: DotFuelColors.white, fontSize: 18 }}>↑</Text>
                  </Pressable>
                </View>
              </View>

              {/* Dot Duo accountability card */}
              <Animated.View entering={FadeInDown.delay(150).duration(400)} style={{ marginTop: 14 }}>
                <Pressable
                  onPress={() => {
                    if (process.env.EXPO_OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push('/(tabs)/(challenges)/dot-duo');
                  }}
                  style={({ pressed }) => ({
                    backgroundColor: DotFuelColors.card, borderRadius: Radius['2xl'],
                    borderWidth: 1, borderColor: DotFuelColors.cardBorder,
                    padding: 22, overflow: 'hidden',
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, backgroundColor: DotFuelColors.lime, borderRadius: 2 }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingLeft: 8 }}>
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,100,150,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 28 }}>🤝</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '800', color: DotFuelColors.white, textTransform: 'uppercase', letterSpacing: 0.5 }}>Dot Duo</Text>
                      <Text style={{ fontSize: 11, color: DotFuelColors.muted, fontWeight: '600', marginTop: 2 }}>Find an accountability partner. Chat and share your daily macros.</Text>
                    </View>
                    <Text style={{ fontSize: 20, color: DotFuelColors.muted }}>›</Text>
                  </View>
                </Pressable>
              </Animated.View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* ── DAY INSPECTOR MODAL ── */}
        <Modal
          visible={inspectorVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setInspectorVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: DotFuelColors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: DotFuelColors.cardBorder }}>
              <View style={{ width: 40, height: 4, backgroundColor: DotFuelColors.surface, borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <View>
                  <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '900', color: DotFuelColors.white }}>📅 Day Details</Text>
                  <Text style={{ fontSize: 13, color: DotFuelColors.muted, marginTop: 2 }}>
                    {selectedDate ? new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                  </Text>
                </View>
                <Pressable onPress={() => setInspectorVisible(false)} style={{ padding: 4 }}>
                  <Text style={{ fontSize: 20, color: DotFuelColors.muted, fontWeight: 'bold' }}>✕</Text>
                </Pressable>
              </View>

              {selectedDate && (() => {
                const isToday = selectedDate === new Date().toISOString().split('T')[0];
                const isFuture = selectedDate > new Date().toISOString().split('T')[0];
                const row = progressData[selectedDate];
                
                let cleanMeals = false;
                let workout = false;
                let readPage = false;
                let water = false;
                let custom = false;
                let revivalApplied = false;
                let complianceCount = 0;

                if (isToday) {
                  cleanMeals = tasks.cleanMeals;
                  workout = tasks.workout;
                  readPage = tasks.read;
                  water = tasks.water;
                  custom = tasks.custom;
                  complianceCount = completedCount;
                } else if (row) {
                  cleanMeals = row.clean_meals;
                  workout = row.workout;
                  readPage = row.read_page;
                  water = row.water_synced_override;
                  custom = row.custom_task_done;
                  revivalApplied = row.revival_applied;
                  if (cleanMeals) complianceCount++;
                  if (workout) complianceCount++;
                  if (readPage) complianceCount++;
                  if (water) complianceCount++;
                  if (custom) complianceCount++;
                }

                const isCompleted = complianceCount >= 4 || (row && row.is_calculated_success) || revivalApplied;

                return (
                  <View style={{ gap: 18 }}>
                    <View style={{
                      backgroundColor: isFuture ? DotFuelColors.surface : isCompleted ? 'rgba(194,240,0,0.1)' : 'rgba(255,59,59,0.1)',
                      borderRadius: 12, padding: 14, borderWidth: 1,
                      borderColor: isFuture ? 'rgba(255,255,255,0.05)' : isCompleted ? DotFuelColors.lime : DotFuelColors.red,
                      alignItems: 'center',
                    }}>
                      <Text style={{
                        fontFamily: 'Inter', fontSize: 14, fontWeight: '800',
                        color: isFuture ? DotFuelColors.muted : isCompleted ? DotFuelColors.lime : DotFuelColors.red,
                        textTransform: 'uppercase', letterSpacing: 1,
                      }}>
                        {isFuture ? '⚪ Future Timeline Slot' : revivalApplied ? '🎟️ Streak Revival Applied' : isCompleted ? '🟢 Target Completed (>= 80%)' : '🔴 Intake Insufficient (< 80%)'}
                      </Text>
                    </View>

                    <View style={{ gap: 10, marginVertical: 8 }}>
                      {[
                        { label: 'All day clean meals', done: cleanMeals, emoji: '🥗' },
                        { label: 'Daily workout / 10k steps', done: workout, emoji: '🏋️' },
                        { label: 'Read a page', done: readPage, emoji: '📖' },
                        { label: '4 ltrs of water', done: water, emoji: '💧' },
                        { label: customTaskName || 'Custom daily habit', done: custom, emoji: '✨' },
                      ].map((item, index) => (
                        <View key={index} style={{
                          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                          backgroundColor: DotFuelColors.surface, borderRadius: 12, padding: 14,
                          borderWidth: 1, borderColor: 'rgba(255,255,255,0.02)',
                        }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
                            <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: DotFuelColors.white }}>{item.label}</Text>
                          </View>
                          <View style={{
                            backgroundColor: item.done ? 'rgba(194,240,0,0.15)' : 'rgba(255,255,255,0.05)',
                            borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8, borderWidth: 1,
                            borderColor: item.done ? DotFuelColors.lime : 'rgba(255,255,255,0.1)',
                          }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: item.done ? DotFuelColors.lime : DotFuelColors.muted, textTransform: 'uppercase' }}>
                              {item.done ? 'Done' : 'Missed'}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>

                    <Pressable
                      onPress={() => setInspectorVisible(false)}
                      style={({ pressed }) => ({
                        backgroundColor: '#1E49CF', borderRadius: 14, paddingVertical: 14,
                        alignItems: 'center', justifyContent: 'center',
                        opacity: pressed ? 0.88 : 1, marginTop: 8,
                      })}
                    >
                      <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '800', color: DotFuelColors.white, letterSpacing: 0.5 }}>CLOSE INSPECTOR</Text>
                    </Pressable>
                  </View>
                );
              })()}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // Render static onboarding/join screen if user is not an active participant
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DotFuelColors.black }} edges={['top', 'left', 'right']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header — matches webapp .challenges-header */}
        <View style={{
          paddingTop: 16, paddingHorizontal: Spacing['2xl'],
          paddingBottom: Spacing.xl,
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
        }}>
          <View>
            <Text style={{
              fontFamily: 'Inter', fontSize: 28, fontWeight: '900',
              color: DotFuelColors.white, letterSpacing: -0.5,
            }}>
              Challenges
            </Text>
            <Text style={{
              fontSize: 13, color: DotFuelColors.muted, fontWeight: '500', marginTop: 4,
            }}>
              Push your limits. Compete with friends.
            </Text>
          </View>

          {/* .join-chip — matches webapp */}
          <Pressable
            onPress={() => {
              if (process.env.EXPO_OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/(tabs)/(challenges)/vol3');
            }}
            style={({ pressed }) => ({
              backgroundColor: DotFuelColors.card, borderRadius: 10,
              paddingVertical: 6, paddingHorizontal: 14,
              borderWidth: 1, borderColor: 'rgba(194,240,0,0.2)',
              opacity: pressed ? 0.88 : 1,
            })}>
            <Text style={{
              fontFamily: 'Inter', fontSize: 13, fontWeight: '800',
              color: DotFuelColors.lime, letterSpacing: 0.5, textTransform: 'uppercase',
            }}>
              Join
            </Text>
          </Pressable>
        </View>

        {/* Dot Duo Card */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          <Pressable
            onPress={() => {
              if (process.env.EXPO_OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/(tabs)/(challenges)/dot-duo');
            }}
            style={({ pressed }) => ({
              marginHorizontal: Spacing['2xl'], marginBottom: Spacing.md,
              backgroundColor: DotFuelColors.card, borderRadius: Radius['2xl'],
              borderWidth: 1, borderColor: DotFuelColors.cardBorder,
              padding: 22, overflow: 'hidden',
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <View style={{
              position: 'absolute', top: 0, left: 0, bottom: 0, width: 4,
              backgroundColor: DotFuelColors.lime, borderRadius: 2,
            }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingLeft: 8 }}>
              <View style={{
                width: 56, height: 56, borderRadius: 28,
                backgroundColor: 'rgba(255,100,150,0.15)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 28 }}>🤝</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontFamily: 'Inter', fontSize: 15, fontWeight: '800',
                  color: DotFuelColors.white, textTransform: 'uppercase', letterSpacing: 0.5,
                }}>
                  Dot Duo
                </Text>
                <Text style={{ fontSize: 11, color: DotFuelColors.muted, fontWeight: '600', marginTop: 2 }}>
                  Find an accountability partner. Chat and share your daily macros to stay on track.
                </Text>
              </View>
              <Text style={{ fontSize: 20, color: DotFuelColors.muted }}>›</Text>
            </View>
          </Pressable>
        </Animated.View>

        {/* Static Onboarding Enrollment Card — Vol 3 */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <View style={{
            marginHorizontal: Spacing['2xl'], marginBottom: Spacing.md,
            backgroundColor: DotFuelColors.card, borderRadius: Radius['2xl'],
            borderWidth: 1, borderColor: DotFuelColors.cardBorder,
            padding: 22,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <Text style={{ fontSize: 26 }}>🔥</Text>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontFamily: 'Inter', fontSize: 16, fontWeight: '900',
                  color: DotFuelColors.lime, textTransform: 'uppercase', letterSpacing: 0.5,
                }}>
                  Volume 3 Challenge
                </Text>
                <Text style={{ fontSize: 11, color: DotFuelColors.muted, fontWeight: '600', marginTop: 2 }}>
                  21-day transformation journey
                </Text>
              </View>
            </View>

            <View style={{ gap: 8 }}>
              {['Log all meals daily', 'Hit protein target', 'Drink 3L water', 'Exercise 30 min'].map((task, i) => (
                <View key={i} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 10,
                  backgroundColor: DotFuelColors.surface, borderRadius: 10, padding: 12,
                }}>
                  <View style={{
                    width: 22, height: 22, borderRadius: 6,
                    borderWidth: 2, borderColor: DotFuelColors.surface,
                    backgroundColor: 'transparent',
                  }} />
                  <Text style={{ flex: 1, fontSize: 13, color: DotFuelColors.text, fontWeight: '600' }}>
                    {task}
                  </Text>
                </View>
              ))}
            </View>

            <Pressable
              onPress={() => {
                if (process.env.EXPO_OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/(tabs)/(challenges)/vol3');
              }}
              style={({ pressed }) => ({
                marginTop: 14, backgroundColor: DotFuelColors.limeLight,
                borderWidth: 1, borderColor: 'rgba(194,240,0,0.2)',
                borderRadius: 12, paddingVertical: 12, alignItems: 'center',
                opacity: pressed ? 0.88 : 1,
              })}
            >
              <Text style={{
                fontFamily: 'Inter', fontSize: 12, fontWeight: '800',
                color: DotFuelColors.lime, textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                Join Challenge
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Leaderboard placeholder */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <View style={{
            marginHorizontal: Spacing['2xl'],
            backgroundColor: DotFuelColors.card, borderRadius: Radius['2xl'],
            borderWidth: 1, borderColor: DotFuelColors.cardBorder,
            padding: 22, alignItems: 'center',
          }}>
            <Text style={{ fontSize: 38, marginBottom: 8 }}>🏆</Text>
            <Text style={{
              fontFamily: 'Inter', fontSize: 15, fontWeight: '800',
              color: DotFuelColors.white,
            }}>
              Leaderboard
            </Text>
            <Text style={{
              fontSize: 12, color: DotFuelColors.muted, fontWeight: '500',
              textAlign: 'center', marginTop: 4,
            }}>
              Join a challenge to see rankings and compete with other athletes.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
