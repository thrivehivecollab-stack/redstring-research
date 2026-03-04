import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { X, Check, Star, Zap, Infinity as InfinityIcon, Crown } from 'lucide-react-native';
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
  bg: '#1A1614',
  surface: '#231F1C',
  surfaceAlt: '#2C2521',
  card: '#F5ECD7',
  cardDark: '#EDE0C4',
  red: '#C41E3A',
  redDark: '#A3162E',
  redGlow: 'rgba(196, 30, 58, 0.2)',
  pin: '#D4A574',
  amber: '#D4A574',
  text: '#E8DCC8',
  muted: '#6B5B4F',
  mutedLight: '#8B7B6F',
  border: '#3D332C',
  borderLight: '#4D3F38',
  gold: '#F0C060',
  proGlow: 'rgba(212, 165, 116, 0.15)',
} as const;

type BillingCycle = 'monthly' | 'annual';

// Package identifiers
const PKG = {
  proMonthly: '$rc_monthly',
  proAnnual: '$rc_annual',
  plusMonthly: '$rc_custom_plus_monthly',
  plusAnnual: '$rc_custom_plus_annual',
  lifetime: '$rc_lifetime',
} as const;

// Pricing fallbacks (shown if RevenueCat unavailable)
const PRICE_FALLBACK: Record<string, string> = {
  [PKG.proMonthly]: '$4.99/mo',
  [PKG.proAnnual]: '$39.99/yr',
  [PKG.plusMonthly]: '$9.99/mo',
  [PKG.plusAnnual]: '$79.99/yr',
  [PKG.lifetime]: '$99.99',
};

// ---- Animated red string decoration ----
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

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        animStyle,
        { position: 'absolute', top: 0, left: 0, right: 0, height: 120, pointerEvents: 'none' as const },
      ]}
    >
      <Svg width="100%" height="120" viewBox="0 0 400 120">
        {/* String from left to right connecting the tier dots */}
        <Line x1="60" y1="70" x2="200" y2="45" stroke={C.red} strokeWidth="1.5" opacity="0.8" />
        <Line x1="200" y1="45" x2="340" y2="70" stroke={C.red} strokeWidth="1.5" opacity="0.8" />
        {/* Pin dots */}
        <SvgCircle cx="60" cy="70" r="4" fill={C.pin} opacity="0.9" />
        <SvgCircle cx="200" cy="45" r="4" fill={C.red} opacity="0.9" />
        <SvgCircle cx="340" cy="70" r="4" fill={C.pin} opacity="0.9" />
        {/* Small detail strings */}
        <Line x1="60" y1="70" x2="40" y2="100" stroke={C.red} strokeWidth="1" opacity="0.4" />
        <Line x1="340" y1="70" x2="360" y2="100" stroke={C.red} strokeWidth="1" opacity="0.4" />
      </Svg>
    </Animated.View>
  );
}

// ---- Feature row ----
function FeatureRow({ label, free, pro, plus }: { label: string; free: string | boolean; pro: string | boolean; plus: string | boolean }) {
  const renderCell = (val: string | boolean) => {
    if (val === true) return <Check size={16} color={C.red} strokeWidth={2.5} />;
    if (val === false) return <Text style={{ color: C.muted, fontSize: 14 }}>—</Text>;
    return <Text style={{ color: C.text, fontSize: 12, fontWeight: '600', textAlign: 'center' }}>{val}</Text>;
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
      }}
    >
      <Text style={{ color: C.mutedLight, fontSize: 12, flex: 3 }}>{label}</Text>
      <View style={{ flex: 1, alignItems: 'center' }}>{renderCell(free)}</View>
      <View style={{ flex: 1, alignItems: 'center' }}>{renderCell(pro)}</View>
      <View style={{ flex: 1, alignItems: 'center' }}>{renderCell(plus)}</View>
    </View>
  );
}

// ---- Tier card ----
function TierCard({
  title,
  subtitle,
  price,
  isPopular,
  isSelected,
  features,
  onSelect,
  badgeColor,
  icon,
}: {
  title: string;
  subtitle: string;
  price: string;
  isPopular?: boolean;
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
    <Animated.View style={animStyle}>
      <Pressable
        onPress={handlePress}
        testID={`tier-card-${title.toLowerCase()}`}
        style={{
          flex: 1,
          backgroundColor: isSelected ? C.surfaceAlt : C.surface,
          borderRadius: 16,
          padding: 16,
          borderWidth: isSelected ? 2 : 1,
          borderColor: isSelected ? badgeColor : C.border,
          shadowColor: isSelected ? badgeColor : 'transparent',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isSelected ? 0.3 : 0,
          shadowRadius: 12,
          elevation: isSelected ? 8 : 2,
          position: 'relative',
          overflow: 'visible',
        }}
      >
        {/* Most Popular badge */}
        {isPopular ? (
          <View
            style={{
              position: 'absolute',
              top: -12,
              alignSelf: 'center',
              backgroundColor: C.red,
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 4,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              shadowColor: C.red,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.4,
              shadowRadius: 6,
              elevation: 4,
              zIndex: 10,
            }}
          >
            <Star size={10} color="#FFF" strokeWidth={2.5} fill="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>
              MOST POPULAR
            </Text>
          </View>
        ) : null}

        {/* Icon + title */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: isPopular ? 8 : 0, marginBottom: 8 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: badgeColor + '22',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontSize: 15, fontWeight: '800' }}>{title}</Text>
          </View>
        </View>

        {/* Price */}
        <Text style={{ color: badgeColor, fontSize: 20, fontWeight: '900', marginBottom: 2 }}>
          {price}
        </Text>
        <Text style={{ color: C.muted, fontSize: 11, marginBottom: 12 }}>{subtitle}</Text>

        {/* Features */}
        {features.map((f) => (
          <View key={f} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 5 }}>
            <Check size={12} color={badgeColor} strokeWidth={2.5} style={{ marginTop: 1 }} />
            <Text style={{ color: C.mutedLight, fontSize: 11, flex: 1, lineHeight: 16 }}>{f}</Text>
          </View>
        ))}

        {/* Selected indicator */}
        {isSelected ? (
          <View
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: badgeColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check size={11} color="#FFF" strokeWidth={3} />
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
  const [selectedTier, setSelectedTier] = useState<'pro' | 'plus'>('pro');
  const [packages, setPackages] = useState<Record<string, PurchasesPackage>>({});
  const [isPurchasing, setIsPurchasing] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [loadingPackages, setLoadingPackages] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load packages
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

  // Get display price for a package id
  const getPrice = useCallback((pkgId: string): string => {
    const pkg = packages[pkgId];
    if (pkg) return pkg.product.priceString;
    return PRICE_FALLBACK[pkgId] ?? '—';
  }, [packages]);

  // Get price per month for annual (for savings display)
  const getAnnualMonthlyEquiv = useCallback((annualPkgId: string, monthlyPkgId: string): string => {
    const annualPkg = packages[annualPkgId];
    const monthlyPkg = packages[monthlyPkgId];
    if (annualPkg && monthlyPkg) {
      const annualMonthly = annualPkg.product.price / 12;
      const monthly = monthlyPkg.product.price;
      const savings = Math.round(((monthly - annualMonthly) / monthly) * 100);
      return `Save ${savings}%`;
    }
    return 'Save 33%';
  }, [packages]);

  // Determine which package to purchase
  const getSelectedPackageId = useCallback((): string => {
    if (selectedTier === 'pro') {
      return billingCycle === 'annual' ? PKG.proAnnual : PKG.proMonthly;
    }
    return billingCycle === 'annual' ? PKG.plusAnnual : PKG.plusMonthly;
  }, [selectedTier, billingCycle]);

  // Current price display
  const currentProPrice = billingCycle === 'annual' ? getPrice(PKG.proAnnual) : getPrice(PKG.proMonthly);
  const currentPlusPrice = billingCycle === 'annual' ? getPrice(PKG.plusAnnual) : getPrice(PKG.plusMonthly);
  const proSubtitle = billingCycle === 'annual'
    ? `${getAnnualMonthlyEquiv(PKG.proAnnual, PKG.proMonthly)} vs monthly`
    : 'billed monthly';
  const plusSubtitle = billingCycle === 'annual'
    ? `${getAnnualMonthlyEquiv(PKG.plusAnnual, PKG.plusMonthly)} vs monthly`
    : 'billed monthly';

  const handlePurchase = useCallback(async () => {
    const pkgId = getSelectedPackageId();
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
    } else if (result.reason === 'sdk_error') {
      // User likely cancelled — don't show error
    } else {
      setErrorMessage('Purchase unavailable right now. Please try again.');
    }
  }, [getSelectedPackageId, packages, checkSubscription]);

  const handleLifetimePurchase = useCallback(async () => {
    const pkg = packages[PKG.lifetime];
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

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handleSuccessDone = useCallback(() => {
    setShowSuccessModal(false);
    router.back();
  }, [router]);

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

        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={FadeIn.duration(600)} style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}>
            {/* String decoration above header */}
            <View style={{ height: 120, position: 'relative', marginBottom: 0 }}>
              <StringDecoration />
              {/* Header text centered */}
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
            <Text
              style={{
                color: C.text,
                fontSize: 28,
                fontWeight: '900',
                textAlign: 'center',
                letterSpacing: -0.5,
                marginBottom: 6,
              }}
            >
              Follow Every Thread
            </Text>
            <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
              Upgrade to unravel deeper conspiracies with more investigations and nodes.
            </Text>
          </Animated.View>

          {/* Billing toggle */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={{ paddingHorizontal: 24, marginBottom: 20 }}>
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
                {billingCycle === 'annual' ? (
                  <View
                    style={{
                      backgroundColor: C.red,
                      borderRadius: 6,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '800' }}>SAVE 33%</Text>
                  </View>
                ) : (
                  <View
                    style={{
                      backgroundColor: C.border,
                      borderRadius: 6,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ color: C.muted, fontSize: 9, fontWeight: '800' }}>SAVE 33%</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </Animated.View>

          {/* Tier cards */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={{ paddingHorizontal: 16, flexDirection: 'row', gap: 12, marginBottom: 24 }}>
            <TierCard
              title="Pro"
              subtitle={proSubtitle}
              price={loadingPackages ? '...' : currentProPrice}
              isPopular
              isSelected={selectedTier === 'pro'}
              badgeColor={C.amber}
              icon={<Zap size={16} color={C.amber} strokeWidth={2} />}
              onSelect={() => setSelectedTier('pro')}
              features={[
                '25 investigations',
                '200 nodes each',
                'Color tags & labels',
                'Priority support',
              ]}
            />
            <TierCard
              title="Plus"
              subtitle={plusSubtitle}
              price={loadingPackages ? '...' : currentPlusPrice}
              isSelected={selectedTier === 'plus'}
              badgeColor={C.gold}
              icon={<Crown size={16} color={C.gold} strokeWidth={2} />}
              onSelect={() => setSelectedTier('plus')}
              features={[
                'Unlimited investigations',
                'Unlimited nodes',
                'Early feature access',
                'Everything in Pro',
              ]}
            />
          </Animated.View>

          {/* Feature comparison table */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(500)}
            style={{
              marginHorizontal: 20,
              backgroundColor: C.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: C.border,
              marginBottom: 20,
            }}
          >
            <Text style={{ color: C.text, fontSize: 13, fontWeight: '800', marginBottom: 12, letterSpacing: 0.5 }}>
              FEATURE COMPARISON
            </Text>
            {/* Column headers */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: C.muted, fontSize: 11, flex: 3 }}>Feature</Text>
              <Text style={{ color: C.muted, fontSize: 11, flex: 1, textAlign: 'center' }}>Free</Text>
              <Text style={{ color: C.amber, fontSize: 11, flex: 1, textAlign: 'center', fontWeight: '700' }}>Pro</Text>
              <Text style={{ color: C.gold, fontSize: 11, flex: 1, textAlign: 'center', fontWeight: '700' }}>Plus</Text>
            </View>
            <FeatureRow label="Investigations" free="3" pro="25" plus="∞" />
            <FeatureRow label="Nodes per case" free="25" pro="200" plus="∞" />
            <FeatureRow label="All node types" free={true} pro={true} plus={true} />
            <FeatureRow label="Red string connections" free={true} pro={true} plus={true} />
            <FeatureRow label="Color tags" free={false} pro={true} plus={true} />
            <FeatureRow label="Priority support" free={false} pro={true} plus={true} />
            <FeatureRow label="Early access" free={false} pro={false} plus={true} />
          </Animated.View>

          {/* Lifetime option */}
          <Animated.View entering={FadeInDown.delay(400).duration(500)} style={{ marginHorizontal: 20, marginBottom: 20 }}>
            <Pressable
              testID="lifetime-purchase-button"
              onPress={handleLifetimePurchase}
              disabled={isPurchasing}
              style={({ pressed }) => ({
                backgroundColor: pressed ? C.surfaceAlt : C.surface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: C.gold + '66',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
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
                <Text style={{ color: C.muted, fontSize: 12 }}>One-time purchase, forever Plus</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: C.gold, fontSize: 18, fontWeight: '900' }}>
                  {loadingPackages ? '...' : getPrice(PKG.lifetime)}
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
          <Animated.View entering={FadeInDown.delay(500).duration(500)} style={{ marginHorizontal: 20, marginBottom: 16 }}>
            <Pressable
              testID="purchase-button"
              onPress={handlePurchase}
              disabled={isPurchasing || isRestoring}
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
                opacity: isPurchasing || isRestoring ? 0.7 : 1,
              })}
            >
              {isPurchasing ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '900', letterSpacing: 0.3 }}>
                    Get {selectedTier === 'pro' ? 'Pro' : 'Plus'} —{' '}
                    {billingCycle === 'annual' ? getPrice(selectedTier === 'pro' ? PKG.proAnnual : PKG.plusAnnual) : getPrice(selectedTier === 'pro' ? PKG.proMonthly : PKG.plusMonthly)}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }}>
                    {billingCycle === 'annual' ? 'Billed annually · Cancel anytime' : 'Billed monthly · Cancel anytime'}
                  </Text>
                </>
              )}
            </Pressable>
          </Animated.View>

          {/* Restore + legal */}
          <Animated.View entering={FadeInDown.delay(600).duration(500)} style={{ alignItems: 'center', paddingHorizontal: 24 }}>
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
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.8)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
          }}
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
