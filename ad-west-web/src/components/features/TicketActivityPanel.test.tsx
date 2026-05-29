import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ToastProvider } from '../common/Toast';
import { TicketActivityPanel } from './TicketActivityPanel';
import { backendApi } from '../../utils/backendApi';

vi.mock('../../utils/backendApi', () => ({
  backendApi: {
    listHelpdeskTicketActivity: vi.fn(),
  },
}));

const renderWithProviders = () => {
  return render(
    <ToastProvider>
      <TicketActivityPanel />
    </ToastProvider>,
  );
};

describe('TicketActivityPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and displays ticket activity timeline', async () => {
    vi.mocked(backendApi.listHelpdeskTicketActivity).mockResolvedValue([
      {
        id: 'tka_1',
        ticketId: 'tkt_1',
        action: 'status_updated',
        actorId: 'admin_1',
        details: { status: 'resolved' },
        createdAt: '2026-05-25T00:00:00.000Z',
      },
    ]);

    renderWithProviders();

    fireEvent.change(screen.getByPlaceholderText('ticket id'), {
      target: { value: 'tkt_1' },
    });
    fireEvent.click(screen.getByText('Load Activity'));

    await waitFor(() => {
      expect(backendApi.listHelpdeskTicketActivity).toHaveBeenCalledWith('tkt_1');
    });

    expect(screen.getByText('status_updated')).toBeInTheDocument();
    expect(screen.getByText('admin_1')).toBeInTheDocument();
  });
});
