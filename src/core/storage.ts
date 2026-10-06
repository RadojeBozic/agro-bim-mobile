import { ApiError } from "./errors";
export interface SecureBackend {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}
export function secureAdapter(backend: SecureBackend, onFailure: () => void) {
  const safeKey = (key: string) => key.replace(/[^a-zA-Z0-9._-]/g, "_");
  async function run<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch {
      onFailure();
      throw new ApiError("storage");
    }
  }
  return {
    getItem: (key: string) => run(() => backend.getItemAsync(safeKey(key))),
    setItem: (key: string, value: string) =>
      run(() => backend.setItemAsync(safeKey(key), value)),
    removeItem: (key: string) =>
      run(() => backend.deleteItemAsync(safeKey(key))),
  };
}
