/**
 * Tela de Perfil do Usuário
 */

import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  TouchableOpacity,
  Alert,
  TextInput,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProfilePhotoModal from "../../components/ui/ProfilePhotoModal";
import { useAuth } from "../../hooks/useAuth";
import { userService } from "../../services/userServices";
import { canRegisterClient } from "../../utils/staffAccess";
import { useNavigation } from "../../routes/NavigationContext";
import { Layout } from "../../components/Layout/Layout";
import {
  profileDisplayName,
  profilePhotoUri,
  resolveProfilePhotoUri,
} from "../../utils/chatDisplayNames";
import { rankingGamificationService } from "../../services/rankingGamificationService";
import { BadgedAvatar } from "../../components/Gamification/BadgedAvatar";
import { resolveAvatarBadgeDefinition } from "../../utils/badgeRules";
import type {
  BadgeDefinition,
  UserBadgeGrant,
} from "../../types/rankingGamification";
import { useDesktopWeb } from "../../utils/desktopWeb";
import { DesktopPageCanvas } from "../../components/Layout/DesktopPage";

const persistProfilePhoto = async (userId: string, base64: string | null) => {
  // Caminho principal: Firebase Storage. Só a URL fica no documento do
  // usuário, e é ela que Ranking, Chat e demais telas leves leem para
  // mostrar a foto de todo mundo (photoBase64 fica retido nas listas).
  // Se o Storage estiver desligado ou falhar, cai para o base64 no
  // Firestore, que resolve a foto nas telas com o documento completo.
  let savedToStorage = false;
  if (base64) {
    try {
      const { isProfilePhotoStorageEnabled, uploadProfilePhoto } =
        await import("../../services/profilePhotoStorage");
      if (isProfilePhotoStorageEnabled()) {
        const { url, path } = await uploadProfilePhoto(userId, base64);
        await userService.updateUser(userId, {
          photoBase64: null,
          photoUrl: url,
          photoStoragePath: path,
          photoUpdatedAt: Date.now(),
        });
        savedToStorage = true;
      }
    } catch (error) {
      console.warn("Foto de perfil: Storage indisponível, usando base64.", error);
    }
  }
  if (!savedToStorage) {
    await userService.updateUser(userId, {
      photoBase64: base64 || null,
      photoUrl: null,
      photoStoragePath: null,
      photoUpdatedAt: Date.now(),
    });
  }
  void import("../../services/rankingServices").then(({ rankingServices }) =>
    rankingServices.refreshUserSnapshot(userId),
  );
};

export const ProfileScreen = () => {

  const desktopWeb = useDesktopWeb();
  const { user, refreshUser } = useAuth();
  const { navigate, params } = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const successFadeAnim = useRef(new Animated.Value(0)).current;
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [currency, setCurrency] = useState<string>(user?.currency || "BRL");
  const [savingPrefs, setSavingPrefs] = useState<boolean>(false);

  const [editingName, setEditingName] = useState<string>(user?.name || "");
  const [editingNickname, setEditingNickname] = useState<string>(
    (user as any)?.nickname || "",
  );
  const [editingPhone, setEditingPhone] = useState<string>(user?.phone || "");
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [editingMode, setEditingMode] = useState<boolean>(false);
  const [editingPhotoBase64, setEditingPhotoBase64] = useState<string | null>(
    (user as any)?.photoBase64 || null,
  );
  const [showPhotoModal, setShowPhotoModal] = useState<boolean>(false);
  const [myGrants, setMyGrants] = useState<UserBadgeGrant[]>([]);
  const [badgeDefinitions, setBadgeDefinitions] = useState<BadgeDefinition[]>(
    [],
  );
  const [selectingBorder, setSelectingBorder] = useState<boolean>(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashSuccess = (message: string, durationMs = 4000) => {
    setShowSuccess(true);
    setSuccessMessage(message);
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => {
      setShowSuccess(false);
      setSuccessMessage("");
    }, durationMs);
  };

  // Verificar se o usuário é admin
  const isAdmin = user?.role === "admin" || user?.isAdmin === true;

  useEffect(() => {
    if (!user?.id) return;
    const unsubGrants = rankingGamificationService.subscribeUserGrants(
      user.id,
      setMyGrants,
      () => {},
    );
    const unsubDefinitions =
      rankingGamificationService.subscribeBadgeDefinitions(
        setBadgeDefinitions,
        () => {},
      );
    return () => {
      unsubGrants();
      unsubDefinitions();
    };
  }, [user?.id]);

  const definitionsById = new Map(
    badgeDefinitions.map((definition) => [definition.id, definition]),
  );
  const myBadges = myGrants
    .map((grant) => definitionsById.get(grant.badgeId))
    .filter((definition): definition is BadgeDefinition => Boolean(definition));
  const activeBorderDefinition =
    definitionsById.get((user as any)?.activeBadgeBorderId) || null;
  // Selo da própria foto: insígnia da borda ativa ou primeira concedida.
  // O anel continua sendo só activeBorderDefinition.
  const ownBadgeDefinition = resolveAvatarBadgeDefinition(
    activeBorderDefinition,
    myBadges,
  );

  const handleSelectBorder = async (badgeId: string | null) => {
    if (selectingBorder) return;
    try {
      setSelectingBorder(true);
      await rankingGamificationService.selectBadgeBorder(badgeId);
      await refreshUser();
    } catch (e) {
      console.error("Erro ao selecionar borda", e);
      Alert.alert("Erro", "Não foi possível atualizar a borda.");
    } finally {
      setSelectingBorder(false);
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Mensagem de sucesso por params
    if (params?.showSuccess && params?.successMessage) {
      setShowSuccess(true);
      setSuccessMessage(params.successMessage);

      Animated.timing(successFadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(successFadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowSuccess(false);
          setSuccessMessage("");
        });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [params]);

  useEffect(
    () => () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    },
    [],
  );

  return (
    <Layout title="Perfil" showBackButton={false} showSidebar={true}>
      <DesktopPageCanvas maxWidth={820}>
      <ScrollView style={styles.container} scrollEnabled={!desktopWeb}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Mensagem de Sucesso */}
          {showSuccess && (
            <Animated.View
              style={[styles.successContainer, { opacity: successFadeAnim }]}
            >
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={48} color="#B900FF" />
              </View>
              <Text style={styles.successTitle}>Sucesso</Text>
              <Text style={styles.successMessage}>{successMessage}</Text>
            </Animated.View>
          )}

          {/* Avatar e Informações Básicas */}
          <View style={styles.profileHeader}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowPhotoModal(true)}
              style={styles.avatarContainer}
            >
              <BadgedAvatar
                photoUri={
                  profilePhotoUri(editingPhotoBase64) ||
                  resolveProfilePhotoUri(user as any)
                }
                displayName={profileDisplayName(user, "Usuário")}
                size={88}
                ringDefinition={activeBorderDefinition}
                badgeDefinition={ownBadgeDefinition}
                onPhotoPress={() => setShowPhotoModal(true)}
              />
              {isAdmin && (
                <View style={styles.badgeContainer}>
                  <View style={styles.adminBadge}>
                    <Ionicons
                      name="shield-checkmark"
                      size={16}
                      color="#B900FF"
                    />
                    <Text style={styles.badgeText}>Admin</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.userName}>
              {profileDisplayName(user, "Usuário")}
            </Text>
            <Text style={styles.userEmail}>{user?.email || ""}</Text>
            {user?.id && user.rankingPreference === "participate" ? (
              <TouchableOpacity
                style={styles.achievementsButton}
                onPress={() =>
                  navigate("PublicGamificationProfile", { userId: user.id })
                }
                accessibilityRole="button"
                accessibilityLabel="Ver minhas conquistas"
              >
                <Ionicons name="trophy-outline" size={17} color="#fff" />
                <Text style={styles.achievementsButtonText}>
                  Ver minhas conquistas
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Dados de Perfil (exibição, habilitar edição via botão) */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="person" size={24} color="#B900FF" />
              <Text style={styles.infoTitle}>Dados de Perfil</Text>
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.infoLabel}>Nome</Text>
              <TextInput
                style={[styles.input, { marginTop: 6 }]}
                value={editingName}
                onChangeText={setEditingName}
                placeholder="Seu nome completo"
                placeholderTextColor="#999"
                editable={editingMode}
                selectTextOnFocus={editingMode}
              />
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.infoLabel}>Usuário</Text>
              <TextInput
                style={[styles.input, { marginTop: 6 }]}
                value={editingNickname}
                onChangeText={setEditingNickname}
                placeholder="Como você quer ser chamado no app"
                placeholderTextColor="#999"
                editable={editingMode}
                selectTextOnFocus={editingMode}
              />
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.infoLabel}>Telefone</Text>
              <TextInput
                style={[styles.input, { marginTop: 6 }]}
                value={editingPhone}
                onChangeText={setEditingPhone}
                placeholder="(00) 00000-0000"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                editable={editingMode}
                selectTextOnFocus={editingMode}
              />
            </View>

            {/* foto agora aberta apenas ao tocar no avatar */}

            <TouchableOpacity
              style={[
                styles.saveButton,
                (savingProfile || !editingMode) && styles.saveButtonDisabled,
              ]}
              onPress={async () => {
                if (!editingMode) {
                  setEditingMode(true);
                  return;
                }

                if (!user?.id) return;
                setSavingProfile(true);
                try {
                  await persistProfilePhoto(user.id, editingPhotoBase64 || null);
                  await userService.updateUser(user.id, {
                    name: editingName.trim(),
                    nickname: editingNickname.trim(),
                    phone: editingPhone.replace(/\D/g, "").trim(),
                  });
                  await refreshUser();
                  void import("../../services/rankingServices").then(({ rankingServices }) =>
                    rankingServices.refreshUserSnapshot(user.id),
                  );
                  flashSuccess("Perfil atualizado com sucesso");
                } catch (e) {
                  console.error("Erro ao atualizar perfil", e);
                  Alert.alert("Erro", "Não foi possível atualizar o perfil");
                } finally {
                  setSavingProfile(false);
                  setEditingMode(false);
                }
              }}
            >
              <Text style={styles.saveButtonText}>
                {!editingMode
                  ? "Editar Perfil"
                  : savingProfile
                    ? "Salvando..."
                    : "Salvar Perfil"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Informações do Sistema */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={24} color="#B900FF" />
              <Text style={styles.infoTitle}>Informações da Conta</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>ID do Usuário</Text>
              <Text style={styles.infoValue}>{user?.id || "N/A"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Status</Text>
              <View style={styles.statusContainer}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Ativo</Text>
              </View>
            </View>
          </View>

          {/* Preferências do Usuário */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="options" size={24} color="#B900FF" />
              <Text style={styles.infoTitle}>Preferências</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Moeda</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {["BRL", "USD", "EUR"].map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.currencyButton,
                      currency === c && styles.currencyButtonActive,
                    ]}
                    onPress={() => setCurrency(c)}
                  >
                    <Text
                      style={
                        currency === c
                          ? styles.currencyButtonTextActive
                          : styles.currencyButtonText
                      }
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Ranking</Text>
              <Text style={styles.infoValue}>
                Preferências de ranking agora ficam em Configurações
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.saveButton,
                savingPrefs && styles.saveButtonDisabled,
              ]}
              onPress={async () => {
                if (!user?.id) return;
                try {
                  setSavingPrefs(true);
                  await userService.updateUserPreferences(user.id, {
                    currency,
                  });
                  // refresh user data in context
                  await refreshUser();
                  flashSuccess("Preferências salvas com sucesso");
                } catch (e) {
                  console.error("Erro ao salvar preferências", e);
                  Alert.alert(
                    "Erro",
                    "Não foi possível salvar as preferências",
                  );
                } finally {
                  setSavingPrefs(false);
                }
              }}
            >
              <Text style={styles.saveButtonText}>
                {savingPrefs ? "Salvando..." : "Salvar Preferências"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Minha borda de insígnia */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="ribbon" size={24} color="#B900FF" />
              <Text style={styles.infoTitle}>Minha borda</Text>
            </View>
            <View style={{ alignItems: "center", paddingVertical: 8 }}>
              <BadgedAvatar
                photoUri={resolveProfilePhotoUri(user as any)}
                displayName={profileDisplayName(user as any)}
                size={72}
                ringDefinition={activeBorderDefinition}
                badgeDefinition={ownBadgeDefinition}
              />
              <Text style={styles.infoValue}>
                {activeBorderDefinition
                  ? activeBorderDefinition.name
                  : "Borda padrão"}
              </Text>
            </View>
            {myBadges.length === 0 ? (
              <Text style={styles.infoValue}>
                Você ainda não possui insígnias. Conquiste uma para liberar
                bordas personalizadas.
              </Text>
            ) : (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <TouchableOpacity
                  style={[
                    styles.currencyButton,
                    !activeBorderDefinition && styles.currencyButtonActive,
                  ]}
                  disabled={selectingBorder}
                  onPress={() => handleSelectBorder(null)}
                >
                  <Text
                    style={
                      !activeBorderDefinition
                        ? styles.currencyButtonTextActive
                        : styles.currencyButtonText
                    }
                  >
                    Padrão
                  </Text>
                </TouchableOpacity>
                {myBadges.map((definition) => (
                  <TouchableOpacity
                    key={definition.id}
                    style={[
                      styles.currencyButton,
                      styles.borderOption,
                      activeBorderDefinition?.id === definition.id &&
                        styles.currencyButtonActive,
                    ]}
                    disabled={selectingBorder}
                    onPress={() => handleSelectBorder(definition.id)}
                  >
                    <Ionicons
                      name={definition.icon as any}
                      size={14}
                      color={definition.primaryColor}
                    />
                    <Text
                      style={
                        activeBorderDefinition?.id === definition.id
                          ? styles.currencyButtonTextActive
                          : styles.currencyButtonText
                      }
                    >
                      {definition.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {canRegisterClient(user) && !isAdmin ? (
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => navigate("CadastrarCliente")}
              activeOpacity={0.7}
            >
              <View style={styles.adminButtonIconContainer}>
                <Ionicons name="person-add" size={24} color="#B900FF" />
              </View>
              <View style={styles.adminButtonContent}>
                <Text style={styles.adminButtonTitle}>Cadastrar cliente</Text>
                <Text style={styles.adminCardDescription}>
                  O novo cliente entra na sua operação.
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {/* Funcionalidades de Admin */}
          {isAdmin && (
            <View style={styles.adminCard}>
              <View style={styles.adminCardHeader}>
                <Ionicons name="shield-checkmark" size={24} color="#B900FF" />
                <Text style={styles.adminCardTitle}>Área Administrativa</Text>
              </View>
              <Text style={styles.adminCardDescription}>
                Gerencie usuários e funcionalidades do sistema
              </Text>

              <TouchableOpacity
                style={styles.adminButton}
                onPress={() => navigate("CadastrarCliente")}
                activeOpacity={0.7}
              >
                <View style={styles.adminButtonIconContainer}>
                  <Ionicons name="person-add" size={24} color="#B900FF" />
                </View>
                <View style={styles.adminButtonContent}>
                  <Text style={styles.adminButtonTitle}>
                    Cadastrar Novo Cliente
                  </Text>
                  <Text style={styles.adminButtonSubtitle}>
                    Criar login e conta para um novo cliente no sistema
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            </View>
          )}

          {/* Estatísticas Rápidas */}
          <View style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <Ionicons name="stats-chart" size={24} color="#FF008A" />
              <Text style={styles.statsTitle}>
                {isAdmin ? "Acesso de Administrador" : "Informações da Conta"}
              </Text>
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Ionicons name="settings" size={20} color="#999" />
                <Text style={styles.statLabel}>Configurações</Text>
                <Text style={styles.statValue}>
                  {isAdmin ? "Liberado" : "Básico"}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="shield" size={20} color="#999" />
                <Text style={styles.statLabel}>Permissões</Text>
                <Text style={styles.statValue}>
                  {isAdmin ? "Completo" : "Padrão"}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
        <ProfilePhotoModal
          visible={showPhotoModal}
          initialBase64={editingPhotoBase64}
          onClose={() => setShowPhotoModal(false)}
          onSave={async (base64) => {
            // update local preview immediately
            setEditingPhotoBase64(base64);
            // persist immediately for current user
            if (!user?.id) return;
            try {
              setSavingProfile(true);
              await persistProfilePhoto(user.id, base64 || null);
              await refreshUser();
              flashSuccess("Foto de perfil atualizada", 3000);
            } catch (e) {
              console.error("Erro ao salvar foto de perfil", e);
              Alert.alert("Erro", "Não foi possível salvar a foto de perfil.");
            } finally {
              setSavingProfile(false);
            }
          }}
        />
      </ScrollView>
          </DesktopPageCanvas>
</Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    padding: 20,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 24,
    paddingVertical: 20,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#171321",
    borderWidth: 3,
    borderColor: "#B900FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "bold",
  },
  badgeContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#B900FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 8,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: "#999",
  },
  achievementsButton: {
    minHeight: 44,
    marginTop: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#B900FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  achievementsButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  roleCard: {
    backgroundColor: "#171321",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  roleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  roleContent: {
    gap: 8,
  },
  roleName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#B900FF",
  },
  roleDescription: {
    fontSize: 14,
    color: "#ccc",
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: "#171321",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  infoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  infoLabel: {
    fontSize: 14,
    color: "#999",
  },
  infoValue: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#252525",
    color: "#fff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#B900FF",
  },
  statusText: {
    fontSize: 14,
    color: "#B900FF",
    fontWeight: "600",
  },
  statsCard: {
    backgroundColor: "#171321",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  statsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: "#000",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
  statValue: {
    fontSize: 14,
    color: "#B900FF",
    fontWeight: "bold",
    textAlign: "center",
  },
  adminCard: {
    backgroundColor: "#171321",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#B900FF",
    shadowColor: "#B900FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  adminCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  adminCardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  adminCardDescription: {
    fontSize: 14,
    color: "#999",
    marginBottom: 16,
    marginLeft: 36,
  },
  adminButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
    gap: 12,
  },
  adminButtonIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#B900FF20",
    alignItems: "center",
    justifyContent: "center",
  },
  adminButtonContent: {
    flex: 1,
    gap: 4,
  },
  adminButtonTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  adminButtonSubtitle: {
    fontSize: 12,
    color: "#999",
  },
  successContainer: {
    backgroundColor: "#1a3a1a",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#B900FF",
    alignItems: "center",
    shadowColor: "#B900FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#B900FF",
    marginBottom: 12,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    lineHeight: 24,
  },
  borderOption: { flexDirection: "row", alignItems: "center", gap: 6 },
  currencyButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#07050D",
  },
  currencyButtonActive: {
    backgroundColor: "#B900FF",
    borderColor: "#B900FF",
  },
  currencyButtonText: {
    color: "#ddd",
    fontWeight: "700",
  },
  currencyButtonTextActive: {
    color: "#000",
    fontWeight: "800",
  },
  toggleButton: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: "#07050D",
    borderWidth: 1,
    borderColor: "#333",
  },
  toggleDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#444",
  },
  toggleDotActive: {
    backgroundColor: "#B900FF",
  },
  saveButton: {
    marginTop: 12,
    backgroundColor: "#B900FF",
    padding: 12,
    alignItems: "center",
    borderRadius: 10,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#B900FF",
    backgroundColor: "#111",
  },
});

export default ProfileScreen;
