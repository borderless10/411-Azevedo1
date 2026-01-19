/**
 * Componente Layout - Combina Header + Sidebar + Conteúdo
 */

import React, { useState, ReactNode } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  SafeAreaView,
  Platform,
  TouchableOpacity,
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

  return (
    <SafeAreaView style={[styles.container, style]}>
      {showHeader && (
        <View style={styles.headerWrapper}>
          {showSidebar && (
            <TouchableOpacity
              onPress={() => setSidebarVisible(true)}
              style={styles.menuButton}
            >
              <Ionicons name="menu" size={24} color="#333" />
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
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
  },
});

export default Layout;
