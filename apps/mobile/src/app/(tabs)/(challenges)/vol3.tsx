import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, ScrollView, TextInput, Pressable, KeyboardAvoidingView, ActivityIndicator, Image, Modal, Platform, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import Animated, { 
  FadeInDown, 
  FadeIn, 
  SlideInUp, 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming 
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DotFuelColors, Spacing, Radius } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import type { Vol3Participant, Vol3DailyProgress, Vol3ChatMessage, UserProfile } from '@/lib/types';
import * as Haptics from 'expo-haptics';

interface WebFriendlyModalProps {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
}

function WebFriendlyModal({ visible, onRequestClose, children }: WebFriendlyModalProps) {
  if (!visible) return null;

  if (Platform.OS === 'web') {
    return (
      <View style={{
        // @ts-ignore
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'flex-end',
        zIndex: 99999,
        display: 'flex',
      }}>
        <Pressable 
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={onRequestClose}
        />
        <View style={{
          backgroundColor: DotFuelColors.card,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          borderWidth: 1, borderColor: DotFuelColors.cardBorder,
          width: '100%',
          maxWidth: 500,
          alignSelf: 'center',
          marginTop: 'auto',
          zIndex: 100000,
        }}>
          {children}
        </View>
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onRequestClose}
    >
      <View style={{
        flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'flex-end'
      }}>
        <View style={{
          backgroundColor: DotFuelColors.card,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          borderWidth: 1, borderColor: DotFuelColors.cardBorder
        }}>
          {children}
        </View>
      </View>
    </Modal>
  );
}

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

export default function Vol3ChallengeScreen() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [participant, setParticipant] = useState<Vol3Participant | null>(null);
  
  // Cut List
  const [cutList, setCutList] = useState(['', '', '']);
  
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

  // Countdown Timer state
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    hasStarted: true, // Default to true so it doesn't flash dashboard briefly
  });

  useEffect(() => {
    const startMs = new Date('2026-06-23T00:00:00+05:30').getTime();
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const diff = startMs - now;
      if (diff <= 0) {
        setTimeLeft(prev => ({ ...prev, hasStarted: true }));
        return true;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft({ days, hours, minutes, seconds, hasStarted: false });
      return false;
    };
    
    const isFinished = updateCountdown();
    if (isFinished) return;
    
    const interval = setInterval(() => {
      const isFinished = updateCountdown();
      if (isFinished) {
        clearInterval(interval);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);


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

  useFocusEffect(
    useCallback(() => {
      if (!authLoading) {
        if (user) {
          const isSilent = !loading;
          loadInitialData(isSilent);
        } else {
          setLoading(false);
        }
      }
    }, [user, authLoading, loading])
  );

  useEffect(() => {
    if (participant) {
      loadDashboardData();
      setupChatSubscription();
    }
    return () => {
      supabase.removeAllChannels();
    };
  }, [participant]);

  const loadInitialData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('challenge_vol3_participants')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (data) {
        setParticipant(data);
        if (data.custom_task_title) setCustomTaskName(data.custom_task_title);
      }
    } catch (err) {
      console.log('Error loading participant', err);
    }
    if (!silent) setLoading(false);
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
        const [usersRes, profilesRes, allProgressRes] = await Promise.all([
          supabase.from('users').select('id, name, streak_days').in('id', ids),
          supabase.from('profiles').select('id, name, streak_days').in('id', ids),
          supabase.from('challenge_vol3_daily_progress')
            .select('user_id, log_date, is_calculated_success, revival_applied, clean_meals, workout, read_page, water_synced_override, custom_task_done')
            .in('user_id', ids)
            .order('log_date', { ascending: false }),
        ]);

        const users = usersRes.data || [];
        const profiles = profilesRes.data || [];
        const allProgress = allProgressRes.data || [];

        const userMap = new Map(users.map(u => [u.id, u]));
        const profileMap = new Map(profiles.map(p => [p.id, p]));

        // Group progress rows by user
        const progressByUser = new Map<string, typeof allProgress>();
        allProgress.forEach(row => {
          if (!progressByUser.has(row.user_id)) progressByUser.set(row.user_id, []);
          progressByUser.get(row.user_id)!.push(row);
        });

        // Count total completed days (matching Dot Matrix filled dots)
        // A day is completed when: complianceCount >= 4 OR is_calculated_success OR revival_applied
        const computeStreak = (rows: typeof allProgress): number => {
          if (!rows || rows.length === 0) return 0;
          const todayStr = new Date().toISOString().split('T')[0];
          let count = 0;
          rows.forEach(r => {
            // Don't count future days
            if (r.log_date > todayStr) return;
            // Count tasks completed (same logic as Dot Matrix)
            let complianceCount = 0;
            if (r.clean_meals) complianceCount++;
            if (r.workout) complianceCount++;
            if (r.read_page) complianceCount++;
            if (r.water_synced_override) complianceCount++;
            if (r.custom_task_done) complianceCount++;
            const isCompleted = complianceCount >= 4 || r.is_calculated_success || r.revival_applied;
            if (isCompleted) count++;
          });
          return count;
        };

        const leaderboardData = ids.map(id => {
          const u = userMap.get(id);
          const p = profileMap.get(id);
          const name = (id === user.id ? (profile?.name || u?.name || p?.name) : (u?.name || p?.name))?.trim() || 'Athlete';
          const calculatedStreak = computeStreak(progressByUser.get(id) || []);
          const dbStreak = u?.streak_days ?? p?.streak_days ?? 0;
          const streak_days = id === user.id ? calculatedStreak : dbStreak;
          return {
            id,
            name,
            streak_days,
          };
        });

        const sorted = leaderboardData.sort((a, b) => b.streak_days - a.streak_days);
        setLeaderboard(sorted);

        // Also sync current user's streak_days to both users and profiles tables
        const myStreak = sorted.find(s => s.id === user.id)?.streak_days ?? 0;
        Promise.all([
          supabase.from('users').update({ streak_days: myStreak }).eq('id', user.id),
          supabase.from('profiles').update({ streak_days: myStreak }).eq('id', user.id),
        ]).then(() => {});
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
      console.log('Error loading dashboard data', err);
    }
  };

  const setupChatSubscription = () => {
    supabase
      .channel('vol3-chat-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'challenge_vol3_chat' }, (payload) => {
        setMessages(prev => [...prev, payload.new as Vol3ChatMessage]);
        setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .subscribe();
  };

  const joinChallenge = async () => {
    if (!user) return;
    if (process.env.EXPO_OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    const cuts = cutList.filter(c => c.trim().length > 0);
    const newParticipant = {
      user_id: user.id,
      cut_list: cuts,
      revivals_remaining: 2,
      status: 'active' as const,
    };

    try {
      const { data, error } = await supabase
        .from('challenge_vol3_participants')
        .insert(newParticipant)
        .select()
        .single();
        
      if (data) {
        setParticipant(data);
      }
    } catch (err) {
      console.log('Error joining challenge', err);
    }
  };

  const exitChallenge = async () => {
    if (!user || !participant) return;
    
    let confirm = false;
    if (Platform.OS === 'web') {
      confirm = window.confirm("Are you sure you want to exit the Volume 3 Challenge? Your challenge progress and active streaks will be lost forever.");
    } else {
      confirm = await new Promise((resolve) => {
        Alert.alert(
          "Exit Challenge",
          "Are you sure you want to exit the Volume 3 Challenge? Your challenge progress and active streaks will be lost forever.",
          [
            { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
            { text: "Exit Challenge", style: "destructive", onPress: () => resolve(true) }
          ],
          { cancelable: true }
        );
      });
    }

    if (!confirm) return;

    try {
      setLoading(true);
      // Delete progress rows
      await supabase
        .from('challenge_vol3_daily_progress')
        .delete()
        .eq('user_id', user.id);

      // Delete participant row
      const { error } = await supabase
        .from('challenge_vol3_participants')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      // Reset local states
      setParticipant(null);
      setProgressData({});
      setTasks({
        cleanMeals: false,
        workout: false,
        read: false,
        water: false,
        custom: false,
      });
      setCustomTaskName('');
      setCutList(['', '', '']);
    } catch (err) {
      console.log('Error exiting challenge', err);
      if (Platform.OS === 'web') {
        window.alert('Failed to exit the challenge. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to exit the challenge. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (key: keyof typeof tasks) => {
    if (!user || !participant) return;
    if (process.env.EXPO_OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const nextVal = !tasks[key];
    
    // Update local state instantly (optimistic UI)
    setTasks(prev => ({ ...prev, [key]: nextVal }));
    
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Calculate new compliance status
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

    // Optimistically update progressData cache as well
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
        // Rollback on error
        setTasks(prev => ({ ...prev, [key]: !nextVal }));
        loadDashboardData();
      } else {
        // Sync leaderboard and streak_days immediately
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
      const { data, error } = await supabase
        .from('challenge_vol3_chat')
        .insert({
          user_id: user.id,
          message: msgText,
          profile_name: profile?.name || user.email?.split('@')[0] || 'Challenger',
          image_url: profile?.avatar_url || null
        })
        .select()
        .single();

      if (error) {
        console.error('Chat insert error:', error);
        Alert.alert('Chat Error', error.message);
        setChatInput(msgText); // Restore input on failure
      } else if (data) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, data as Vol3ChatMessage];
        });
        setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (err: any) {
      console.error('Error sending msg', err);
      Alert.alert('Error', err.message);
      setChatInput(msgText);
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
          {timeline.map((dateStr, i) => {
            const isToday = dateStr === todayStr;
            const isFuture = dateStr > todayStr;
            const row = progressData[dateStr];
            
            // Check past or today compliance (>= 80% tasks = at least 4 out of 5)
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
            let border: string = 'rgba(255,255,255,0.15)'; // Dimmed hollow placeholder

            if (!isFuture) {
              if (isCompleted) {
                // Neon Green State
                color = DotFuelColors.lime;
                border = DotFuelColors.lime;
              } else {
                // Muted Red / Dark Border
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

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: DotFuelColors.black, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={DotFuelColors.lime} />
      </View>
    );
  }

  if (!participant) {
    // ONBOARDING VIEW
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DotFuelColors.black }} edges={['top', 'left', 'right']}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
          <Stack.Screen options={{ title: 'Volume 3', headerShown: false }} />
          
          <View style={{ paddingTop: 16, paddingHorizontal: Spacing['2xl'], alignItems: 'center' }}>
            <Pressable onPress={() => router.back()} style={{ position: 'absolute', top: 16, left: Spacing['2xl'], padding: 8 }}>
              <Text style={{ color: DotFuelColors.white, fontSize: 24 }}>←</Text>
            </Pressable>
            <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '900', color: DotFuelColors.white, letterSpacing: 0.5 }}>DOT CHALLENGE</Text>
            <Text style={{ fontSize: 13, color: DotFuelColors.lime, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>Volume 3</Text>
          </View>

        <Animated.View entering={FadeInDown.delay(100)} style={{ paddingHorizontal: Spacing['2xl'] }}>
          {/* Hero Card */}
          <View style={{
            marginTop: 20, alignItems: 'center', backgroundColor: DotFuelColors.card,
            borderWidth: 1, borderColor: 'rgba(194,240,0,0.15)', borderRadius: Radius['2xl'],
            padding: 28,
          }}>
            <Text style={{ fontSize: 52, marginBottom: 14 }}>🔥</Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: '900', color: DotFuelColors.white, marginBottom: 6 }}>Welcome to Vol 3</Text>
            <Text style={{ fontSize: 13, color: DotFuelColors.muted, textAlign: 'center', lineHeight: 20 }}>
              The ultimate test of consistency. Stay clean-eating starting <Text style={{ color: DotFuelColors.lime, fontWeight: 'bold' }}>June 23, 2026</Text> until <Text style={{ color: DotFuelColors.white, fontWeight: 'bold' }}>August 30, 2026</Text>. Members can join at any time, but the challenge concludes on August 30. Define your Cut List, maintain your streak, and push through with <Text style={{ color: DotFuelColors.lime, fontWeight: 'bold' }}>2 emergency Streak Revivals</Text>.
            </Text>
          </View>

          {/* Rules */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            {[
              { emoji: '📅', title: '76 Days', desc: 'Duration' },
              { emoji: '🎟️', title: '2 Revivals', desc: 'Streak Saves' },
              { emoji: '🏆', title: 'Live Board', desc: 'Compete Live' }
            ].map((rule, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: DotFuelColors.card, borderRadius: 16, padding: 14, alignItems: 'center' }}>
                <Text style={{ fontSize: 24, marginBottom: 6 }}>{rule.emoji}</Text>
                <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '800', color: DotFuelColors.white }}>{rule.title}</Text>
                <Text style={{ fontSize: 10, color: DotFuelColors.muted, fontWeight: '600' }}>{rule.desc}</Text>
              </View>
            ))}
          </View>

          {/* Cut List */}
          <View style={{ marginTop: 14, backgroundColor: DotFuelColors.card, borderRadius: Radius['2xl'], padding: 20 }}>
            <Text style={{ color: '#ff6b6b', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>THE CUT LIST 🚫</Text>
            <Text style={{ fontSize: 12, color: DotFuelColors.muted, marginBottom: 18, lineHeight: 18 }}>
              Identify up to 3 food addictions or guilty habits you want to eliminate during this challenge. <Text style={{ opacity: 0.5 }}>(Optional)</Text>
            </Text>
            {[0, 1, 2].map((i) => (
              <TextInput
                key={i}
                value={cutList[i]}
                onChangeText={(val) => {
                  const newList = [...cutList];
                  newList[i] = val;
                  setCutList(newList);
                }}
                placeholder={`e.g. ${['Sugary sodas 🥤', 'Late night snacking 🍕', 'Fast food 🍔'][i]}`}
                placeholderTextColor={DotFuelColors.muted}
                style={{
                  backgroundColor: DotFuelColors.surface, borderRadius: 12, padding: 14,
                  color: DotFuelColors.white, fontFamily: 'Inter', fontSize: 14, marginBottom: 10,
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
                }}
              />
            ))}
          </View>

          <Button
            title="ACCEPT THE CHALLENGE →"
            onPress={joinChallenge}
            style={{ marginTop: 20 }}
          />
        </Animated.View>
      </ScrollView>
      </SafeAreaView>
    );
  }

  // If the user has joined (is a participant) but the challenge hasn't started yet, render the COUNTDOWN VIEW
  if (participant && !timeLeft.hasStarted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DotFuelColors.black }} edges={['top', 'left', 'right']}>
        <Stack.Screen options={{ title: 'Volume 3', headerShown: false }} />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }}>
          <View style={{ paddingTop: 16, paddingHorizontal: Spacing['2xl'], alignItems: 'center', position: 'relative' }}>
            <Pressable onPress={() => router.back()} style={{ position: 'absolute', top: 16, left: Spacing['2xl'], padding: 8 }}>
              <Text style={{ color: DotFuelColors.white, fontSize: 24 }}>←</Text>
            </Pressable>
            <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '900', color: DotFuelColors.white, letterSpacing: 0.5 }}>DOT CHALLENGE</Text>
            <Text style={{ fontSize: 13, color: DotFuelColors.lime, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>Volume 3</Text>
          </View>

          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing['2xl'], marginTop: 60 }}>
            {/* Visual countdown indicator */}
            <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(194, 240, 0, 0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(194, 240, 0, 0.15)' }}>
              <Text style={{ fontSize: 48 }}>⏳</Text>
            </View>

            <Text style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: '900', color: DotFuelColors.white, marginBottom: 8, textAlign: 'center' }}>
              YOU ARE ENROLLED!
            </Text>
            <Text style={{ fontSize: 13, color: DotFuelColors.muted, textAlign: 'center', lineHeight: 20, marginBottom: 32, maxWidth: 300 }}>
              Get ready. The Volume 3 Challenge officially starts on <Text style={{ color: DotFuelColors.lime, fontWeight: 'bold' }}>June 23, 2026</Text> at midnight. You can join at any point, but the challenge concludes on August 30, 2026.
            </Text>

            {/* Countdown Grid */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 40 }}>
              {[
                { label: 'DAYS', val: timeLeft.days },
                { label: 'HRS', val: timeLeft.hours },
                { label: 'MINS', val: timeLeft.minutes },
                { label: 'SECS', val: timeLeft.seconds },
              ].map((item, idx) => (
                <View key={idx} style={{ flex: 1, backgroundColor: DotFuelColors.card, borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: DotFuelColors.cardBorder, minWidth: 68 }}>
                  <Text style={{ fontFamily: 'Inter', fontSize: 26, fontWeight: '900', color: DotFuelColors.lime }}>
                    {String(item.val).padStart(2, '0')}
                  </Text>
                  <Text style={{ fontSize: 9, color: DotFuelColors.muted, fontWeight: '800', marginTop: 4, letterSpacing: 0.5 }}>{item.label}</Text>
                </View>
              ))}
            </View>

            {/* Your Cut List card */}
            {participant.cut_list && participant.cut_list.length > 0 && (
              <View style={{ width: '100%', backgroundColor: DotFuelColors.card, borderRadius: Radius['2xl'], padding: 20, borderWidth: 1, borderColor: DotFuelColors.cardBorder }}>
                <Text style={{ color: '#ff6b6b', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>YOUR CUT LIST 🚫</Text>
                <View style={{ gap: 8 }}>
                  {participant.cut_list.map((item, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: DotFuelColors.surface, borderRadius: 10, padding: 12 }}>
                      <Text style={{ fontSize: 14 }}>•</Text>
                      <Text style={{ fontSize: 13, color: DotFuelColors.text, fontWeight: '600' }}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // DASHBOARD VIEW
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DotFuelColors.black }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <Stack.Screen options={{ title: 'Volume 3', headerShown: false }} />
        
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={{ paddingTop: 16, paddingHorizontal: Spacing['2xl'], alignItems: 'center' }}>
            <Pressable onPress={() => router.back()} style={{ position: 'absolute', top: 16, left: Spacing['2xl'], padding: 8 }}>
              <Text style={{ color: DotFuelColors.white, fontSize: 24 }}>←</Text>
            </Pressable>
          <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '900', color: DotFuelColors.white, letterSpacing: 0.5 }}>DOT CHALLENGE</Text>
          <Text style={{ fontSize: 13, color: DotFuelColors.lime, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>Volume 3</Text>
        </View>

        <Animated.View entering={FadeIn.duration(400)} style={{ paddingHorizontal: Spacing['2xl'] }}>
          {/* Time Remaining */}
          <View style={{
            marginTop: 20, backgroundColor: DotFuelColors.card, borderRadius: Radius['2xl'],
            padding: 20, borderWidth: 1, borderColor: 'rgba(194,240,0,0.1)'
          }}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ color: DotFuelColors.lime, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>Time Remaining</Text>
              <Text style={{ fontFamily: 'Inter', fontSize: 36, fontWeight: '900', color: DotFuelColors.white, marginTop: 4 }}>{daysLeft} Days</Text>
              <Text style={{ fontSize: 11, color: DotFuelColors.muted, fontWeight: '600', marginTop: 4 }}>Ends 30 Aug 2026</Text>
            </View>
            {renderDotMatrix()}
          </View>

          {/* Checklist */}
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

          {/* Leaderboard */}
          <View style={{ marginTop: 14, backgroundColor: DotFuelColors.card, borderRadius: Radius['2xl'], padding: 20 }}>
            <Text style={{ color: DotFuelColors.white, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>Challenger Board 🏆</Text>
            {leaderboard.length === 0 ? (
              <Text style={{ color: DotFuelColors.muted, fontSize: 12, textAlign: 'center', marginVertical: 20 }}>Loading standings...</Text>
            ) : (
              <ScrollView 
                style={leaderboard.length > 5 ? { maxHeight: 270 } : null}
                showsVerticalScrollIndicator={leaderboard.length > 5}
                nestedScrollEnabled
                contentContainerStyle={{ gap: 12 }}
              >
                {leaderboard.map((u, i) => {
                  const rank = i + 1;
                  const isMe = u.id === user?.id;
                  const maxStreak = Math.max(leaderboard[0]?.streak_days || 1, 1);
                  const barPct = Math.round((u.streak_days / maxStreak) * 100);

                  return (
                    <Animated.View key={u.id} entering={FadeInDown.delay(i * 50)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ width: 24, fontSize: 14, textAlign: 'center', color: DotFuelColors.muted, fontFamily: 'Inter', fontWeight: '700' }}>
                        {rank}
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
              </ScrollView>
            )}
          </View>

          {/* Social Feed Chat */}
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

          {/* Exit Challenge Danger Area */}
          <View style={{ marginTop: 24, marginBottom: 20, alignItems: 'center' }}>
            <Pressable 
              onPress={exitChallenge}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: Radius.lg,
                borderWidth: 1,
                borderColor: DotFuelColors.red,
                backgroundColor: DotFuelColors.redLight,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              })}
            >
              <Text style={{ color: DotFuelColors.red, fontFamily: 'Inter', fontSize: 13, fontWeight: '700' }}>
                Exit Volume 3 Challenge 🚪
              </Text>
            </Pressable>
            <Text style={{ color: DotFuelColors.muted, fontSize: 11, textAlign: 'center', marginTop: 6, width: '90%', fontFamily: 'Inter' }}>
              Warning: Exiting will delete your challenge logs and streaks permanently.
            </Text>
          </View>

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
      {/* ── DAY INSPECTOR MODAL ── */}
      <WebFriendlyModal
        visible={inspectorVisible}
        onRequestClose={() => setInspectorVisible(false)}
      >
        <View style={{
          padding: 24,
        }}>
            {/* Grab handle */}
            <View style={{
              width: 40,
              height: 4,
              backgroundColor: DotFuelColors.surface,
              borderRadius: 2,
              alignSelf: 'center',
              marginBottom: 16,
            }} />

            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <View>
                <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '900', color: DotFuelColors.white }}>
                  📅 Day Details
                </Text>
                <Text style={{ fontSize: 13, color: DotFuelColors.muted, marginTop: 2 }}>
                  {selectedDate ? new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                </Text>
              </View>
              <Pressable onPress={() => setInspectorVisible(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 20, color: DotFuelColors.muted, fontWeight: 'bold' }}>✕</Text>
              </Pressable>
            </View>

            {/* Compliance Badge */}
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
                  {/* Status Box */}
                  <View style={{
                    backgroundColor: isFuture ? DotFuelColors.surface : isCompleted ? 'rgba(194,240,0,0.1)' : 'rgba(255,59,59,0.1)',
                    borderRadius: 12,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: isFuture ? 'rgba(255,255,255,0.05)' : isCompleted ? DotFuelColors.lime : DotFuelColors.red,
                    alignItems: 'center',
                  }}>
                    <Text style={{
                      fontFamily: 'Inter',
                      fontSize: 14,
                      fontWeight: '800',
                      color: isFuture ? DotFuelColors.muted : isCompleted ? DotFuelColors.lime : DotFuelColors.red,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}>
                      {isFuture ? '⚪ Future Timeline Slot' : revivalApplied ? '🎟️ Streak Revival Applied' : isCompleted ? '🟢 Target Completed (>= 80%)' : '🔴 Intake Insufficient (< 80%)'}
                    </Text>
                  </View>

                  {/* Checklist Summary */}
                  <View style={{ gap: 10, marginVertical: 8 }}>
                    {[
                      { label: 'All day clean meals', done: cleanMeals, emoji: '🥗' },
                      { label: 'Daily workout / 10k steps', done: workout, emoji: '🏋️' },
                      { label: 'Read a page', done: readPage, emoji: '📖' },
                      { label: '4 ltrs of water', done: water, emoji: '💧' },
                      { label: customTaskName || 'Custom daily habit', done: custom, emoji: '✨' },
                    ].map((item, index) => (
                      <View key={index} style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: DotFuelColors.surface,
                        borderRadius: 12,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.02)',
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
                          <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: DotFuelColors.white }}>
                            {item.label}
                          </Text>
                        </View>
                        <View style={{
                          backgroundColor: item.done ? 'rgba(194,240,0,0.15)' : 'rgba(255,255,255,0.05)',
                          borderRadius: 8,
                          paddingVertical: 4,
                          paddingHorizontal: 8,
                          borderWidth: 1,
                          borderColor: item.done ? DotFuelColors.lime : 'rgba(255,255,255,0.1)',
                        }}>
                          <Text style={{
                            fontSize: 10,
                            fontWeight: '800',
                            color: item.done ? DotFuelColors.lime : DotFuelColors.muted,
                            textTransform: 'uppercase',
                          }}>
                            {item.done ? 'Done' : 'Missed'}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Close button */}
                  <Pressable
                    onPress={() => setInspectorVisible(false)}
                    style={({ pressed }) => ({
                      backgroundColor: '#1E49CF',
                      borderRadius: 14,
                      paddingVertical: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: pressed ? 0.88 : 1,
                      marginTop: 8,
                    })}
                  >
                    <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '800', color: DotFuelColors.white, letterSpacing: 0.5 }}>
                      CLOSE INSPECTOR
                    </Text>
                  </Pressable>
                </View>
              );
            })()}
          </View>
      </WebFriendlyModal>
    </SafeAreaView>
  );
}

