/**
 * Componente Layout - Combina Header + Sidebar + Conteúdo
 */

import React, { useState, ReactNode, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  SafeAreaView,
  Platform,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../Header/Header';
import { Sidebar } from '../Sidebar/Sidebar';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  showBackButton?: boolean;
  showHeader?: boolean;
  showSidebar?: boolean;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  title,
  showBackButton = false,
  showHeader = true,
  showSidebar = true,
  rightAction,
  style,
  contentStyle,
}) => {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <SafeAreaView style={[styles.container, style]}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {showHeader && (
          <View style={styles.headerWrapper}>
            {showSidebar && (
              <TouchableOpacity
                onPress={() => setSidebarVisible(true)}
                style={styles.menuButton}
              >
                <Ionicons name="menu" size={24} color="#fff" />
              </TouchableOpacity>
            )}
            <Header
              title={title}
              showBackButton={showBackButton}
              showProfile={!showSidebar}
              rightAction={rightAction}
              style={styles.header}
            />
          </View>
        )}

        <View style={[styles.content, contentStyle]}>{children}</View>

        {showSidebar && (
          <Sidebar
            visible={sidebarVisible}
            onClose={() => setSidebarVisible(false)}
          />
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  menuButton: {
    padding: 12,
    zIndex: 10,
  },
  header: {
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default Layout;
