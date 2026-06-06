import { ENUM_TYPES } from '@modules/enum-values/enum-types.constants';
import { EnumConfigService } from '@modules/enum-values/services/enum-config.service';

/** @deprecated Prefer ENUM_TYPES from enum-types.constants */
export const HOUSEHOLD_ENUM_TYPES = {
  PRIMARY_CONTACT_STRATEGY: ENUM_TYPES.PRIMARY_CONTACT_STRATEGY,
  ENROLLMENT_SCOPE: ENUM_TYPES.ENROLLMENT_SCOPE,
  HOUSEHOLD_MEMBER_ROLE: ENUM_TYPES.HOUSEHOLD_MEMBER_ROLE,
  HOUSEHOLD_MEMBER_SOURCE: ENUM_TYPES.HOUSEHOLD_MEMBER_SOURCE,
  FEMALE_GENDER_MATCH: ENUM_TYPES.FEMALE_GENDER_MATCH,
} as const;

export type HouseholdResolverKey = 'household_head' | 'female_participants' | 'enrolled_children';

const HOUSEHOLD_DEFAULTS: Record<string, string> = {
  [ENUM_TYPES.PRIMARY_CONTACT_STRATEGY]: 'HOUSEHOLD_HEAD',
  [ENUM_TYPES.ENROLLMENT_SCOPE]: 'HOUSEHOLD',
};

/** Loads enum values from adwest.enum_values (DB is source of truth in production). */
export class HouseholdEnumConfigService extends EnumConfigService {
  async getDefaultValue(enumType: string): Promise<string> {
    return HOUSEHOLD_DEFAULTS[enumType] ?? super.getDefaultValue(enumType);
  }

  async resolveStrategyKey(strategyValue: string | null | undefined): Promise<HouseholdResolverKey> {
    const value = strategyValue || await this.getDefaultValue(ENUM_TYPES.PRIMARY_CONTACT_STRATEGY);
    const parent = await this.getParentValue(ENUM_TYPES.PRIMARY_CONTACT_STRATEGY, value);
    if (parent === 'female_participants' || parent === 'enrolled_children' || parent === 'household_head') {
      return parent;
    }
    return 'household_head';
  }

  async getFemaleGenderMatches(): Promise<string[]> {
    const values = await this.getActiveValues(ENUM_TYPES.FEMALE_GENDER_MATCH);
    return values.map((v) => v.toLowerCase());
  }

  async isFemaleGender(gender: string | null | undefined): Promise<boolean> {
    if (!gender?.trim()) return false;
    const matches = await this.getFemaleGenderMatches();
    return matches.includes(gender.trim().toLowerCase());
  }
}

export type { EnumConfigService };
