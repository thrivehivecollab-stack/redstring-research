import React from 'react';
import { Tabs } from 'expo-router';
import { Search, Map } from 'lucide-react-native';

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
          paddingBottom: 28,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#C41E3A',
        tabBarInactiveTintColor: '#6B5B4F',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.5,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Investigations',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Search size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Canvas',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Map size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}
