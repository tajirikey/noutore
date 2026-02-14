import { AccountData, AccountName, GameRecord, Grade } from "@/types";

const STORAGE_KEY = "noutore_data";

interface StorageData {
  accounts: Record<string, AccountData>;
}

function getStorageData(): StorageData {
  if (typeof window === "undefined") {
    return { accounts: {} };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return { accounts: {} };
}

function saveStorageData(data: StorageData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getAccount(name: AccountName): AccountData {
  const data = getStorageData();
  return data.accounts[name] || { name, grade: 1, records: [] };
}

export function setGrade(name: AccountName, grade: Grade): void {
  const data = getStorageData();
  const account = data.accounts[name] || { name, grade: 1, records: [] };
  account.grade = grade;
  data.accounts[name] = account;
  saveStorageData(data);
}

export function addRecord(name: AccountName, record: GameRecord): void {
  const data = getStorageData();
  const account = data.accounts[name] || {
    name,
    grade: record.grade,
    records: [],
  };
  account.records.push(record);
  // Keep only last 100 records
  if (account.records.length > 100) {
    account.records = account.records.slice(-100);
  }
  data.accounts[name] = account;
  saveStorageData(data);
}

export function getRecords(
  name: AccountName,
  grade?: Grade,
  mode?: string
): GameRecord[] {
  const account = getAccount(name);
  let records = account.records;
  if (grade !== undefined) {
    records = records.filter((r) => r.grade === grade);
  }
  if (mode !== undefined) {
    records = records.filter((r) => r.mode === mode);
  }
  return records;
}

export function getBestTime(
  name: AccountName,
  grade: Grade,
  mode: string
): number | null {
  const records = getRecords(name, grade, mode as any).filter(
    (r) => r.correct === r.total
  );
  if (records.length === 0) return null;
  return Math.min(...records.map((r) => r.timeMs));
}
