import { reactive } from "vue";

export type UserState = {
  currentFloor: number;
  currentRunMaxDamage?: number;
  resume: { screen: "start" | "menu" | "party_select" };
  party: string[];
  characters: Record<string, any>;
  skills: Record<string, any>;
  items: Record<string, number>;
};

export type AppState = {
  user: { userId: number | null; username: string | null };
  state: UserState | null;
  battle: any | null;
  maxDamageCurrentRun: number;
};

export const appState = reactive<AppState>({
  user: { userId: null, username: null },
  state: null,
  battle: null,
  maxDamageCurrentRun: 0,
});

