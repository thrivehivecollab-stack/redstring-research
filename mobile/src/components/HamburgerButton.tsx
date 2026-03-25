import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function HamburgerButton({ color = '#E8DCC8' }: { color?: string }) {
  const router = useRouter();
  return (
    <Pressable
      testID="hamburger-button"
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/hamburger-modal' as any);
      }}
      style={({ pressed }) => ({
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: pressed ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
      })}
    >
      <View style={{ width: 18, height: 2, borderRadius: 1, backgroundColor: color }} />
      <View style={{ width: 14, height: 2, borderRadius: 1, backgroundColor: color, opacity: 0.7 }} />
      <View style={{ width: 18, height: 2, borderRadius: 1, backgroundColor: color }} />
    </Pressable>
  );
}
