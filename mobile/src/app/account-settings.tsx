import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, AlertTriangle } from 'lucide-react-native';
import { authClient } from '@/lib/auth/auth-client';
import * as Haptics from 'expo-haptics';

const C = {
  bg: '#0F0D0B', surface: '#1A1714', text: '#E8DCC8',
  muted: '#6B5B4F', border: '#3D332C', red: '#C41E3A', pin: '#D4A574',
} as const;

export default function AccountSettingsScreen() {
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') {
      setErrorMsg('You must type DELETE (in capital letters) to confirm.');
      return;
    }
    setDeleting(true);
    setErrorMsg('');
    try {
      const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';
      const resp = await fetch(`${BACKEND_URL}/api/me/account`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirmText }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error?.message ?? 'Deletion failed');
      }
      await authClient.signOut();
      router.replace('/sign-in');
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Could not delete account. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <Pressable
          testID="account-settings-back"
          onPress={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={20} color={C.text} strokeWidth={2} />
        </Pressable>
        <Text style={{ color: C.text, fontSize: 20, fontWeight: '800', flex: 1 }}>Account Settings</Text>
      </View>

      <View style={{ flex: 1, padding: 16 }}>
        {/* Delete Account */}
        <View style={{ marginTop: 24, borderWidth: 1, borderColor: 'rgba(196,30,58,0.3)', borderRadius: 16, padding: 20, backgroundColor: 'rgba(196,30,58,0.05)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <AlertTriangle size={22} color={C.red} strokeWidth={2} />
            <Text style={{ color: C.red, fontSize: 18, fontWeight: '800' }}>Delete Account</Text>
          </View>
          <Text style={{ color: C.muted, fontSize: 14, lineHeight: 20, marginBottom: 20 }}>
            This will permanently delete your account, all investigations, nodes, tips, collaboration data, and source attributions. This action cannot be undone.
          </Text>
          <Pressable
            testID="delete-account-button"
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              setConfirmText('');
              setErrorMsg('');
              setShowDeleteModal(true);
            }}
            style={{ backgroundColor: C.red, borderRadius: 10, paddingVertical: 14, alignItems: 'center' }}
          >
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Delete My Account</Text>
          </Pressable>
        </View>
      </View>

      {/* Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}
          onPress={() => setShowDeleteModal(false)}
        >
          <Pressable
            onPress={() => {}}
            style={{ width: '100%', backgroundColor: C.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: 'rgba(196,30,58,0.4)' }}
          >
            <Text style={{ color: C.red, fontSize: 22, fontWeight: '800', marginBottom: 8 }}>Final Confirmation</Text>
            <Text style={{ color: C.muted, fontSize: 14, lineHeight: 20, marginBottom: 20 }}>
              Type <Text style={{ color: C.text, fontWeight: '800' }}>DELETE</Text> below to permanently erase your account and all data.
            </Text>
            <TextInput
              testID="delete-confirm-input"
              value={confirmText}
              onChangeText={t => { setConfirmText(t); setErrorMsg(''); }}
              placeholder="Type DELETE here"
              placeholderTextColor={C.muted}
              style={{ backgroundColor: C.bg, borderRadius: 10, borderWidth: 1, borderColor: C.border, color: C.text, fontSize: 16, fontWeight: '700', padding: 14, marginBottom: 8, textAlign: 'center', letterSpacing: 2 }}
              autoCapitalize="characters"
            />
            {errorMsg ? (
              <Text style={{ color: C.red, fontSize: 12, marginBottom: 12, textAlign: 'center' }}>{errorMsg}</Text>
            ) : (
              <View style={{ height: 20 }} />
            )}
            <Pressable
              testID="delete-confirm-submit"
              onPress={handleDeleteAccount}
              style={{ backgroundColor: confirmText === 'DELETE' ? C.red : C.border, borderRadius: 10, paddingVertical: 14, alignItems: 'center' }}
            >
              {deleting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Permanently Delete Everything</Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => { setShowDeleteModal(false); setConfirmText(''); setErrorMsg(''); }}
              style={{ marginTop: 12, paddingVertical: 10, alignItems: 'center' }}
            >
              <Text style={{ color: C.muted, fontSize: 15 }}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
