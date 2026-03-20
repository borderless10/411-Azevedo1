import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  visible: boolean;
  initialBase64?: string | null;
  onClose: () => void;
  onSave: (base64: string | null) => void;
};

const ProfilePhotoModal: React.FC<Props> = ({
  visible,
  initialBase64 = null,
  onClose,
  onSave,
}) => {
  const [previewBase64, setPreviewBase64] = useState<string | null>(
    initialBase64 || null,
  );

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permissão necessária",
          "Permita acesso à biblioteca de imagens para selecionar uma foto.",
        );
        return;
      }

      const result: any = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        base64: false,
      });

      if (!result.cancelled) {
        // Prefer to manipulate/resize the image to keep base64 under Firestore limits.
        const uri = result.uri ?? result?.assets?.[0]?.uri;
        if (!uri) {
          Alert.alert("Erro", "Não foi possível obter a imagem selecionada.");
          return;
        }

        try {
          // Resize to max width 800 and compress to reduce size
          const manipResult: any = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 800 } }],
            {
              compress: 0.7,
              format: ImageManipulator.SaveFormat.JPEG,
              base64: true,
            },
          );

          const base64 =
            manipResult.base64 ?? result.base64 ?? result?.assets?.[0]?.base64;
          if (base64) {
            // ensure size limit (rough check) - Firestore limit ~1,048,487 bytes
            if (base64.length > 1000000) {
              Alert.alert(
                "Imagem muito grande",
                "A imagem continua muito grande após compressão. Tente outra com resolução menor.",
              );
              return;
            }
            setPreviewBase64(base64);
          } else {
            Alert.alert(
              "Formato não suportado",
              "Não foi possível obter base64 da imagem selecionada.",
            );
          }
        } catch (e) {
          console.error("Erro ao manipular imagem", e);
          Alert.alert(
            "Erro",
            "Não foi possível processar a imagem selecionada.",
          );
        }
      }
    } catch (e) {
      console.error("Erro ao selecionar imagem", e);
      Alert.alert("Erro", "Não foi possível selecionar a imagem.");
    }
  };

  const handleSave = () => {
    onSave(previewBase64);
    onClose();
  };

  const handleRemove = () => {
    setPreviewBase64(null);
  };

  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <Text style={styles.title}>Foto de Perfil</Text>

          <View style={styles.previewWrap}>
            {previewBase64 ? (
              <Image
                source={{ uri: `data:image/jpeg;base64,${previewBase64}` }}
                style={styles.preview}
              />
            ) : (
              <View style={styles.placeholder}>
                <Ionicons name="person" size={64} color="#666" />
                <Text style={styles.placeholderText}>Sem foto</Text>
              </View>
            )}
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={pickImage}>
              <Text style={styles.actionText}>Escolher Foto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleRemove}>
              <Text style={styles.actionText}>Remover</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.ghostBtn} onPress={onClose}>
              <Text style={styles.ghostText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#0f0f10",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "700",
    marginBottom: 12,
  },
  previewWrap: {
    width: 140,
    height: 140,
    borderRadius: 80,
    overflow: "hidden",
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  preview: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#111",
  },
  placeholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: "#888",
    marginTop: 6,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  actionBtn: {
    backgroundColor: "#1a1a1a",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  actionText: {
    color: "#fff",
    fontWeight: "700",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
  },
  ghostBtn: {
    flex: 1,
    backgroundColor: "transparent",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
  },
  ghostText: { color: "#fff" },
  saveBtn: {
    flex: 1,
    backgroundColor: "#8c52ff",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontWeight: "700" },
});

export default ProfilePhotoModal;
