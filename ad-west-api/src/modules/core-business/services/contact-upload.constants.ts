import { BadRequestException } from '@nestjs/common';

/** Maximum contact rows accepted per Excel upload. */
export const CONTACT_UPLOAD_MAX_ROWS = 500;

/** Rows processed per database batch during contact uploads. */
export const CONTACT_UPLOAD_BATCH_SIZE = 500;

export function assertContactUploadRowLimit(rowCount: number): void {
  if (rowCount > CONTACT_UPLOAD_MAX_ROWS) {
    throw new BadRequestException(
      `Upload exceeds the maximum of ${CONTACT_UPLOAD_MAX_ROWS} contacts per file. `
      + `Your file has ${rowCount} data rows.`,
    );
  }
}
