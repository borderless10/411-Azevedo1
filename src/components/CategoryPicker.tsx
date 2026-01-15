/**
 * Componente de seleção de categoria
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCategoriesByType } from '../types/category';

interface CategoryPickerProps {
  label: string;
  type: 'income' | 'expense';
  selectedCategory?: string;
  onSelectCategory: (category: string) => void;
  error?: string;
  editable?: boolean;
  style?: ViewStyle;
}

export const CategoryPicker: React.FC<CategoryPickerProps> = ({
  label,
  type,
  selectedCategory,
  onSelectCategory,
  error,
  editable = true,
  style,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const categories = getCategoriesByType(type);

  const selectedCat = categories.find((cat) => cat.name === selectedCategory);

  const handleSelect = (categoryName: string) => {
    onSelectCategory(categoryName);
    setModalVisible(false);
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>
        <Ionicons name="pricetag" size={16} color="#007AFF" /> {label}
      </Text>

      <TouchableOpacity
        style={[
          styles.inputWrapper,
          error ? styles.inputWrapperError : null,
          !editable ? styles.inputWrapperDisabled : null,
        ]}
        onPress={() => editable && setModalVisible(true)}
        disabled={!editable}
      >
        {selectedCat ? (
          <>
            <Ionicons
              name={selectedCat.icon as any}
              size={20}
              color={selectedCat.color}
              style={styles.inputIcon}
            />
            <Text style={styles.categoryText}>{selectedCat.name}</Text>
          </>
        ) : (
          <>
            <Ionicons
              name="pricetag-outline"
              size={20}
              color="#999"
              style={styles.inputIcon}
            />
            <Text style={styles.placeholderText}>Selecione uma categoria</Text>
          </>
        )}
        <Ionicons name="chevron-down" size={20} color="#999" style={styles.icon} />
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Modal de seleção */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecione uma Categoria</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={categories}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryItem,
                    selectedCategory === item.name && styles.categoryItemSelected,
                  ]}
                  onPress={() => handleSelect(item.name)}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={24}
                    color={item.color}
                    style={styles.categoryIcon}
                  />
                  <Text style={styles.categoryItemText}>{item.name}</Text>
                  {selectedCategory === item.name && (
                    <Ionicons name="checkmark" size={24} color="#007AFF" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputWrapperError: {
    borderColor: '#F44336',
    borderWidth: 2,
  },
  inputWrapperDisabled: {
    backgroundColor: '#f5f5f5',
  },
  inputIcon: {
    marginRight: 12,
  },
  categoryText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  placeholderText: {
    flex: 1,
    fontSize: 16,
    color: '#999',
  },
  icon: {
    marginLeft: 8,
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryItemSelected: {
    backgroundColor: '#E3F2FD',
  },
  categoryIcon: {
    marginRight: 16,
  },
  categoryItemText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
});

export default CategoryPicker;
