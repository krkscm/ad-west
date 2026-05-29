import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ToastProvider } from '../common/Toast';
import { ImportReconciliationPanel } from './ImportReconciliationPanel';
import { backendApi } from '../../utils/backendApi';

vi.mock('../../utils/backendApi', () => ({
  backendApi: {
    listImports: vi.fn(),
    getImportReconciliation: vi.fn(),
    markImportFailed: vi.fn(),
    finalizeImport: vi.fn(),
  },
}));

const renderWithProviders = () => {
  return render(
    <ToastProvider>
      <ImportReconciliationPanel />
    </ToastProvider>,
  );
};

describe('ImportReconciliationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads imports and reconciliation for selected import', async () => {
    vi.mocked(backendApi.listImports).mockResolvedValue([
      {
        id: 'imp_1',
        fileName: 'batch.csv',
        fileType: 'csv',
        status: 'ready_for_review',
        acceptedRows: 10,
        duplicateRows: 1,
        processedRows: 11,
        validationErrorRows: 0,
      },
    ]);

    vi.mocked(backendApi.getImportReconciliation).mockResolvedValue({
      importId: 'imp_1',
      status: 'ready_for_review',
      totalDuplicates: 1,
      pendingDuplicates: 0,
      mergedDuplicates: 1,
      skippedDuplicates: 0,
      canFinalize: true,
      issues: [],
    });

    renderWithProviders();

    await waitFor(() => {
      expect(backendApi.listImports).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByText('Load Reconciliation'));

    await waitFor(() => {
      expect(backendApi.getImportReconciliation).toHaveBeenCalledWith('imp_1');
    });

    expect(screen.getByText(/canFinalize=true/i)).toBeInTheDocument();
  });
});
