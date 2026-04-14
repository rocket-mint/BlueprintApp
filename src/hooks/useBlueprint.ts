import { useContext } from "react";
import { BlueprintContext, type BlueprintContextValue } from "../context/BlueprintContext";

/** Easy access to the BlueprintContext. Throws if used outside BlueprintProvider. */
export function useBlueprint(): BlueprintContextValue {
  const ctx = useContext(BlueprintContext);
  if (!ctx) {
    throw new Error("useBlueprint must be used within a <BlueprintProvider>");
  }
  return ctx;
}
