import React, { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { useToast } from './Toast';
import type { GlobalContactUploadDuplicateApi } from '../../utils/backendApi';

export const MASTER_CONTACT_TEMPLATE_URL = '/templates/master-sreni-contact-template.xlsx';

export const GLOBAL_CONTACT_UPLOAD_DESCRIPTION = (
  <>
    Upload an Excel file (.xlsx / .xls). Contacts with a matching <strong>Personal Number</strong> already in the system will be flagged as duplicates and skipped — new contacts will be added to the global list.
  </>
);

export const SRENI_CONTACT_UPLOAD_DESCRIPTION = (
  <>
    Upload an Excel file (.xlsx / .xls) using the master contact template. Uploading a new file <strong>replaces</strong> the existing contact list for this sreni.
  </>
);

export const STHAN_CONTACT_UPLOAD_DESCRIPTION = (
  <>
    Upload an Excel file (.xlsx / .xls) using the master contact template. Uploading a new file <strong>replaces</strong> the existing contact list for this sthan.
  </>
);

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  return match?.[1] ?? error.message ?? fallback;
};

export interface ContactUploadResult {
  inserted: number;
  duplicates?: GlobalContactUploadDuplicateApi[];
}

interface ContactUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: (result: ContactUploadResult) => void;
  onUpload: (file: File) => Promise<ContactUploadResult>;
  description: React.ReactNode;
  title?: string;
  duplicateSreniById?: Map<string, string>;
  autoCloseOnSuccess?: boolean;
}

export const ContactUploadModal: React.FC<ContactUploadModalProps> = ({
  isOpen,
  onClose,
  onUploaded,
  onUpload,
  description,
  title = 'Upload Contacts',
  duplicateSreniById,
  autoCloseOnSuccess = true,
}) => {
  const { addToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [duplicates, setDuplicates] = useState<GlobalContactUploadDuplicateApi[]>([]);
  const [uploadDone, setUploadDone] = useState(false);
  const [insertedCount, setInsertedCount] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setFileName('');
      setDuplicates([]);
      setUploadDone(false);
      setInsertedCount(0);
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileName(e.target.files?.[0]?.name ?? '');
    setDuplicates([]);
    setUploadDone(false);
  };

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const result = await onUpload(file);
      setInsertedCount(result.inserted);
      setDuplicates(result.duplicates ?? []);
      setUploadDone(true);
      onUploaded(result);
      if (result.duplicates?.length) {
        addToast(
          `Uploaded ${result.inserted} contact${result.inserted !== 1 ? 's' : ''}; ${result.duplicates.length} duplicate${result.duplicates.length !== 1 ? 's' : ''} skipped.`,
          'success',
        );
      } else {
        addToast(`Uploaded ${result.inserted} contact${result.inserted !== 1 ? 's' : ''}.`, 'success');
        if (autoCloseOnSuccess) onClose();
      }
    } catch (err) {
      addToast(toUiError(err, 'Upload failed.'), 'error');
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="500px">
      {!uploadDone ? (
        <div className="contact-upload-modal">
          <p className="contact-upload-modal__description">{description}</p>

          <div>
            <label className="form-label">Excel File</label>
            <div className="contact-upload-modal__file-row">
              <button
                type="button"
                className="btn btn-choose-file"
                disabled={isUploading}
                onClick={() => fileRef.current?.click()}
              >
                Choose file
              </button>
              <span className={`contact-upload-modal__file-name${fileName ? ' contact-upload-modal__file-name--selected' : ''}`}>
                {fileName || 'No file selected'}
              </span>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="contact-upload-modal__file-input" onChange={handleFileChange} />
          </div>

          <div className="contact-upload-modal__actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isUploading}>Cancel</button>
            <a href={MASTER_CONTACT_TEMPLATE_URL} download className="btn btn-template btn-sm contact-upload-modal__template-link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Template
            </a>
            <button
              type="button"
              className="btn btn-primary contact-upload-modal__upload-btn"
              disabled={!fileName || isUploading}
              onClick={() => void handleUpload()}
            >
              {isUploading ? (
                <>
                  <span className="contact-upload-modal__spinner" />
                  Uploading…
                </>
              ) : 'Upload'}
            </button>
          </div>
        </div>
      ) : (
        <div className="contact-upload-modal">
          <div className="contact-upload-modal__summary">
            <span className="badge badge-success contact-upload-modal__badge">
              {insertedCount} inserted
            </span>
            {duplicates.length > 0 && (
              <span className="badge badge-warning contact-upload-modal__badge">
                {duplicates.length} duplicate{duplicates.length !== 1 ? 's' : ''} skipped
              </span>
            )}
          </div>

          {duplicates.length > 0 && (
            <>
              <p className="contact-upload-modal__description">
                The following rows were skipped because a contact with the same Personal Number already exists:
              </p>
              <div className="contact-upload-modal__duplicate-table-wrap">
                <table className="custom-table contact-upload-modal__duplicate-table">
                  <thead>
                    <tr>
                      <th style={{ width: '48px' }}>Row</th>
                      <th>Name</th>
                      <th>Personal No.</th>
                      <th>Existing Sreni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {duplicates.map((d) => (
                      <tr key={`${d.rowIndex}-${d.personalNumber}`}>
                        <td style={{ textAlign: 'center', color: 'var(--text-secondary-dark)' }}>{d.rowIndex}</td>
                        <td>{d.name ?? <span style={{ opacity: 0.4 }}>—</span>}</td>
                        <td style={{ fontFamily: 'monospace' }}>{d.personalNumber ?? <span style={{ opacity: 0.4 }}>—</span>}</td>
                        <td>
                          {d.existingSreniId ? (
                            <span className="contact-upload-modal__sreni-tag">
                              {duplicateSreniById?.get(d.existingSreniId) ?? d.existingSreniId}
                            </span>
                          ) : (
                            <span style={{ opacity: 0.4 }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="contact-upload-modal__actions contact-upload-modal__actions--end">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Done</button>
          </div>
        </div>
      )}
    </Modal>
  );
};
