import React, { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { useToast } from './Toast';
import { backendApi } from '../../utils/backendApi';
import { ContactUploadReviewModal, type ContactUploadReviewState } from './ContactUploadReviewModal';

export const GLOBAL_CONTACT_UPLOAD_DESCRIPTION = (
  <>
    Upload the <strong>Member Data</strong> Excel template. This updates member data org-wide; Yes/No Sreni columns
    determine membership. You will review duplicates before importing.
  </>
);

export const SRENI_CONTACT_UPLOAD_DESCRIPTION = (
  <>
    Upload the <strong>Member Data</strong> Excel template. This processes the full file org-wide (Option B); Yes/No
    columns determine which Srenis each family belongs to. Review duplicates before importing.
  </>
);

export const STHAN_CONTACT_UPLOAD_DESCRIPTION = SRENI_CONTACT_UPLOAD_DESCRIPTION;

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  return match?.[1] ?? error.message ?? fallback;
};

export interface ContactUploadResult {
  inserted: number;
  updated?: number;
  skipped?: number;
}

interface ContactUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: (result: ContactUploadResult) => void;
  previewUpload: (file: File) => ReturnType<typeof backendApi.previewMemberContactUpload>;
  description: React.ReactNode;
  title?: string;
}

export const ContactUploadModal: React.FC<ContactUploadModalProps> = ({
  isOpen,
  onClose,
  onUploaded,
  previewUpload,
  description,
  title = 'Upload Contacts',
}) => {
  const { addToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [review, setReview] = useState<ContactUploadReviewState | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFileName('');
      setReview(null);
      setReviewOpen(false);
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileName(e.target.files?.[0]?.name ?? '');
    setReview(null);
    setReviewOpen(false);
  };

  const handlePreview = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const preview = await previewUpload(file);
      setReview({
        rows: preview.rows,
        duplicates: preview.duplicates,
        withinFileDuplicates: preview.withinFileDuplicates,
        sourceFile: file.name,
      });
      setReviewOpen(true);
      onClose();
    } catch (err) {
      addToast(toUiError(err, 'Preview failed.'), 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const blob = await backendApi.downloadMemberContactTemplate();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Member_Data_Upload_Template.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      addToast(toUiError(err, 'Template download failed.'), 'error');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleCommit = async (decisions: Parameters<typeof backendApi.commitMemberContactUpload>[0]) => {
    if (!review) return;
    setIsCommitting(true);
    try {
      const result = await backendApi.commitMemberContactUpload(decisions, review.sourceFile);
      addToast(
        `Imported ${result.inserted} new, updated ${result.updated}, skipped ${result.skipped}.`,
        'success',
      );
      onUploaded({
        inserted: result.inserted + result.updated,
        updated: result.updated,
        skipped: result.skipped,
      });
      setReviewOpen(false);
      setReview(null);
      if (fileRef.current) fileRef.current.value = '';
      setFileName('');
    } catch (err) {
      addToast(toUiError(err, 'Import failed.'), 'error');
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="500px">
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
            <button
              type="button"
              className="btn btn-template btn-sm contact-upload-modal__template-link"
              disabled={downloadingTemplate}
              onClick={() => void handleDownloadTemplate()}
            >
              {downloadingTemplate ? 'Downloading…' : 'Template'}
            </button>
            <button
              type="button"
              className="btn btn-primary contact-upload-modal__upload-btn"
              disabled={!fileName || isUploading}
              onClick={() => void handlePreview()}
            >
              {isUploading ? (
                <>
                  <span className="contact-upload-modal__spinner" />
                  Parsing…
                </>
              ) : 'Upload & Review'}
            </button>
          </div>
        </div>
      </Modal>

      <ContactUploadReviewModal
        isOpen={reviewOpen}
        onClose={() => setReviewOpen(false)}
        review={review}
        committing={isCommitting}
        onCommit={handleCommit}
      />
    </>
  );
};
