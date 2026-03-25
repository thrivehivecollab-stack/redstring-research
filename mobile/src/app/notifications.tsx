import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Bell } from 'lucide-react-native';

const C = {
  bg: '#0F0D0B',
  surface: '#1A1714',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
  red: '#C41E3A',
} as const;

export default function NotificationsScreen() {
  const router = useRouter();
  const { investigationId } = useLocalSearchParams<{ investigationId?: string }>();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
          gap: 12,
        }}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: pressed ? C.border : C.surface,
              alignItems: 'center', justifyContent: 'center',
            })}
          >
            <ArrowLeft size={20} color={C.text} strokeWidth={2} />
          </Pressable>
          <Text style={{ color: C.text, fontSize: 20, fontWeight: '800', flex: 1 }}>
            Notifications
          </Text>
        </View>

        {/* Empty state */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <View style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: C.surface,
            borderWidth: 1, borderColor: C.border,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
          }}>
            <Bell size={32} color={C.muted} strokeWidth={1.5} />
          </View>
          <Text style={{ color: C.text, fontSize: 18, fontWeight: '800', marginBottom: 8, textAlign: 'center' }}>
            No notifications
          </Text>
          <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 21 }}>
            You'll be notified when collaborators make changes or new tips arrive
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
