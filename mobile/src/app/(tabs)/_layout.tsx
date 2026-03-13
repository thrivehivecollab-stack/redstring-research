import React from 'react';
import { View, Text } from 'react-native';
import { Tabs } from 'expo-router';
import {
  useFonts,
  CourierPrime_400Regular,
} from '@expo-google-fonts/courier-prime';

const COLORS = {
  background: '#1A1614',
  border: '#3D332C',
  red: '#C41E3A',
  muted: '#6B5B4F',
  textLight: '#E8DCC8',
} as const;

type TabIconProps = {
  color: string;
  focused: boolean;
  label: string;
  emoji: string;
};

function TabItem({ color, focused, label, emoji }: TabIconProps) {
  const [fontsLoaded] = useFonts({ CourierPrime_400Regular });

  return (
    <View style={{ alignItems: 'center', gap: 3 }}>
      <Text style={{ fontSize: 23 }}>{emoji}</Text>
      <Text
        style={{
          color,
          fontSize: 9,
          fontFamily: fontsLoaded ? 'CourierPrime_400Regular' : undefined,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      {focused ? (
        <View
          style={{
            width: 20,
            height: 2,
            backgroundColor: COLORS.red,
            borderRadius: 1,
            marginTop: 1,
            shadowColor: COLORS.red,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 4,
            elevation: 4,
          }}
        />
      ) : (
        <View style={{ width: 20, height: 2 }} />
      )}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1A1614',
          borderTopColor: '#3D332C',
          borderTopWidth: 1,
          height: 88,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.red,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabItem color={color} focused={focused} label="Cases" emoji="🗂️" />
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabItem color={color} focused={focused} label="Canvas" emoji="📌" />
          ),
        }}
      />
      <Tabs.Screen
        name="ai-research"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabItem color={color} focused={focused} label="AI" emoji="🤖" />
          ),
        }}
      />
      <Tabs.Screen
        name="podcast"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabItem color={color} focused={focused} label="Live" emoji="📡" />
          ),
        }}
      />
      <Tabs.Screen
        name="scripts"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabItem color={color} focused={focused} label="Pods" emoji="🎙️" />
          ),
        }}
      />
      {/* Hidden tabs - accessible via hamburger menu */}
      <Tabs.Screen name="tips" options={{ href: null }} />
      <Tabs.Screen name="collab-tab" options={{ href: null }} />
      <Tabs.Screen name="bookmarks" options={{ href: null }} />
      <Tabs.Screen name="prompt-history" options={{ href: null }} />
    </Tabs>
  );
}
