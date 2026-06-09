import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PLATFORM_ENUM_SEEDS } from '../enum-types.constants';

type EnumRow = { value: string; parent_value: string | null; sort_order: number; label: string };

const buildFallbackMap = (): Record<string, EnumRow[]> => {
  const map: Record<string, EnumRow[]> = {};
  for (const seed of PLATFORM_ENUM_SEEDS) {
    const list = map[seed.enumType] ?? [];
    list.push({
      value: seed.value,
      parent_value: seed.parentValue,
      sort_order: seed.sortOrder,
      label: seed.label,
    });
    map[seed.enumType] = list;
  }
  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => a.sort_order - b.sort_order || a.value.localeCompare(b.value));
  }
  return map;
};

const FALLBACK_ENUMS = buildFallbackMap();

export class EnumConfigService {
  private static readonly instances = new Set<EnumConfigService>();
  private cache = new Map<string, { loadedAt: number; rows: EnumRow[] }>();
  private readonly cacheTtlMs = 60_000;

  constructor(
    private readonly runtimeMode: 'in-memory' | 'db',
    private readonly dataSource?: DataSource,
  ) {
    EnumConfigService.instances.add(this);
  }

  /** Call after enum_values CRUD so API picks up Reference Data changes immediately. */
  static invalidateAllCaches(): void {
    for (const instance of EnumConfigService.instances) {
      instance.invalidateCache();
    }
  }

  private async loadRows(enumType: string): Promise<EnumRow[]> {
    const cached = this.cache.get(enumType);
    if (cached && Date.now() - cached.loadedAt < this.cacheTtlMs) {
      return cached.rows;
    }

    let rows: EnumRow[] = FALLBACK_ENUMS[enumType] ?? [];

    if (this.runtimeMode === 'db' && this.dataSource) {
      const dbRows = await this.dataSource.query(
        `SELECT value, parent_value, sort_order, label
         FROM adwest.enum_values
         WHERE enum_type = $1 AND active = true
         ORDER BY sort_order ASC, value ASC`,
        [enumType],
      ) as EnumRow[];
      if (dbRows.length > 0) {
        rows = dbRows;
      }
    }

    this.cache.set(enumType, { loadedAt: Date.now(), rows });
    return rows;
  }

  async getActiveValues(enumType: string): Promise<string[]> {
    const rows = await this.loadRows(enumType);
    return rows.map((r) => r.value);
  }

  async listActiveOptions(enumType: string): Promise<Array<{ value: string; label: string }>> {
    const rows = await this.loadRows(enumType);
    return rows.map((r) => ({ value: r.value, label: r.label }));
  }

  async getDefaultValue(enumType: string): Promise<string> {
    const rows = await this.loadRows(enumType);
    return rows[0]?.value ?? '';
  }

  async getParentValue(enumType: string, value: string): Promise<string | null> {
    const rows = await this.loadRows(enumType);
    return rows.find((r) => r.value === value)?.parent_value ?? null;
  }

  async getLabel(enumType: string, value: string): Promise<string> {
    const rows = await this.loadRows(enumType);
    return rows.find((r) => r.value === value)?.label ?? value;
  }

  async validate(enumType: string, value: string, label = 'Value'): Promise<void> {
    const allowed = await this.getActiveValues(enumType);
    if (!allowed.includes(value)) {
      throw new BadRequestException(
        `${label} "${value}" is not active in enum_values (${enumType}). Configure it under Settings → Reference Data.`,
      );
    }
  }

  invalidateCache(): void {
    this.cache.clear();
  }
}
