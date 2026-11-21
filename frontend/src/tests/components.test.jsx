import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { StatusBadge, EmptyState, Pagination, ConfirmDialog } from '../components/ui';
import ProtectedRoute from '../components/ProtectedRoute';
import Login from '../pages/Login';
import Register from '../pages/Register';
import { ToastProvider } from '../context/ToastContext';

const mockAuth = { user: null, loading: false, login: vi.fn(), register: vi.fn(), logout: vi.fn() };
vi.mock('../context/AuthContext', () => ({ useAuth: () => mockAuth }));

beforeEach(() => { Object.assign(mockAuth, { user: null, loading: false }); mockAuth.login.mockReset(); mockAuth.register.mockReset(); });

describe('ui components', () => {
  it('StatusBadge shows readable label', () => {
    render(<StatusBadge status="SHORTLISTED" />);
    expect(screen.getByText('Shortlisted')).toBeInTheDocument();
  });
  it('EmptyState renders title and message', () => {
    render(<EmptyState title="Nothing here">Try later</EmptyState>);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText('Try later')).toBeInTheDocument();
  });
  it('Pagination hides for single page and fires onChange', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<Pagination meta={{ page: 1, totalPages: 1, total: 3 }} onChange={onChange} />);
    expect(screen.queryByRole('navigation')).toBeNull();
    rerender(<Pagination meta={{ page: 1, totalPages: 3, total: 25 }} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(onChange).toHaveBeenCalledWith(2);
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
  });
  it('ConfirmDialog confirms and cancels', async () => {
    const onConfirm = vi.fn(); const onCancel = vi.fn();
    render(<ConfirmDialog open title="Delete?" message="Sure?" confirmLabel="Yes" onConfirm={onConfirm} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: 'Yes' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onConfirm).toHaveBeenCalledTimes(1); expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('ProtectedRoute', () => {
  const tree = (path) => (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>login page</p>} />
        <Route path="/candidate" element={<p>candidate home</p>} />
        <Route element={<ProtectedRoute roles={['RECRUITER']} />}><Route path="/recruiter" element={<p>secret recruiter area</p>} /></Route>
      </Routes>
    </MemoryRouter>
  );
  it('redirects anonymous users to login', () => {
    render(tree('/recruiter'));
    expect(screen.getByText('login page')).toBeInTheDocument();
  });
  it('redirects wrong role to own home', () => {
    mockAuth.user = { role: 'CANDIDATE', name: 'C' };
    render(tree('/recruiter'));
    expect(screen.getByText('candidate home')).toBeInTheDocument();
  });
  it('allows the right role', () => {
    mockAuth.user = { role: 'RECRUITER', name: 'R' };
    render(tree('/recruiter'));
    expect(screen.getByText('secret recruiter area')).toBeInTheDocument();
  });
});

const wrap = (ui) => render(<MemoryRouter><ToastProvider>{ui}</ToastProvider></MemoryRouter>);

describe('Login form', () => {
  it('shows validation errors for empty and malformed input', async () => {
    wrap(<Login />);
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));
    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(mockAuth.login).not.toHaveBeenCalled();
  });
  it('submits valid credentials and shows server error', async () => {
    mockAuth.login.mockRejectedValue({ response: { data: { error: { message: 'Invalid email or password' } } } });
    wrap(<Login />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.co');
    await userEvent.type(screen.getByLabelText('Password'), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));
    await waitFor(() => expect(mockAuth.login).toHaveBeenCalledWith({ email: 'a@b.co', password: 'secret123' }));
    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });
});

describe('Register form', () => {
  it('validates password rules and confirmation', async () => {
    wrap(<Register />);
    await userEvent.type(screen.getByLabelText('Full name'), 'Jo');
    await userEvent.type(screen.getByLabelText('Email'), 'jo@x.co');
    await userEvent.type(screen.getByLabelText('Password'), 'abcdefgh');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'different1');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText('Must contain a letter and a number')).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    expect(mockAuth.register).not.toHaveBeenCalled();
  });
  it('recruiter variant requires a company name', async () => {
    wrap(<Register role="RECRUITER" />);
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText('Company name is required')).toBeInTheDocument();
  });
});
