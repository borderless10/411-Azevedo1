import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Layout } from "../../components/Layout/Layout";
import { useNavigation } from "../../routes/NavigationContext";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../contexts/ThemeContext";
import { userService } from "../../services/userServices";
import ConsultantPicker from "../../components/ui/ConsultantPicker";
import { ConsultationPreferredDayPicker } from "../../components/Consultation/ConsultationPreferredDayPicker";
import CustomModal from "../../components/ui/CustomModal";
import { AccountType } from "../../types/auth";
import {
  coupleAccountFieldsFromInput,
  isCoupleAccount,
} from "../../utils/coupleAccount";
import {
  defaultConsultationPreferredDay,
  parseConsultationPreferredDay,
  toConsultationPreferredDayStorage,
} from "../../utils/consultationScheduling";

export const EditUserScreen: React.FC = ({}: any) => {
  const { navigate, params } = useNavigation() as any;
  const { user } = useAuth();
  const { colors } = useTheme();
  const userId = params?.userId as string | undefined;
  const focusConsultation = params?.focusConsultation === true;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<
    "user" | "consultor" | "admin" | "cliente_premium"
  >("user");
  const [consultants, setConsultants] = useState<any[]>([]);
  const [consultantId, setConsultantId] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [coupleMember1Name, setCoupleMember1Name] = useState("");
  const [coupleMember2Name, setCoupleMember2Name] = useState("");
  const [consultationSchedulingUrl, setConsultationSchedulingUrl] =
    useState("");
  const [consultationPreferredDay, setConsultationPreferredDay] = useState<
    number | null
  >(null);
  const [hasConsultationPreferredDay, setHasConsultationPreferredDay] =
    useState(false);
  const [feedback, setFeedback] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: "", message: "" });

  useEffect(() => {
    if (
      !user ||
      (user.role !== "consultor" && user.role !== "admin" && !user.isAdmin)
    ) {
      navigate("Home");
      return;
    }
    if (userId) fetchUser();
    async function load() {
      try {
        const list = await userService.getUsersByRole("consultor");
        setConsultants(list);
      } catch (e) {
        console.warn("Erro ao carregar consultores", e);
      }
    }
    load();
  }, [userId]);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const u = await userService.getUserById(userId!);
      if (u) {
        setName(u.name || "");
        setNickname((u as any).nickname || "");
        setPhone(u.phone || "");
        setRole((u.role as any) || "user");
        setConsultantId((u as any).consultantId || null);
        setAccountType(isCoupleAccount(u) ? "couple" : "individual");
        setCoupleMember1Name(u.coupleMember1Name || "");
        setCoupleMember2Name(u.coupleMember2Name || "");
        setConsultationSchedulingUrl(u.consultationSchedulingUrl || "");
        const parsedPreferredDay = parseConsultationPreferredDay(
          u.consultationPreferredDate,
        );
        setHasConsultationPreferredDay(parsedPreferredDay !== null);
        setConsultationPreferredDay(
          parsedPreferredDay ?? defaultConsultationPreferredDay(),
        );
      }
    } catch (error) {
      console.error("Erro ao carregar usuário para edição", error);
      setFeedback({
        visible: true,
        title: "Erro",
        message: "Não foi possível carregar usuário.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const coupleFields = coupleAccountFieldsFromInput({
        accountType:
          role === "user" || role === "cliente_premium"
            ? accountType
            : "individual",
        coupleMember1Name,
        coupleMember2Name,
      });
      await userService.updateUser(userId, {
        name: name.trim(),
        nickname: nickname.trim(),
        phone: phone.trim(),
        role,
        isAdmin: role === "admin",
        consultantId: consultantId === null ? null : consultantId,
        consultationSchedulingUrl:
          role === "user" || role === "cliente_premium"
            ? consultationSchedulingUrl.trim()
            : null,
        consultationPreferredDate:
          role === "user" || role === "cliente_premium"
            ? hasConsultationPreferredDay
              ? toConsultationPreferredDayStorage(consultationPreferredDay)
              : ""
            : null,
        ...coupleFields,
      });
      setFeedback({
        visible: true,
        title: "Sucesso",
        message: "Usuário atualizado.",
      });
    } catch (error) {
      console.error("Erro ao salvar usuário", error);
      setFeedback({
        visible: true,
        title: "Erro",
        message: "Falha ao salvar usuário.",
      });
    } finally {
      setSaving(false);
    }
  };

  const isClientRole = role === "user" || role === "cliente_premium";

  return (
    <Layout
      title="Editar Usuário"
      showBackButton={true}
      showSidebar={false}
      contentStyle={{ backgroundColor: colors.background }}
    >
      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.scrollContent,
          { backgroundColor: colors.background },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <>
            <Text style={[styles.label, { color: colors.text }]}>Nome</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBackground,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={name}
              onChangeText={setName}
            />

            <Text style={[styles.label, { color: colors.text }]}>Usuário</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBackground,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={nickname}
              onChangeText={setNickname}
              placeholder="Como a pessoa quer ser chamada no app"
              placeholderTextColor={colors.placeholder}
            />

            <Text style={[styles.label, { color: colors.text }]}>Telefone</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBackground,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={phone}
              onChangeText={setPhone}
              placeholderTextColor={colors.placeholder}
            />

            <Text style={[styles.label, { color: colors.text }]}>Papel</Text>
            <View style={styles.roleRow}>
              {(
                [
                  ["user", "Cliente"],
                  ["consultor", "Consultor"],
                  ["cliente_premium", "Cliente Premium"],
                  ["admin", "Admin"],
                ] as const
              ).map(([value, labelText]) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.roleButton,
                    {
                      backgroundColor:
                        role === value ? colors.primary : colors.inputBackground,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setRole(value)}
                >
                  <Text
                    style={[
                      styles.roleText,
                      { color: role === value ? "#fff" : colors.textSecondary },
                    ]}
                  >
                    {labelText}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {isClientRole && (
              <>
                <Text style={[styles.label, { color: colors.text }]}>
                  Tipo de conta
                </Text>
                <View style={styles.roleRow}>
                  {(
                    [
                      ["individual", "Individual"],
                      ["couple", "❤️ Casal"],
                    ] as const
                  ).map(([value, labelText]) => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.roleButton,
                        {
                          backgroundColor:
                            accountType === value
                              ? colors.primary
                              : colors.inputBackground,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => setAccountType(value)}
                    >
                      <Text
                        style={[
                          styles.roleText,
                          {
                            color:
                              accountType === value
                                ? "#fff"
                                : colors.textSecondary,
                          },
                        ]}
                      >
                        {labelText}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {accountType === "couple" && (
                  <>
                    <Text style={[styles.label, { color: colors.text }]}>
                      Nome do integrante 1
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.inputBackground,
                          color: colors.text,
                          borderColor: colors.border,
                        },
                      ]}
                      value={coupleMember1Name}
                      onChangeText={setCoupleMember1Name}
                      placeholder="Usuário 1"
                      placeholderTextColor={colors.placeholder}
                    />
                    <Text style={[styles.label, { color: colors.text }]}>
                      Nome do integrante 2
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.inputBackground,
                          color: colors.text,
                          borderColor: colors.border,
                        },
                      ]}
                      value={coupleMember2Name}
                      onChangeText={setCoupleMember2Name}
                      placeholder="Usuário 2"
                      placeholderTextColor={colors.placeholder}
                    />
                  </>
                )}
              </>
            )}

            {isClientRole && (
              <View
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: focusConsultation ? "#ff4d6d" : colors.border,
                  },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Agendamento de consultoria
                </Text>

                <Text style={[styles.label, { color: colors.text }]}>
                  Consultor responsável
                </Text>
                <ConsultantPicker
                  consultants={consultants}
                  value={consultantId}
                  onChange={(id) => setConsultantId(id)}
                />

                <Text style={[styles.label, { color: colors.text }]}>
                  Link de agendamento de consultoria
                </Text>
                {focusConsultation ? (
                  <Text style={styles.focusHint}>
                    Cliente solicitou liberação do agendamento
                  </Text>
                ) : null}
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.inputBackground,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  value={consultationSchedulingUrl}
                  onChangeText={setConsultationSchedulingUrl}
                  placeholder="https://calendar.app.google/..."
                  placeholderTextColor={colors.placeholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />

                <Text style={[styles.label, { color: colors.text }]}>
                  Melhor dia para consultoria
                </Text>
                <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
                  Opcional. Dia fixo do mês (ex.: dia 15) — o cliente verá na sidebar.
                </Text>
                <ConsultationPreferredDayPicker
                  day={hasConsultationPreferredDay ? consultationPreferredDay : null}
                  onChangeDay={(day) => {
                    setConsultationPreferredDay(day);
                    setHasConsultationPreferredDay(true);
                  }}
                  style={styles.datePicker}
                />
                {hasConsultationPreferredDay ? (
                  <TouchableOpacity
                    onPress={() => {
                      setHasConsultationPreferredDay(false);
                      setConsultationPreferredDay(null);
                    }}
                  >
                    <Text style={styles.clearDateText}>Remover melhor dia</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: colors.primary },
                saving && styles.saveDisabled,
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveText}>
                {saving ? "Salvando..." : "Salvar alterações"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <CustomModal
        visible={feedback.visible}
        title={feedback.title}
        message={feedback.message}
        primaryLabel="OK"
        onClose={() => {
          const wasSuccess = feedback.title === "Sucesso";
          setFeedback((current) => ({ ...current, visible: false }));
          if (wasSuccess) navigate("AdminUsers");
        }}
      />
    </Layout>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loader: {
    marginTop: 24,
  },
  label: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 15,
    fontWeight: "600",
  },
  input: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  roleButton: {
    flexGrow: 1,
    flexBasis: "45%",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
  },
  roleText: {
    fontWeight: "600",
    fontSize: 13,
    textAlign: "center",
  },
  sectionCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  fieldHint: {
    fontSize: 12,
    marginBottom: 4,
    lineHeight: 18,
  },
  focusHint: {
    color: "#ff8fab",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  clearDateText: {
    color: "#ff8fab",
    fontSize: 13,
    marginTop: 4,
    fontWeight: "600",
  },
  datePicker: {
    marginBottom: 0,
  },
  saveButton: {
    marginTop: 24,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  saveText: {
    color: "#fff",
    fontWeight: "700",
  },
  saveDisabled: {
    opacity: 0.6,
  },
});

export default EditUserScreen;
