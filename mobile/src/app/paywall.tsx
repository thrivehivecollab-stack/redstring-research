import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Check, Star, Zap, Infinity as InfinityIcon, Crown, Rocket } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import Svg, { Line, Circle as SvgCircle } from 'react-native-svg';
import { getOfferings, purchasePackage, restorePurchases } from '@/lib/revenuecatClient';
import useSubscriptionStore from '@/lib/state/subscription-store';
import type { PurchasesPackage } from 'react-native-purchases';

// ---- Colors ----
const C = {
  bg: '#0F0D0B',
  surface: '#1A1714',
  surfaceAlt: '#211E1A',
  red: '#C41E3A',
  redDark: '#A3162E',
  pin: '#C8934A',
  amber: '#D4A574',
  text: '#EDE0CC',
  muted: '#6B5D4F',
  mutedLight: '#8B7B6F',
  border: '#272320',
  borderLight: '#3D332C',
  gold: '#F0C060',
} as const;

type BillingCycle = 'monthly' | 'annual';
type SelectedTier = 'researcher' | 'investigator' | 'professional' | null;

// Package identifiers
const PKG = {
  researcherMonthly: 'researcher_monthly',
  researcherAnnual: 'researcher_annual',
  investigatorMonthly: 'investigator_monthly',
  investigatorAnnual: 'investigator_annual',
  professionalMonthly: 'professional_monthly',
  professionalAnnual: 'professional_annual',
  lifetimeAccess: 'lifetime_access',
  foundingMemberMonthly: 'founding_member_monthly',
} as const;

const PRICE_FALLBACK: Record<string, string> = {
  [PKG.researcherMonthly]: '$9.99/mo',
  [PKG.researcherAnnual]: '$79.99/yr',
  [PKG.investigatorMonthly]: '$19.99/mo',
  [PKG.investigatorAnnual]: '$159.99/yr',
  [PKG.professionalMonthly]: '$49.99/mo',
  [PKG.professionalAnnual]: '$399.99/yr',
  [PKG.lifetimeAccess]: '$299.99',
  [PKG.foundingMemberMonthly]: '$7.99/mo',
};

// ---- Animated string decoration ----
function StringDecoration() {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.3, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        animStyle,
        { position: 'absolute', top: 0, left: 0, right: 0, height: 120, pointerEvents: 'none' as const },
      ]}
    >
      <Svg width="100%" height="120" viewBox="0 0 400 120">
        <Line x1="60" y1="70" x2="200" y2="45" stroke={C.red} strokeWidth="1.5" opacity="0.8" />
        <Line x1="200" y1="45" x2="340" y2="70" stroke={C.red} strokeWidth="1.5" opacity="0.8" />
        <SvgCircle cx="60" cy="70" r="4" fill={C.pin} opacity="0.9" />
        <SvgCircle cx="200" cy="45" r="4" fill={C.red} opacity="0.9" />
        <SvgCircle cx="340" cy="70" r="4" fill={C.pin} opacity="0.9" />
        <Line x1="60" y1="70" x2="40" y2="100" stroke={C.red} strokeWidth="1" opacity="0.4" />
        <Line x1="340" y1="70" x2="360" y2="100" stroke={C.red} strokeWidth="1" opacity="0.4" />
      </Svg>
    </Animated.View>
  );
}

// ---- Tier card (vertical layout) ----
function TierCard({
  title,
  badge,
  price,
  subtitle,
  isSelected,
  features,
  onSelect,
  badgeColor,
  icon,
}: {
  title: string;
  badge?: string;
  price: string;
  subtitle: string;
  isSelected: boolean;
  features: string[];
  onSelect: () => void;
  badgeColor: string;
  icon: React.ReactNode;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    scale.value = withSequence(
      withTiming(0.97, { duration: 80 }),
      withTiming(1, { duration: 120 })
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect();
  }, [onSelect, scale]);

  return (
    <Animated.View style={[animStyle, { marginBottom: 12 }]}>
      <Pressable
        onPress={handlePress}
        testID={`tier-card-${title.toLowerCase()}`}
        style={{
          backgroundColor: isSelected ? C.surfaceAlt : C.surface,
          borderRadius: 16,
          padding: 16,
          borderWidth: isSelected ? 2 : 1,
          borderColor: isSelected ? badgeColor : C.border,
          shadowColor: isSelected ? badgeColor : 'transparent',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isSelected ? 0.25 : 0,
          shadowRadius: 12,
          elevation: isSelected ? 6 : 2,
          position: 'relative',
        }}
      >
        {badge ? (
          <View
            style={{
              position: 'absolute',
              top: -10,
              right: 16,
              backgroundColor: badgeColor,
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 3,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              zIndex: 10,
            }}
          >
            <Star size={9} color="#FFF" strokeWidth={2.5} fill="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>
              {badge.toUpperCase()}
            </Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: badge ? 8 : 0 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: badgeColor + '22',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
            }}
          >
            {icon}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontSize: 16, fontWeight: '800' }}>{title}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: badgeColor, fontSize: 18, fontWeight: '900' }}>{price}</Text>
            <Text style={{ color: C.muted, fontSize: 10 }}>{subtitle}</Text>
          </View>
        </View>

        <View style={{ marginTop: 12, gap: 5 }}>
          {features.map((f) => (
            <View key={f} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
              <Check size={12} color={badgeColor} strokeWidth={2.5} style={{ marginTop: 2 }} />
              <Text style={{ color: C.mutedLight, fontSize: 12, flex: 1, lineHeight: 16 }}>{f}</Text>
            </View>
          ))}
        </View>

        {isSelected ? (
          <View
            style={{
              position: 'absolute',
              top: 14,
              left: 14,
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: badgeColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check size={10} color="#FFF" strokeWidth={3} />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

// ---- Main Paywall Screen ----
export default function PaywallScreen() {
  const router = useRouter();
  const checkSubscription = useSubscriptionStore((s) => s.checkSubscription);

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const [selectedTier, setSelectedTier] = useState<SelectedTier>('investigator');
  const [packages, setPackages] = useState<Record<string, PurchasesPackage>>({});
  const [isPurchasing, setIsPurchasing] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [loadingPackages, setLoadingPackages] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingPackages(true);
      const result = await getOfferings();
      if (!mounted) return;
      if (result.ok && result.data.current) {
        const pkgMap: Record<string, PurchasesPackage> = {};
        result.data.current.availablePackages.forEach((pkg) => {
          pkgMap[pkg.identifier] = pkg;
        });
        setPackages(pkgMap);
      }
      setLoadingPackages(false);
    };
    load();
    return () => { mounted = false; };
  }, []);

  const getPrice = useCallback((pkgId: string): string => {
    const pkg = packages[pkgId];
    if (pkg) return pkg.product.priceString;
    return PRICE_FALLBACK[pkgId] ?? '—';
  }, [packages]);

  const getSubtitle = useCallback((annualPkgId: string, monthlyPkgId: string): string => {
    if (billingCycle === 'monthly') return 'billed monthly';
    const annualPkg = packages[annualPkgId];
    const monthlyPkg = packages[monthlyPkgId];
    if (annualPkg && monthlyPkg) {
      const savings = Math.round(
        ((monthlyPkg.product.price - annualPkg.product.price / 12) / monthlyPkg.product.price) * 100
      );
      return `Save ${savings}% vs monthly`;
    }
    return 'billed annually';
  }, [billingCycle, packages]);

  const getSelectedPackageId = useCallback((): string | null => {
    if (!selectedTier) return null;
    const map: Record<NonNullable<SelectedTier>, { monthly: string; annual: string }> = {
      researcher: { monthly: PKG.researcherMonthly, annual: PKG.researcherAnnual },
      investigator: { monthly: PKG.investigatorMonthly, annual: PKG.investigatorAnnual },
      professional: { monthly: PKG.professionalMonthly, annual: PKG.professionalAnnual },
    };
    return map[selectedTier][billingCycle];
  }, [selectedTier, billingCycle]);

  const handlePurchase = useCallback(async () => {
    const pkgId = getSelectedPackageId();
    if (!pkgId) return;
    const pkg = packages[pkgId];
    if (!pkg) {
      setErrorMessage('Package not available. Please try again.');
      return;
    }
    setIsPurchasing(true);
    setErrorMessage(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await purchasePackage(pkg);
    setIsPurchasing(false);
    if (result.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await checkSubscription();
      setShowSuccessModal(true);
    } else if (result.reason !== 'sdk_error') {
      setErrorMessage('Purchase unavailable right now. Please try again.');
    }
  }, [getSelectedPackageId, packages, checkSubscription]);

  const handleLifetimePurchase = useCallback(async () => {
    const pkg = packages[PKG.lifetimeAccess];
    if (!pkg) {
      setErrorMessage('Lifetime package not available. Please try again.');
      return;
    }
    setIsPurchasing(true);
    setErrorMessage(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const result = await purchasePackage(pkg);
    setIsPurchasing(false);
    if (result.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await checkSubscription();
      setShowSuccessModal(true);
    } else if (result.reason !== 'sdk_error') {
      setErrorMessage('Lifetime purchase unavailable. Please try again.');
    }
  }, [packages, checkSubscription]);

  const handleRestore = useCallback(async () => {
    setIsRestoring(true);
    setErrorMessage(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await restorePurchases();
    setIsRestoring(false);
    if (result.ok) {
      await checkSubscription();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccessModal(true);
    } else {
      setErrorMessage('No purchases found to restore.');
    }
  }, [checkSubscription]);

  const handleClose = useCallback(() => { router.back(); }, [router]);
  const handleSuccessDone = useCallback(() => { setShowSuccessModal(false); router.back(); }, [router]);

  const researcherPrice = billingCycle === 'annual' ? getPrice(PKG.researcherAnnual) : getPrice(PKG.researcherMonthly);
  const investigatorPrice = billingCycle === 'annual' ? getPrice(PKG.investigatorAnnual) : getPrice(PKG.investigatorMonthly);
  const professionalPrice = billingCycle === 'annual' ? getPrice(PKG.professionalAnnual) : getPrice(PKG.professionalMonthly);

  const tierLabel = selectedTier
    ? selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)
    : '';
  const ctaPkgId = getSelectedPackageId();
  const ctaPrice = ctaPkgId ? getPrice(ctaPkgId) : '—';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }} testID="paywall-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Close button */}
        <Pressable
          testID="paywall-close-button"
          onPress={handleClose}
          style={({ pressed }) => ({
            position: 'absolute',
            top: 52,
            right: 20,
            zIndex: 10,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: pressed ? C.border : C.surface,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: C.border,
          })}
        >
          <X size={18} color={C.muted} strokeWidth={2} />
        </Pressable>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <Animated.View entering={FadeIn.duration(600)} style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 }}>
            <View style={{ height: 120, position: 'relative', marginBottom: 0 }}>
              <StringDecoration />
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8 }}>
                <View
                  style={{
                    backgroundColor: C.red + '22',
                    borderRadius: 20,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    marginBottom: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Crown size={12} color={C.red} strokeWidth={2} />
                  <Text style={{ color: C.red, fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>
                    UNLOCK FULL ACCESS
                  </Text>
                </View>
              </View>
            </View>
            <Text style={{ color: C.text, fontSize: 28, fontWeight: '900', textAlign: 'center', letterSpacing: -0.5, marginBottom: 6 }}>
              Follow Every Thread
            </Text>
            <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
              Upgrade to unravel deeper conspiracies with more investigations and nodes.
            </Text>
          </Animated.View>

          {/* Founding Member banner */}
          <Animated.View entering={FadeInDown.delay(50).duration(500)} style={{ marginHorizontal: 20, marginTop: 16, marginBottom: 4 }}>
            <View
              style={{
                backgroundColor: C.gold + '18',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: C.gold + '44',
                paddingHorizontal: 16,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Text style={{ fontSize: 20 }}>🏅</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.gold, fontSize: 13, fontWeight: '800' }}>
                  Beta Founding Member — {getPrice(PKG.foundingMemberMonthly)} locked forever
                </Text>
                <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
                  TestFlight only — disappears at launch
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Billing toggle */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={{ paddingHorizontal: 20, marginTop: 16, marginBottom: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: C.surface,
                borderRadius: 12,
                padding: 4,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <Pressable
                testID="billing-monthly-toggle"
                onPress={() => setBillingCycle('monthly')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 9,
                  alignItems: 'center',
                  backgroundColor: billingCycle === 'monthly' ? C.surfaceAlt : 'transparent',
                  borderWidth: billingCycle === 'monthly' ? 1 : 0,
                  borderColor: C.borderLight,
                }}
              >
                <Text style={{ color: billingCycle === 'monthly' ? C.text : C.muted, fontSize: 13, fontWeight: '700' }}>
                  Monthly
                </Text>
              </Pressable>
              <Pressable
                testID="billing-annual-toggle"
                onPress={() => setBillingCycle('annual')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 9,
                  alignItems: 'center',
                  backgroundColor: billingCycle === 'annual' ? C.surfaceAlt : 'transparent',
                  borderWidth: billingCycle === 'annual' ? 1 : 0,
                  borderColor: C.borderLight,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Text style={{ color: billingCycle === 'annual' ? C.text : C.muted, fontSize: 13, fontWeight: '700' }}>
                  Annual
                </Text>
                <View
                  style={{
                    backgroundColor: billingCycle === 'annual' ? C.red : C.border,
                    borderRadius: 6,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ color: billingCycle === 'annual' ? '#FFF' : C.muted, fontSize: 9, fontWeight: '800' }}>
                    SAVE 33%
                  </Text>
                </View>
              </Pressable>
            </View>
          </Animated.View>

          {/* Tier cards — vertical */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={{ paddingHorizontal: 16, marginTop: 8 }}>
            <TierCard
              title="Researcher"
              price={loadingPackages ? '...' : researcherPrice}
              subtitle={getSubtitle(PKG.researcherAnnual, PKG.researcherMonthly)}
              isSelected={selectedTier === 'researcher'}
              badgeColor={C.amber}
              icon={<Zap size={18} color={C.amber} strokeWidth={2} />}
              onSelect={() => setSelectedTier('researcher')}
              features={[
                '25 investigations',
                '200 nodes each',
                'Color tags & labels',
                'Priority support',
              ]}
            />
            <TierCard
              title="Investigator"
              badge="Most Popular"
              price={loadingPackages ? '...' : investigatorPrice}
              subtitle={getSubtitle(PKG.investigatorAnnual, PKG.investigatorMonthly)}
              isSelected={selectedTier === 'investigator'}
              badgeColor={C.red}
              icon={<Star size={18} color={C.red} strokeWidth={2} />}
              onSelect={() => setSelectedTier('investigator')}
              features={[
                'Unlimited investigations',
                'Unlimited nodes',
                'Full collaboration suite',
                'Early feature access',
              ]}
            />
            <TierCard
              title="Professional"
              badge="Outcome-Driven"
              price={loadingPackages ? '...' : professionalPrice}
              subtitle={getSubtitle(PKG.professionalAnnual, PKG.professionalMonthly)}
              isSelected={selectedTier === 'professional'}
              badgeColor={C.gold}
              icon={<Rocket size={18} color={C.gold} strokeWidth={2} />}
              onSelect={() => setSelectedTier('professional')}
              features={[
                'Everything in Investigator',
                'Live streaming',
                'Advanced AI features',
                'Custom export branding',
              ]}
            />

            {/* Lifetime full-width card */}
            <Pressable
              testID="lifetime-purchase-button"
              onPress={handleLifetimePurchase}
              disabled={isPurchasing}
              style={({ pressed }) => ({
                backgroundColor: pressed ? C.surfaceAlt : C.surface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: C.gold + '55',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                marginBottom: 12,
              })}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: C.gold + '22',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <InfinityIcon size={20} color={C.gold} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 15, fontWeight: '800' }}>Lifetime Access</Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>One-time purchase, forever Professional</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: C.gold, fontSize: 18, fontWeight: '900' }}>
                  {loadingPackages ? '...' : getPrice(PKG.lifetimeAccess)}
                </Text>
                <Text style={{ color: C.muted, fontSize: 10 }}>one-time</Text>
              </View>
            </Pressable>
          </Animated.View>

          {/* Error */}
          {errorMessage ? (
            <View style={{ marginHorizontal: 20, marginBottom: 12 }}>
              <Text style={{ color: C.red, fontSize: 13, textAlign: 'center' }}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* CTA button */}
          <Animated.View entering={FadeInDown.delay(400).duration(500)} style={{ marginHorizontal: 20, marginBottom: 16 }}>
            <Pressable
              testID="purchase-button"
              onPress={handlePurchase}
              disabled={isPurchasing || isRestoring || !selectedTier}
              style={({ pressed }) => ({
                backgroundColor: pressed ? C.redDark : C.red,
                borderRadius: 16,
                paddingVertical: 18,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: C.red,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 8,
                opacity: isPurchasing || isRestoring || !selectedTier ? 0.7 : 1,
              })}
            >
              {isPurchasing ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '900', letterSpacing: 0.3 }}>
                    {selectedTier ? `Get ${tierLabel} — ${ctaPrice}` : 'Select a plan'}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }}>
                    {billingCycle === 'annual' ? 'Billed annually · Cancel anytime' : 'Billed monthly · Cancel anytime'}
                  </Text>
                </>
              )}
            </Pressable>
          </Animated.View>

          {/* Restore + legal */}
          <Animated.View entering={FadeInDown.delay(500).duration(500)} style={{ alignItems: 'center', paddingHorizontal: 24 }}>
            <Pressable
              testID="restore-purchases-button"
              onPress={handleRestore}
              disabled={isRestoring || isPurchasing}
            >
              {isRestoring ? (
                <ActivityIndicator color={C.muted} size="small" />
              ) : (
                <Text style={{ color: C.mutedLight, fontSize: 13, textDecorationLine: 'underline' }}>
                  Restore Purchases
                </Text>
              )}
            </Pressable>
            <Text style={{ color: C.muted, fontSize: 11, textAlign: 'center', marginTop: 12, lineHeight: 16 }}>
              Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period. Manage in your device Settings.
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* Success modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', padding: 32 }}
          onPress={handleSuccessDone}
        >
          <Animated.View
            entering={FadeInDown.duration(400).springify()}
            style={{
              backgroundColor: C.surface,
              borderRadius: 24,
              padding: 32,
              alignItems: 'center',
              width: '100%',
              maxWidth: 360,
              borderWidth: 1,
              borderColor: C.borderLight,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: C.red + '22',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}
            >
              <Check size={32} color={C.red} strokeWidth={2.5} />
            </View>
            <Text style={{ color: C.text, fontSize: 22, fontWeight: '900', marginBottom: 8, textAlign: 'center' }}>
              Access Unlocked
            </Text>
            <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 28 }}>
              Your subscription is active. Go unravel the truth.
            </Text>
            <Pressable
              testID="success-done-button"
              onPress={handleSuccessDone}
              style={({ pressed }) => ({
                backgroundColor: pressed ? C.redDark : C.red,
                borderRadius: 12,
                paddingHorizontal: 40,
                paddingVertical: 14,
              })}
            >
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>Start Investigating</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}
