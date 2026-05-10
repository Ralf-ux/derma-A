import React, { useMemo, useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  Image
} from 'react-native';
import { Mail, Lock, ShieldCheck, Globe } from 'lucide-react';
import { useApp } from '../AppContext';
import { COLORS } from '../styles';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { supabaseSignIn, supabaseSignUp } from '../lib/supabaseAuth';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setUser, setActiveScreen } = useApp();

  const canUseSupabase = useMemo(() => isSupabaseConfigured(), []);

  const handleSubmit = async () => {
    setErrorText(null);
    setLoading(true);
    try {
      if (canUseSupabase) {
        const e = email.trim();
        const p = password;
        if (!e || !e.includes('@')) throw new Error('Enter a valid email.');
        if (p.length < 6) throw new Error('Password must be at least 6 characters.');

        const data = isLogin
          ? await supabaseSignIn(e, p)
          : await supabaseSignUp(e, p);

        const supaUser = data.user;
        if (!supaUser) {
          throw new Error(
            isLogin
              ? 'Login failed. Please try again.'
              : 'Sign up succeeded but no user returned.',
          );
        }

        setUser({
          id: supaUser.id,
          name: supaUser.email?.split('@')[0] ?? 'User',
          email: supaUser.email ?? e,
          role: 'patient',
          biometricEnabled: false,
        });
        setActiveScreen('home');
        return;
      }

      // Fallback demo mode (no Supabase configured)
      setUser({
        id: '123',
        name: 'Dr. Sarah Smith',
        email: 'sarah@derma.com',
        role: 'doctor',
        biometricEnabled: true,
      });
      setActiveScreen('home');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Authentication failed. Try again.';
      setErrorText(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <ShieldCheck color={COLORS.primary} size={32} />
          </View>
          <Text style={styles.title}>Bienvenue sur Derma</Text>
          <Text style={styles.subtitle}>Santé de la peau de précision pour tous.</Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity 
            onPress={() => setIsLogin(true)}
            style={[styles.tab, isLogin && styles.activeTab]}
          >
            <Text style={[styles.tabText, isLogin && styles.activeTabText]}>Se connecter</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setIsLogin(false)}
            style={[styles.tab, !isLogin && styles.activeTab]}
          >
            <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>S'inscrire</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {!!errorText && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorText}</Text>
            </View>
          )}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>ADRESSE EMAIL</Text>
            <View style={styles.inputWrapper}>
              <Mail size={18} color="#9ca3af" style={styles.inputIcon} />
              <TextInput 
                placeholder="votre@email.com"
                placeholderTextColor="#9ca3af"
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>MOT DE PASSE</Text>
              <TouchableOpacity>
                <Text style={styles.forgotText}>Oublié ?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputWrapper}>
              <Lock size={18} color="#9ca3af" style={styles.inputIcon} />
              <TextInput 
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                style={styles.input}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? '...' : isLogin ? 'Se connecter' : 'Créer un compte'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>OU CONTINUER AVEC</Text>
          <View style={styles.line} />
        </View>

        <View style={styles.socialGrid}>
          <TouchableOpacity style={styles.socialButton}>
            <Globe size={20} color="#9ca3af" />
            <Text style={styles.socialButtonText}>Google</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButton}>
            <ShieldCheck size={20} color="#9ca3af" />
            <Text style={styles.socialButtonText}>Apple</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 40,
    padding: 32,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(175, 239, 221, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontFamily: 'Lexend',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 99,
    padding: 4,
    marginBottom: 32,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 99,
  },
  activeTab: {
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
  },
  activeTabText: {
    color: COLORS.primary,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#9ca3af',
    letterSpacing: 1,
  },
  forgotText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.primaryLight,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 14,
    color: COLORS.text,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: COLORS.surface,
    fontWeight: 'bold',
    fontSize: 16,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#f3f4f6',
  },
  dividerText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#9ca3af',
    marginHorizontal: 16,
    letterSpacing: 2,
  },
  socialGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 16,
  },
  socialButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
  }
});
