import React from 'react';
import SkinScanner from './SkinScanner';
import { useApp } from '../AppContext';

export default function ScanScreen() {
  const { setActiveScreen } = useApp();
  return <SkinScanner onBackPress={() => setActiveScreen('home')} />;
}


