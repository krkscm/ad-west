import { ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { ContactAccessScope } from './contact-access-scope.service';

export type MemberSreniRef = {
  sreniId: string;
  sreniName: string;
};

export const SEVA_SAMITHI_SRENI_SQL_MATCH = `
  name ILIKE '%seva samithi%'
  OR LOWER(COALESCE(code, '')) IN ('seva_samithi', 'sevasamithi')
`;

export function matchesSevaSamithiIdentity(name?: string | null, code?: string | null): boolean {
  const normalizedCode = (code ?? '').trim().toLowerCase();
  if (normalizedCode === 'seva_samithi' || normalizedCode === 'sevasamithi') {
    return true;
  }
  return /seva\s*samithi/i.test(name ?? '');
}

export class SevaSamithiContactService {
  constructor(private readonly dataSource?: DataSource) {}

  static async isSevaSamithiSreni(dataSource: DataSource | undefined, sreniId: string): Promise<boolean> {
    if (!dataSource || !sreniId.trim()) {
      return false;
    }

    const rows = await dataSource.query(
      `SELECT 1
       FROM adwest.srenies
       WHERE id::text = $1
         AND (${SEVA_SAMITHI_SRENI_SQL_MATCH})
       LIMIT 1`,
      [sreniId.trim()],
    ) as Array<{ '?column?': number }>;

    return rows.length > 0;
  }

  async upsertRegistryEntry(contactId: string): Promise<void> {
    if (!this.dataSource || !contactId.trim()) {
      return;
    }

    await this.dataSource.query(
      `INSERT INTO adwest.seva_samithi_contacts (contact_id)
       SELECT c.id
       FROM adwest.sreni_contacts c
       WHERE c.id = $1::uuid
         AND c.contact_kind = 'household'
       ON CONFLICT (contact_id) DO NOTHING`,
      [contactId.trim()],
    );
  }

  async isContactInRegistry(contactId: string): Promise<boolean> {
    if (!this.dataSource || !contactId.trim()) {
      return false;
    }

    const rows = await this.dataSource.query(
      `SELECT 1
       FROM adwest.seva_samithi_contacts
       WHERE contact_id = $1::uuid
       LIMIT 1`,
      [contactId.trim()],
    ) as Array<{ '?column?': number }>;

    return rows.length > 0;
  }

  async removeRegistryEntry(contactId: string): Promise<boolean> {
    if (!this.dataSource || !contactId.trim()) {
      return false;
    }

    const rows = await this.dataSource.query(
      `DELETE FROM adwest.seva_samithi_contacts
       WHERE contact_id = $1::uuid
       RETURNING id`,
      [contactId.trim()],
    ) as Array<{ id: string }>;

    return rows.length > 0;
  }

  async clearRegistry(): Promise<number> {
    if (!this.dataSource) {
      return 0;
    }

    const rows = await this.dataSource.query(
      `DELETE FROM adwest.seva_samithi_contacts RETURNING id`,
    ) as Array<{ id: string }>;

    return rows.length;
  }

  assertSevaSamithiContactAccess(
    scope: ContactAccessScope,
    contact: {
      sthanLocationId?: string | null;
      locationId?: string | null;
      sthanId?: string | null;
    },
    contactScopeHelper: {
      contactMatchesSthan(
        contact: {
          sthanLocationId?: string | null;
          locationId?: string | null;
          sthanId?: string | null;
        },
        sthanLocationId: string,
      ): boolean;
    },
  ): void {
    if (scope.unrestricted) {
      return;
    }

    if (scope.roleLevel === 'STHAN') {
      if (!scope.sthanLocationId) {
        throw new ForbiddenException('Sthan assignment is required for your role');
      }
      if (!contactScopeHelper.contactMatchesSthan(contact, scope.sthanLocationId)) {
        throw new ForbiddenException('You do not have access to contacts outside your sthan');
      }
    }
  }

  parseMemberSrenis(value: unknown): MemberSreniRef[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }
        const record = item as { sreniId?: string; sreniName?: string };
        const sreniId = record.sreniId?.trim();
        const sreniName = record.sreniName?.trim();
        if (!sreniId || !sreniName) {
          return null;
        }
        return { sreniId, sreniName };
      })
      .filter((item): item is MemberSreniRef => item !== null);
  }
}
