import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Copy, ClipboardList, CheckCheck } from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

const COLORS = {
  background: '#1A1614',
  surface: '#231F1C',
  card: '#2A2320',
  red: '#C41E3A',
  pin: '#D4A574',
  textLight: '#F5ECD7',
  muted: '#6B5B4F',
  border: '#3D332C',
  accent: '#8B6A4F',
  success: '#4A7C59',
} as const;

const PROMPTS: { id: number; text: string }[] = [
  {
    id: 1,
    text: 'Build unified Visual Investigation Canvas — single canvas combining node-based web structure, red string connections between nodes, and corkboard aesthetic. Not separate graph and corkboard modes.',
  },
  {
    id: 2,
    text: "Can u try the last prompt again i think you got stuck",
  },
  {
    id: 3,
    text: "What is the payment structure and pricing? How do i test it and what are my financial responsibilities for publishing, operation and maintenance of the app?",
  },
  {
    id: 4,
    text: "I don't have any other associated costs? When do i receive payment when someone subscribes? How does that work? Id like to increase the cost a bit… but i want to stay competitive… im curious as to how that works",
  },
  {
    id: 5,
    text: "Yes, please provide me a detailed list of features with a short description of each followed by a list of any suggestions to improve the apps functionality, visual appeal, ease of use for user. I want it ALL",
  },
  {
    id: 6,
    text: "I love every single feature you listed!!!!! I'm so hype! Yes to ALL of it! Is this really possible!? Wow. I love the ai being able to do deep research for and with the user, i want the ai to sound natural…",
  },
  {
    id: 7,
    text: "WOW. Yesss to ALL of it! Broadcasting in app!? Could it be broadcast via youtube even though i'm in app?! The interactive ai board that zooms to the info for me in real time? I'm literally speechless…",
  },
  {
    id: 8,
    text: "I like the idea of there being suggestions for color coding as you suggested",
  },
  {
    id: 9,
    text: "Any info i pull into my investigation, i'd like to ensure credit is given to wherever i got it from. So a website, an X user, etc… id like each investigation to have a running log of sources for everything",
  },
  {
    id: 10,
    text: "Can u make a video demo (tutorial) to use for marketing and promotion and to demonstrate ALL the features of red string",
  },
  {
    id: 11,
    text: "Go max! Do both video tour first please!!!!",
  },
  {
    id: 12,
    text: "Please go back to unfinished tasks, finish them and test the app in its entirety to confirm whether or not each link, sign in, feature aspect etc is fully and properly operational and functioning as intended",
  },
  {
    id: 13,
    text: "What is the error",
  },
  {
    id: 14,
    text: "Nevermind just send me the onboarding video please if u can lol",
  },
  {
    id: 15,
    text: "I went to sign up and the code couldn't be sent please fix it that doesn't make me feel good about the app if the first thing is signing up and it's not working 😭",
  },
  {
    id: 16,
    text: "Can u run all other aspects and components and test them to ensure everything is working properly with no issues like this?",
  },
  {
    id: 17,
    text: "Make login with a phone number not email is that possible",
  },
  {
    id: 18,
    text: "Test each edit after to ensure proper functioning",
  },
  {
    id: 19,
    text: "@logs",
  },
  {
    id: 20,
    text: "I don't see anything in the logs resembling a numerical code",
  },
  {
    id: 21,
    text: "Failed to send code message upon entering my phone number. I want to cry bc if this is this problematic JUST signing in, there's likely a ton more issues with the app itself and i was so excited",
  },
  {
    id: 22,
    text: "Still no code in logs or received",
  },
  {
    id: 23,
    text: "I want you to create a video that showcases the app and its features",
  },
  {
    id: 24,
    text: "I don't have a video",
  },
  {
    id: 25,
    text: "What was the original function of the question mark? I was reporting two separate issues — the video and the question mark were unrelated so im confused",
  },
  {
    id: 26,
    text: "Ok and to my understanding, i was asking for a video showcasing the app and there was supposed to be a demo mode and a virtual onboarding video demo for marketing or promo no?",
  },
  {
    id: 27,
    text: "I need to run through it and test it out… podcast features, live features and whatnot",
  },
  {
    id: 28,
    text: "Anything that is clicked on should be able to be dragged to the trash like a folder or node… any info should be able to be undone or deleted etc",
  },
  {
    id: 29,
    text: "Where is the area for the social sign in for bookmark imports, the podcast area for live, scripts, the ai chat and voice area for research… many things are missing no?",
  },
  {
    id: 30,
    text: "I want all of them done",
  },
  {
    id: 31,
    text: "Hmm idk what instapaper is, i didn't say anything about tracking other podcasts but we can leave it… i don't want simulation i want interactive ai conversation thru text and voice with the model…",
  },
  {
    id: 32,
    text: "How do i add what's missing and needs to be added externally",
  },
  {
    id: 33,
    text: "Ok",
  },
  {
    id: 34,
    text: "GOOGLE-GEMINI GPT-5-MINI GPT-5 NANO-BANANA IDEOGRAM-3 ELEVENLABS-TTS ELEVENLABS-SPEECH-TO-SPEECH GPT-4O-TRANSCRIBE ANTHROPIC-AGENT-SDK SORA-2 ELEVENLABS-TTS ELEVENLABS-SPEECH-TO-SPEECH GPT-4O-TRANSCRIBE (list of AI APIs requested to be integrated)",
  },
  {
    id: 35,
    text: "Can user talk to ai using the mic and ai talk back?",
  },
  {
    id: 36,
    text: "Yes! Plz test all features and fill me in on what's next",
  },
  {
    id: 37,
    text: "1-no 2-yes 3-where can i hear them to see what i like? What about the live streaming and podcast scripting and ai screen controlled by voice thing u mentioned a while back?",
  },
  {
    id: 38,
    text: "All of it baby!",
  },
  {
    id: 39,
    text: "Ok can u provide me a detailed description broken down into an easy to read paragraph format of all features",
  },
  {
    id: 40,
    text: "None of the links in live feed work",
  },
  {
    id: 41,
    text: "I gave the ai the info to research and it appears it can't access the internet or research anything externally",
  },
  {
    id: 42,
    text: "Please fix the following errors: Cannot read property 'length' of undefined (codeFrame error in investigations store)",
  },
  {
    id: 43,
    text: "Cannot add anything to timeline, can only seem to create it, and the beginning date isn't accurately reflected on the timeline",
  },
  {
    id: 44,
    text: "The string feature isn't working and the automations aren't either",
  },
  {
    id: 45,
    text: "There is no string, when i go to pinch two nodes nothing happens, none of the automations we discussed pertaining to any new information that is input is in place",
  },
  {
    id: 46,
    text: "What about the ai helping debunk or verify the info input",
  },
  {
    id: 47,
    text: "The red string is not functioning",
  },
  {
    id: 48,
    text: "i'd like a copy of every prompt i've given from the beginning of this apps creation so i can decide what i'd like to change, what needs to be fixed, what's working correctly etc and the entire history isn't accessible for me",
  },
  {
    id: 49,
    text: "i can't see the suggestions you made or my initial prompts that first kicked off the app concept",
  },
  {
    id: 50,
    text: "how can i copy this?",
  },
];

function buildAllPromptsText(): string {
  return PROMPTS.map((p) => `[${p.id}] ${p.text}`).join('\n\n');
}

function PromptCard({
  prompt,
  index,
}: {
  prompt: { id: number; text: string };
  index: number;
}) {
  const [copied, setCopied] = useState<boolean>(false);
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleCopy = useCallback(() => {
    Clipboard.setString(prompt.text);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSequence(
      withTiming(0.95, { duration: 80 }),
      withTiming(1, { duration: 120 })
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [prompt.text, scale]);

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 30).duration(300).springify()}
      style={[
        {
          marginHorizontal: 16,
          marginBottom: 12,
          backgroundColor: COLORS.card,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: COLORS.border,
          overflow: 'hidden',
        },
      ]}
      testID={`prompt-card-${prompt.id}`}
    >
      {/* Number strip */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingTop: 12,
          paddingBottom: 8,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
          gap: 8,
        }}
      >
        <View
          style={{
            backgroundColor: 'rgba(196,30,58,0.15)',
            borderRadius: 6,
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderWidth: 1,
            borderColor: 'rgba(196,30,58,0.3)',
          }}
        >
          <Text
            style={{
              color: COLORS.red,
              fontSize: 11,
              fontWeight: '800',
              letterSpacing: 0.5,
            }}
          >
            #{prompt.id}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        <Animated.View style={animStyle}>
          <Pressable
            testID={`copy-prompt-${prompt.id}`}
            onPress={handleCopy}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 8,
              backgroundColor: copied
                ? 'rgba(74,124,89,0.2)'
                : pressed
                ? 'rgba(212,165,116,0.2)'
                : 'rgba(212,165,116,0.1)',
              borderWidth: 1,
              borderColor: copied
                ? 'rgba(74,124,89,0.4)'
                : 'rgba(212,165,116,0.3)',
            })}
          >
            {copied ? (
              <CheckCheck size={12} color="#4A7C59" strokeWidth={2.5} />
            ) : (
              <Copy size={12} color={COLORS.pin} strokeWidth={2.5} />
            )}
            <Text
              style={{
                color: copied ? '#4A7C59' : COLORS.pin,
                fontSize: 11,
                fontWeight: '700',
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </Text>
          </Pressable>
        </Animated.View>
      </View>

      {/* Prompt text */}
      <View style={{ padding: 14 }}>
        <Text
          style={{
            color: COLORS.textLight,
            fontSize: 14,
            lineHeight: 22,
            letterSpacing: 0.1,
          }}
          selectable
        >
          {prompt.text}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function PromptHistoryScreen() {
  const router = useRouter();
  const [allCopied, setAllCopied] = useState<boolean>(false);

  const handleCopyAll = useCallback(() => {
    Clipboard.setString(buildAllPromptsText());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2500);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }} testID="prompt-history-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 6,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
            gap: 12,
          }}
        >
          <Pressable
            testID="back-button"
            onPress={() => router.back()}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: pressed ? COLORS.border : COLORS.surface,
              borderWidth: 1,
              borderColor: COLORS.border,
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            <ArrowLeft size={18} color={COLORS.textLight} strokeWidth={2} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: COLORS.textLight,
                fontSize: 18,
                fontWeight: '800',
                letterSpacing: 0.3,
              }}
            >
              Prompt History
            </Text>
            <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 1 }}>
              {PROMPTS.length} prompts from app creation
            </Text>
          </View>

          {/* Copy All button */}
          <Pressable
            testID="copy-all-button"
            onPress={handleCopyAll}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: allCopied
                ? 'rgba(74,124,89,0.2)'
                : pressed
                ? 'rgba(196,30,58,0.2)'
                : 'rgba(196,30,58,0.12)',
              borderWidth: 1,
              borderColor: allCopied
                ? 'rgba(74,124,89,0.4)'
                : 'rgba(196,30,58,0.35)',
            })}
          >
            {allCopied ? (
              <CheckCheck size={14} color="#4A7C59" strokeWidth={2.5} />
            ) : (
              <ClipboardList size={14} color={COLORS.red} strokeWidth={2} />
            )}
            <Text
              style={{
                color: allCopied ? '#4A7C59' : COLORS.red,
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              {allCopied ? 'Copied!' : 'Copy All'}
            </Text>
          </Pressable>
        </View>

        {/* Intro banner */}
        <Animated.View
          entering={FadeInDown.duration(400).springify()}
          style={{
            marginHorizontal: 16,
            marginTop: 14,
            marginBottom: 16,
            backgroundColor: 'rgba(196,30,58,0.08)',
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: 'rgba(196,30,58,0.2)',
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <ClipboardList size={18} color={COLORS.red} strokeWidth={2} style={{ marginTop: 1 }} />
          <Text style={{ color: COLORS.muted, fontSize: 13, lineHeight: 20, flex: 1 }}>
            Every prompt you gave during the creation of Red String, in chronological order. Tap{' '}
            <Text style={{ color: COLORS.pin, fontWeight: '600' }}>Copy</Text> on any card to copy
            it, or use{' '}
            <Text style={{ color: COLORS.red, fontWeight: '600' }}>Copy All</Text> above to grab the
            full history at once.
          </Text>
        </Animated.View>

        {/* Prompt list */}
        <ScrollView
          testID="prompt-list"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {PROMPTS.map((prompt, index) => (
            <PromptCard key={prompt.id} prompt={prompt} index={index} />
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
