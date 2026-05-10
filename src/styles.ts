import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
  primary: '#004d40',
  primaryLight: '#00695c',
  secondary: '#00342b',
  accent: '#afefdd',
  background: '#f8faf7',
  surface: '#ffffff',
  text: '#00342b',
  textSecondary: '#6b7280',
  error: '#ba1a1a',
  border: '#e5e7eb',
};

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  title: {
    fontFamily: 'Lexend',
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  body: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: COLORS.surface,
    fontWeight: '700',
    fontSize: 16,
  }
});
