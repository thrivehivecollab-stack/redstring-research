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
  /** If provided, links the room to a collab session */
  collabSessionId?: string;
  /** Override button size - 'sm' for header buttons, 'md' for full-width */
  size?: 'sm' | 'md';
}

export default function WarRoomEntry({ collabSessionId, size = 'sm' }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const activeId = useInvestigationStore((s) => s.activeInvestigationId);
  const investigations = useInvestigationStore((s) => s.investigations);
  const activeInvestigation = investigations.find((i) => i.id === activeId) ?? investigations[0];

  // Check for an existing active room for this session
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
    onError: (err: any) => {
      const msg = err?.message ?? '';
      if (msg.includes('DAILY_NOT_CONFIGURED')) {
        router.push({ pathname: '/war-room', params: { warRoomId: 'unconfigured' } });
      }
    },
  });

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!session?.user) return;
    // Join existing room if one exists for this session
    if (existingRoom?.id) {
      router.push({ pathname: '/war-room', params: { warRoomId: existingRoom.id, collabSessionId: collabSessionId ?? '' } });
      return;
    }
    // Create a new room
    createRoomMutation.mutate();
  };

  const isLoading = createRoomMutation.isPending || checkingRoom;

  if (size === 'md') {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: pressed ? '#A3162E' : C.red,
          borderRadius: 12,
          paddingVertical: 13,
          marginBottom: 16,
          shadowColor: C.red,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        })}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <>
            <Video size={16} color="#FFF" strokeWidth={2.5} />
            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>
              {existingRoom?.id ? 'Join War Room' : 'Open War Room'}
            </Text>
          </>
        )}
      </Pressable>
    );
  }

  // size === 'sm' — header button style
  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: pressed ? 'rgba(196,30,58,0.25)' : 'rgba(196,30,58,0.15)',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: 'rgba(196,30,58,0.35)',
      })}
    >
      {isLoading ? (
        <ActivityIndicator color={C.red} size="small" style={{ width: 12, height: 12 }} />
      ) : (
        <Video size={12} color={C.red} strokeWidth={2.5} />
      )}
      <Text style={{ color: C.red, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 }}>WAR ROOM</Text>
    </Pressable>
  );
}
