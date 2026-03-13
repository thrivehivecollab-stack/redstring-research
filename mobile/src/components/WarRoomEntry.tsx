import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Video } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/api';
import { useSession } from '@/lib/auth/use-session';
import useInvestigationStore from '@/lib/state/investigation-store';

const C = {
  bg: '#1A1614',
  surface: '#231F1C',
  surfaceAlt: '#2A2522',
  red: '#C41E3A',
  pin: '#D4A574',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
  green: '#22C55E',
};

interface WarRoom {
  id: string;
  ownerId: string;
  title: string;
  status: string;
  isOwner: boolean;
  dailyRoomUrl: string;
  dailyRoomName: string;
  sessionId: string | null;
}

interface Props {
  collabSessionId?: string;
  size?: 'sm' | 'md';
}

export default function WarRoomEntry({ collabSessionId, size = 'sm' }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const activeId = useInvestigationStore((s) => s.activeInvestigationId);
  const investigations = useInvestigationStore((s) => s.investigations);
  const activeInvestigation = investigations.find((i) => i.id === activeId) ?? investigations[0];

  const { data: existingRoom, isLoading: checkingRoom } = useQuery({
    queryKey: ['war-room-session', collabSessionId],
    queryFn: () => api.get<WarRoom | null>(`/api/warroom/rooms/session/${collabSessionId}`),
    enabled: !!collabSessionId && !!session?.user,
    retry: false,
  });

  const createRoomMutation = useMutation({
    mutationFn: () =>
      api.post<{ roomUrl: string; roomName: string; warRoomId: string }>('/api/warroom/rooms', {
        title: activeInvestigation?.title ? `${activeInvestigation.title} — War Room` : 'War Room',
        sessionId: collabSessionId ?? undefined,
      }),
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({ pathname: '/war-room', params: { warRoomId: data.warRoomId, collabSessionId: collabSessionId ?? '' } });
    },
    onError: () => {
      router.push({ pathname: '/war-room', params: { warRoomId: 'unconfigured' } });
    },
  });

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!session?.user) return;
    if (existingRoom?.id) {
      router.push({ pathname: '/war-room', params: { warRoomId: existingRoom.id, collabSessionId: collabSessionId ?? '' } });
      return;
    }
    createRoomMutation.mutate();
  };

  const isLoading = createRoomMutation.isPending || checkingRoom;
  const label = existingRoom?.id ? 'Join War Room' : 'Open War Room';

  if (size === 'md') {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          backgroundColor: pressed ? '#A3162E' : C.red,
          borderRadius: 14,
          paddingVertical: 15,
          marginBottom: 14,
          shadowColor: C.red,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.45,
          shadowRadius: 14,
          elevation: 8,
        })}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <Video size={16} color="#FFF" strokeWidth={2.5} />
            </View>
            <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 }}>{label}</Text>
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#FF6B6B' }} />
          </>
        )}
      </Pressable>
    );
  }

  // sm — compact header pill
  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: pressed ? '#A3162E' : C.red,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 7,
        shadowColor: C.red,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 4,
      })}
    >
      {isLoading ? (
        <ActivityIndicator color="#FFF" size="small" style={{ width: 14, height: 14 }} />
      ) : (
        <Video size={13} color="#FFF" strokeWidth={2.5} />
      )}
      <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 }}>WAR ROOM</Text>
    </Pressable>
  );
}
