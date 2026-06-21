import { createContext, useContext, useCallback, useMemo, type ReactNode } from 'react';
import { useSharedState } from '@/lib/hotel-sync';

export interface AdminRecord {
  id: string;
  name: string;
  surname: string;
  idNumber: string;
  username: string;
  password: string;
  fingerprintId: string;
  createdAt: string;
}

export type AdminInput = Omit<AdminRecord, 'id' | 'createdAt'>;

interface AdminsContextValue {
  admins: AdminRecord[];
  addAdmin: (input: AdminInput) => AdminRecord;
  updateAdmin: (id: string, patch: Partial<AdminInput>) => void;
  removeAdmin: (id: string) => void;
  findByUsername: (username: string) => AdminRecord | undefined;
}

function normalize(list: unknown): AdminRecord[] {
  if (!Array.isArray(list)) return [];
  return list.map((a: any) => ({
    id: a?.id ?? `adm_${Math.random().toString(36).slice(2, 9)}`,
    name: a?.name ?? '',
    surname: a?.surname ?? '',
    idNumber: a?.idNumber ?? '',
    username: a?.username ?? '',
    password: a?.password ?? '',
    fingerprintId: a?.fingerprintId ?? '',
    createdAt: a?.createdAt ?? new Date().toISOString(),
  }));
}

const AdminsContext = createContext<AdminsContextValue | undefined>(undefined);

export function AdminsProvider({ children }: { children: ReactNode }) {
  const { data, setData } = useSharedState<AdminRecord[]>('admins', []);
  const admins = useMemo(() => normalize(data), [data]);

  const addAdmin = useCallback<AdminsContextValue['addAdmin']>((input) => {
    const rec: AdminRecord = {
      id: `adm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      name: input.name.trim(),
      surname: input.surname.trim(),
      idNumber: input.idNumber.trim(),
      username: input.username.trim().toLowerCase(),
      password: input.password,
      fingerprintId: input.fingerprintId.trim(),
      createdAt: new Date().toISOString(),
    };
    setData((prev) => [rec, ...normalize(prev)]);
    return rec;
  }, [setData]);

  const updateAdmin = useCallback<AdminsContextValue['updateAdmin']>((id, patch) => {
    setData((prev) => normalize(prev).map((a) =>
      a.id === id ? { ...a, ...patch, username: patch.username ? patch.username.trim().toLowerCase() : a.username } : a,
    ));
  }, [setData]);

  const removeAdmin = useCallback<AdminsContextValue['removeAdmin']>((id) => {
    setData((prev) => normalize(prev).filter((a) => a.id !== id));
  }, [setData]);

  const findByUsername = useCallback((username: string) => {
    const u = username.trim().toLowerCase();
    return admins.find((a) => a.username.toLowerCase() === u);
  }, [admins]);

  const value = useMemo(() => ({ admins, addAdmin, updateAdmin, removeAdmin, findByUsername }), [admins, addAdmin, updateAdmin, removeAdmin, findByUsername]);
  return <AdminsContext.Provider value={value}>{children}</AdminsContext.Provider>;
}

export function useAdmins() {
  const ctx = useContext(AdminsContext);
  if (!ctx) throw new Error('useAdmins must be used within AdminsProvider');
  return ctx;
}
