import React from 'react';
import { Tabs } from 'expo-router';
import { Search, Map, Brain, Radio, FileText, Bookmark } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1A1614',
          borderTopColor: '#3D332C',
          borderTopWidth: 1,
          height: 96,
          paddingBottom: 20,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#E8203F',
        tabBarInactiveTintColor: '#6B5B4F',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Investigations',
          tabBarIcon: ({ color }: { color: string; size: number }) => (
            <Search size={32} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Canvas',
          tabBarIcon: ({ color }: { color: string; size: number }) => (
            <Map size={32} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="scripts"
        options={{
          title: 'Scripts',
          tabBarIcon: ({ color }: { color: string; size: number }) => (
            <FileText size={32} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="podcast"
        options={{
          title: 'Live & Pods',
          tabBarIcon: ({ color }: { color: string; size: number }) => (
            <Radio size={32} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai-research"
        options={{
          title: 'AI Research',
          tabBarIcon: ({ color }: { color: string; size: number }) => (
            <Brain size={32} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: 'Bookmarks',
          tabBarIcon: ({ color }: { color: string; size: number }) => (
            <Bookmark size={32} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="prompt-history"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
