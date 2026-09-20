import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../ui/tokens/colors';
import { typography } from '../../ui/tokens/typography';
import { ActiveButton } from '../../ui/atoms/ActiveButton';
import { Icon } from '../../ui/atoms/Icon';
import { StageCrest } from '../../ui/atoms/roadmap/StageCrest';
import { Alert } from '../../ui/molecules/Alert';
import { TextField } from './TextField';
import { useLoginFlow, type Provider } from './useLoginFlow';

const PROVIDER_LABEL: Record<Provider, string> = {
  google: 'Continue with Google',
  linkedin: 'Continue with LinkedIn',
  org: 'Sign in with your organization',
};

function GhostLink({ label, onPress, compact = false }: { label: string; onPress: () => void; compact?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} style={compact ? tw`items-start` : tw`items-center py-3`}>
      <Text
        style={{
          fontFamily: typography.fontFamily['jakarta-bold'],
          color: colors.action.ghost,
          ...(compact ? typography.fontSize['type-12'] : typography.fontSize['type-14-base']),
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Footer() {
  return (
    <Text style={[tw`text-center mt-4`, { fontFamily: typography.fontFamily.jakarta, color: colors.eyebrow.ink, ...typography.fontSize['type-12-base'] }]}>
      By continuing, you agree to our{' '}
      <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: colors.path.linkInk, ...typography.fontSize['type-13-alt'] }}>Terms</Text>
      {' '}and{' '}
      <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: colors.path.linkInk, ...typography.fontSize['type-13-alt'] }}>Privacy Policy</Text>.
    </Text>
  );
}

export default function LoginScreen() {
  const flow = useLoginFlow();

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.surface.canvas }]}>
      <ScrollView contentContainerStyle={tw`px-5 pt-9 pb-8`} keyboardShouldPersistTaps="handled">
        <View style={tw`flex-row items-center gap-2 mb-8`}>
          <View
            style={[
              tw`items-center justify-center rounded-xl`,
              { width: 39, height: 42, backgroundColor: colors.hero.brandMark.surface },
            ]}
          >
            <Text style={{ fontFamily: typography.fontFamily['jakarta-extrabold'], color: colors.text.primary, ...typography.fontSize['type-25-alt'] }}>Λ</Text>
          </View>
          <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: colors.text.primary, ...typography.fontSize['type-15'] }}>AI Launchpad</Text>
        </View>

        <Text style={[tw`mb-1`, { fontFamily: typography.fontFamily['jakarta-bold'], color: colors.eyebrow.ink, ...typography.fontSize['type-11-tracked'] }]}>
          A LITTLE LEARNING. A LOT OF POSSIBILITY.
        </Text>
        <Text style={[tw`mb-2`, { fontFamily: typography.fontFamily['jakarta-extrabold'], color: colors.text.primary, ...typography.fontSize['type-31'] }]}>
          Make room for what's next.
        </Text>
        <Text style={[tw`mb-7`, { fontFamily: typography.fontFamily.jakarta, color: colors.text.body, ...typography.fontSize['type-15-alt'] }]}>
          Practical AI, one useful step at a time.
        </Text>

        <View style={tw`mb-7`}>
          <StageCrest tone="plum" icon="layers" size="xl" />
        </View>

        {flow.step === 'choice' ? (
          <View style={tw`gap-3`}>
            {flow.erroredProvider && (
              <Alert tone="warning" message="We couldn't finish signing you in. Please try again." />
            )}
            {(['google', 'linkedin'] as const).map((provider) => (
              <ActiveButton
                key={provider}
                variant="secondary"
                label={flow.connectingProvider === provider ? 'Connecting…' : PROVIDER_LABEL[provider]}
                disabled={flow.connectingProvider === provider}
                onPress={() => flow.onContinueWithProvider(provider)}
              />
            ))}
            <GhostLink label="Use your email instead" onPress={flow.onUseEmailInstead} />
            <View style={[tw`w-full`, { height: 1, backgroundColor: colors.path.stage.locked.base }]} />
            <ActiveButton
              variant="secondary"
              label={flow.connectingProvider === 'org' ? 'Connecting…' : PROVIDER_LABEL.org}
              disabled={flow.connectingProvider === 'org'}
              icon={<Icon name="building" color={colors.path.btnSecondary.ink} size={18} />}
              onPress={() => flow.onContinueWithProvider('org')}
            />
            <Footer />
          </View>
        ) : (
          <View style={tw`gap-4`}>
            <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: colors.text.primary, ...typography.fontSize['type-20-alt'] }}>
              Welcome back.
            </Text>
            <TextField
              label="Email address"
              placeholder="you@example.com"
              value={flow.email}
              onChangeText={flow.onChangeEmail}
              error={flow.emailError}
              keyboardType="email-address"
            />
            {flow.showPasswordField && (
              <TextField
                label="Password"
                value={flow.password}
                onChangeText={flow.onChangePassword}
                error={flow.passwordError}
                secureTextEntry
              />
            )}
            <GhostLink label="Test creds" onPress={flow.onFillTestCreds} compact />
            <View
              style={{
                shadowColor: colors.action.primaryShadow,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 1,
                shadowRadius: 0,
                elevation: 3,
              }}
            >
              <ActiveButton
                variant="primary"
                label={flow.ctaLabel}
                icon={<Icon name="arrow" color={colors.surface.white} size={18} />}
                onPress={flow.onSubmit}
              />
            </View>
            <GhostLink label="Other sign-in options" onPress={flow.onBackToChoice} />
            <Footer />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
