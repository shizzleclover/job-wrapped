import type { WrappedInput, WrappedResponse } from "../shared/schema";

export interface StoredWrapped {
  id: string;
  input: WrappedInput;
  response?: WrappedResponse;
}

const LATEST = "wrapped:latest";
const key = (id: string) => `wrapped:${id}`;

/** True inside the extension; false when the story page is opened from a plain file server (preview). */
export const hasExtensionStorage = () => typeof browser !== "undefined" && !!browser?.storage?.local;

export async function saveWrapped(entry: StoredWrapped): Promise<void> {
  await browser.storage.local.set({ [key(entry.id)]: entry, [LATEST]: entry.id });
}

export async function loadWrapped(id: string): Promise<StoredWrapped | null> {
  const result = await browser.storage.local.get(key(id));
  return (result[key(id)] as StoredWrapped | undefined) ?? null;
}

export async function latestWrappedId(): Promise<string | null> {
  const result = await browser.storage.local.get(LATEST);
  return (result[LATEST] as string | undefined) ?? null;
}
