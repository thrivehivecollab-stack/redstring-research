import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { X, WifiOff } from 'lucide-react-native';

const C = {
  amber: '#D4A574',
  amberBg: '#2A1F0F',
  amberBorder: '#3D2E14',
  text: '#EDE0CC',
} as const;

export default function OfflineBanner() {
  const netInfo = useNetInfo();
  const [dismissed, setDismissed] = useState(false);
  const translateY = useSharedValue(-80);

  const isOffline = netInfo.isConnected === false;

  useEffect(() => {
    if (isOffline && !dismissed) {
      translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
    } else {
      translateY.value = withTiming(-80, { duration: 250, easing: Easing.in(Easing.cubic) });
    }
  }, [isOffline, dismissed, translateY]);

  // Reset dismissed state when connection comes back, so it shows again next time
  useEffect(() => {
    if (!isOffline) {
      setDismissed(false);
    }
  }, [isOffline]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Always render so the animation can slide out smoothly
  return (
    <Animated.View
      style={[
        animStyle,
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 999,
          backgroundColor: C.amberBg,
          borderBottomWidth: 1,
          borderBottomColor: C.amberBorder,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 10,
          gap: 8,
        },
      ]}
      pointerEvents={isOffline && !dismissed ? 'auto' : 'none'}
    >
      <WifiOff size={14} color={C.amber} strokeWidth={2} />
      <Text style={{ color: C.amber, fontSize: 13, fontWeight: '600', flex: 1 }}>
        Offline — changes will sync when connected
      </Text>
      <Pressable
        onPress={() => setDismissed(true)}
        testID="offline-banner-dismiss"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <X size={14} color={C.amber} strokeWidth={2} />
      </Pressable>
    </Animated.View>
  );
}
