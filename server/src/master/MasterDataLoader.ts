import fs from "fs";
import path from "path";
import { Masters } from "../types";
import { validateMasters } from "./MasterValidator";

type MasterFile<T> = { schemaVersion: number; data: T[] };

function readJson<T>(filePath: string): MasterFile<T> {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as MasterFile<T>;
}

export function loadMasters(baseDir: string): Masters {
  const safeRead = <T>(file: string): MasterFile<T> => {
    const fp = path.join(baseDir, file);
    if (!fs.existsSync(fp)) {
      console.warn(`[master] missing ${file}, using empty data[]`);
      return { schemaVersion: 1, data: [] };
    }
    return readJson<T>(fp);
  };

  const masters: Masters = {
    characters: safeRead<any>("characters.json"),
    skills: safeRead<any>("skills.json"),
    items: safeRead<any>("items.json"),
    conditions: safeRead<any>("conditions.json"),
    enemies: safeRead<any>("enemies.json"),
  };

  // Validation (throws on fatal)
  validateMasters(masters);
  return masters;
}

