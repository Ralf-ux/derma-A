import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Animated, Easing, Image, ScrollView,
} from 'react-native';
import { Mail, Lock, Eye, EyeOff, CheckCircle, User, Phone, MapPin } from 'lucide-react-native';
import { useApp } from '../AppContext';
import { COLORS } from '../styles';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { supabaseSignIn, supabaseSignUp, fetchProfile, buildAppUser } from '../lib/supabaseAuth';
import logoImg from '../../asserts/appicon for all.png';

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function validatePassword(p: string): string | null {
  for (const rule of PASSWORD_RULES) {
    if (!rule.test(p)) return `Weak password: ${rule.label.toLowerCase()}.`;
  }
  return null;
}

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sex, setSex] = useState<'male' | 'female' | 'other'>('other');
  const [location, setLocation] = useState('');
  const [contact, setContact] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setUser, setActiveScreen } = useApp();

  const canUseSupabase = useMemo(() => isSupabaseConfigured(), []);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(32)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleSubmit = async () => {
    setErrorText(null);
    setSuccessText(null);
    setLoading(true);

    try {
      const e = email.trim().toLowerCase();
      if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error('Invalid email address.');

      if (!isLogin) {
        if (!firstName.trim()) throw new Error('Please enter your first name.');
        if (!lastName.trim()) throw new Error('Please enter your last name.');
        if (!contact.trim()) throw new Error('Please enter a contact number.');
        const pwError = validatePassword(password);
        if (pwError) throw new Error(pwError);
      } else {
        if (!password) throw new Error('Please enter your password.');
      }

      if (!canUseSupabase) throw new Error('Supabase not configured. Check your .env file.');

      if (isLogin) {
        const data = await supabaseSignIn(e, password);
        if (!data.user) throw new Error('Login failed. Check your credentials.');
        // AppContext listens to onAuthStateChange (SIGNED_IN) and will call
        // fetchProfile + setUser + setActiveScreen automatically.
        // No duplicate work needed here.
      } else {
        const data = await supabaseSignUp(e, password, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          sex,
          location: location.trim(),
          contact: contact.trim(),
        });
        if (data.user && !data.session) {
          setSuccessText('Account created! Check your email to confirm your registration.');
        } else if (data.user && data.session) {
          const createdProfile = await fetchProfile(data.user.id).catch(() => null);
          const appUser = buildAppUser(data.user, createdProfile);
          setUser(appUser);
          setActiveScreen(appUser.role === 'admin' ? 'admin' : 'home');
        } else {
          throw new Error('Registration failed. Please try again.');
        }
      }
    } catch (err: any) {
      let msg = err?.message ?? 'Authentication error.';
      if (msg.includes('Invalid login credentials')) msg = 'Incorrect email or password.';
      if (msg.includes('Email not confirmed')) msg = 'Email not confirmed. Check your inbox.';
      if (msg.includes('User already registered')) msg = 'An account already exists with this email.';
      if (msg.includes('Password should be')) msg = 'Password too weak per Supabase rules.';
      setErrorText(msg);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (login: boolean) => {
    setIsLogin(login);
    setErrorText(null);
    setSuccessText(null);
    setPassword('');
  };

  const strength = !isLogin ? PASSWORD_RULES.filter(r => r.test(password)).length : 0;
  const strengthColor = strength <= 1 ? '#ef4444' : strength <= 2 ? '#f59e0b' : strength <= 3 ? '#3b82f6' : '#10b981';

  const SEX_OPTIONS: { value: 'male' | 'female' | 'other'; label: string }[] = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { translateX: shakeAnim }] }]}>

          {/* Logo */}
          <Animated.View style={[styles.logoWrap, { transform: [{ scale: logoScale }] }]}>
            <Image source={typeof logoImg === 'string' ? { uri: logoImg } : logoImg} style={styles.logoImg} resizeMode="contain" />
            <Text style={styles.brandName}>DermaScan</Text>
            <Text style={styles.tagline}>AI-powered skin health analysis</Text>
          </Animated.View>

          {/* Tabs */}
          <View style={styles.tabs}>
            {['Sign In', 'Sign Up'].map((label, i) => {
              const active = isLogin ? i === 0 : i === 1;
              return (
                <TouchableOpacity key={i} onPress={() => switchTab(i === 0)} style={[styles.tab, active && styles.activeTab]} activeOpacity={0.8}>
                  <Text style={[styles.tabText, active && styles.activeTabText]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {!!successText && (
            <View style={styles.successBox}>
              <CheckCircle size={14} color="#059669" />
              <Text style={styles.successText}>{successText}</Text>
            </View>
          )}
          {!!errorText && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorText}</Text>
            </View>
          )}

          <View style={styles.form}>
            {/* Signup-only fields */}
            {!isLogin && (
              <>
                <View style={styles.row2}>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>FIRST NAME</Text>
                    <View style={styles.inputRow}>
                      <User size={15} color="#9ca3af" />
                      <TextInput placeholder="John" placeholderTextColor="#9ca3af" style={styles.input} value={firstName} onChangeText={setFirstName} />
                    </View>
                  </View>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>LAST NAME</Text>
                    <View style={styles.inputRow}>
                      <User size={15} color="#9ca3af" />
                      <TextInput placeholder="Smith" placeholderTextColor="#9ca3af" style={styles.input} value={lastName} onChangeText={setLastName} />
                    </View>
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>SEX</Text>
                  <View style={styles.sexRow}>
                    {SEX_OPTIONS.map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => setSex(opt.value)}
                        style={[styles.sexBtn, sex === opt.value && styles.sexBtnActive]}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.sexBtnText, sex === opt.value && styles.sexBtnTextActive]}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>LOCATION</Text>
                  <View style={styles.inputRow}>
                    <MapPin size={15} color="#9ca3af" />
                    <TextInput placeholder="City, Region" placeholderTextColor="#9ca3af" style={styles.input} value={location} onChangeText={setLocation} />
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>CONTACT (PHONE)</Text>
                  <View style={styles.inputRow}>
                    <Phone size={15} color="#9ca3af" />
                    <TextInput placeholder="+1 (555) 000-0000" placeholderTextColor="#9ca3af" style={styles.input} keyboardType="phone-pad" value={contact} onChangeText={setContact} />
                  </View>
                </View>
              </>
            )}

            {/* Email */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>EMAIL</Text>
              <View style={styles.inputRow}>
                <Mail size={16} color="#9ca3af" />
                <TextInput placeholder="your@email.com" placeholderTextColor="#9ca3af" style={styles.input} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={setEmail} />
              </View>
            </View>

            {/* Password */}
            <View style={styles.field}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>PASSWORD</Text>
                {isLogin && <TouchableOpacity><Text style={styles.forgot}>Forgot?</Text></TouchableOpacity>}
              </View>
              <View style={styles.inputRow}>
                <Lock size={16} color="#9ca3af" />
                <TextInput
                  placeholder={isLogin ? '••••••••' : 'Min. 8 chars, uppercase, number, symbol'}
                  placeholderTextColor="#9ca3af"
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                  {showPassword ? <EyeOff size={16} color="#9ca3af" /> : <Eye size={16} color="#9ca3af" />}
                </TouchableOpacity>
              </View>

              {!isLogin && password.length > 0 && (
                <View style={styles.strengthWrap}>
                  <View style={styles.strengthBar}>
                    {[0, 1, 2, 3].map(i => (
                      <View key={i} style={[styles.strengthSegment, { backgroundColor: i < strength ? strengthColor : '#e5e7eb' }]} />
                    ))}
                  </View>
                  <View style={styles.rulesList}>
                    {PASSWORD_RULES.map((rule, i) => (
                      <View key={i} style={styles.ruleRow}>
                        <View style={[styles.ruleDot, { backgroundColor: rule.test(password) ? '#10b981' : '#d1d5db' }]} />
                        <Text style={[styles.ruleText, rule.test(password) && styles.ruleTextMet]}>{rule.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.btn, (loading || !!successText) && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading || !!successText}
              activeOpacity={0.85}
            >
              {loading ? <LoadingDots /> : (
                <Text style={styles.btnText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function LoadDot({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 300, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[authStyles.loadDot, { opacity: anim }]} />;
}

function LoadingDots() {
  return (
    <View style={authStyles.loadDots}>
      <LoadDot delay={0} /><LoadDot delay={150} /><LoadDot delay={300} />
    </View>
  );
}

const authStyles = StyleSheet.create({
  loadDots: { flexDirection: 'row', gap: 6 },
  loadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 36,
    padding: 28,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  logoWrap: { alignItems: 'center', marginBottom: 24 },
  logoImg: { width: 100, height: 100, marginBottom: 10, borderRadius: 24 },
  brandName: { fontSize: 26, fontWeight: '900', color: COLORS.primary, letterSpacing: -0.5 },
  tagline: { fontSize: 12, color: '#9ca3af', marginTop: 4, letterSpacing: 0.2 },
  tabs: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 99, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 99 },
  activeTab: { backgroundColor: COLORS.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '700', color: '#9ca3af' },
  activeTabText: { color: COLORS.primary },
  successBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(16,185,129,0.07)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)', borderRadius: 14, padding: 12, marginBottom: 16 },
  successText: { flex: 1, color: '#065f46', fontSize: 12, fontWeight: '600', lineHeight: 18 },
  errorBox: { backgroundColor: 'rgba(239,68,68,0.07)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', borderRadius: 14, padding: 12, marginBottom: 16 },
  errorText: { color: '#b91c1c', fontSize: 12, fontWeight: '600' },
  form: { gap: 16 },
  row2: { flexDirection: 'row', gap: 10 },
  field: { gap: 7 },
  fieldLabel: { fontSize: 9, fontWeight: '800', color: '#9ca3af', letterSpacing: 1.2 },
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  forgot: { fontSize: 11, fontWeight: '700', color: COLORS.primaryLight },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f9fafb', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(0,77,64,0.06)' },
  input: { flex: 1, paddingVertical: 14, fontSize: 14, color: COLORS.text },
  eyeBtn: { padding: 4 },
  sexRow: { flexDirection: 'row', gap: 8 },
  sexBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: 'transparent' },
  sexBtnActive: { backgroundColor: 'rgba(0,77,64,0.08)', borderColor: COLORS.primary },
  sexBtnText: { fontSize: 13, fontWeight: '600', color: '#9ca3af' },
  sexBtnTextActive: { color: COLORS.primary },
  strengthWrap: { marginTop: 8, gap: 8 },
  strengthBar: { flexDirection: 'row', gap: 4 },
  strengthSegment: { flex: 1, height: 3, borderRadius: 2 },
  rulesList: { gap: 4 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ruleDot: { width: 5, height: 5, borderRadius: 3 },
  ruleText: { fontSize: 11, color: '#9ca3af' },
  ruleTextMet: { color: '#10b981' },
  btn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4 },
  btnDisabled: { opacity: 0.55 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
