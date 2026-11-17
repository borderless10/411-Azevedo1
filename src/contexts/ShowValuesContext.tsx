import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SHOW_VALUES_STORAGE_KEY = "@visao:showValues";

type ShowValuesContextType = {
  showValues: boolean;
  toggleShowValues: () => void;
  setShowValues: (v: boolean) => void;
};

const ShowValuesContext = createContext<ShowValuesContextType | undefined>(
  undefined,
);

export const ShowValuesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Padrão oculto (apps bancários), até carregar a preferência salva.
  const [showValues, setShowValuesState] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(SHOW_VALUES_STORAGE_KEY);
        if (cancelled) return;
        if (saved === "1" || saved === "true") {
          setShowValuesState(true);
        } else if (saved === "0" || saved === "false") {
          setShowValuesState(false);
        }
      } catch {
        // Mantém o padrão oculto se a leitura falhar.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (value: boolean) => {
    try {
      await AsyncStorage.setItem(
        SHOW_VALUES_STORAGE_KEY,
        value ? "1" : "0",
      );
    } catch {
      // Preferência em memória segue válida mesmo se o disco falhar.
    }
  }, []);

  const setShowValues = useCallback(
    (value: boolean) => {
      setShowValuesState(value);
      void persist(value);
    },
    [persist],
  );

  const toggleShowValues = useCallback(() => {
    setShowValuesState((prev) => {
      const next = !prev;
      void persist(next);
      return next;
    });
  }, [persist]);

  return (
    <ShowValuesContext.Provider
      value={{ showValues, toggleShowValues, setShowValues }}
    >
      {children}
    </ShowValuesContext.Provider>
  );
};

export const useShowValues = () => {
  const ctx = useContext(ShowValuesContext);
  if (!ctx)
    throw new Error("useShowValues must be used within ShowValuesProvider");
  return ctx;
};

export default ShowValuesContext;
