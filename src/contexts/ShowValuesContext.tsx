import React, { createContext, useContext, useState } from "react";

type ShowValuesContextType = {
  showValues: boolean;
  toggleShowValues: () => void;
  setShowValues?: (v: boolean) => void;
};

const ShowValuesContext = createContext<ShowValuesContextType | undefined>(
  undefined,
);

export const ShowValuesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [showValues, setShowValues] = useState(false); // start hidden like banking apps

  const toggleShowValues = () => setShowValues((s) => !s);

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
