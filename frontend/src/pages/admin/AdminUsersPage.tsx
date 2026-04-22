import { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, UserX, UserCheck, KeyRound, Plus } from 'lucide-react';
import {
  listAdminUsers,
  createAdminUser,
  updateAdminUser,
  deactivateAdminUser,
  activateAdminUser,
  resetAdminUserPassword,
} from '../../services/adminService';
import type { AdminUpdateUserPayload, AdminUserRow, UserRole } from '../../types';
import RoleBadge from '../../components/admin/RoleBadge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useToastStore } from '../../store/toastStore';

function apiErr(e: unknown): string {
  const ax = e as { response?: { data?: { error?: { message?: string } } } };
  return ax.response?.data?.error?.message ?? 'Request failed';
}

const emptyCreate = {
  name: '',
  email: '',
  password: '',
  role: 'agent' as UserRole,
  city: '',
  company_name: '',
  credit_limit: '',
};

export default function AdminUsersPage() {
  const [items, setItems] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [editRow, setEditRow] = useState<AdminUserRow | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'agent' as UserRole,
    city: '',
    newPassword: '',
    newPasswordConfirm: '',
  });
  const addToast = useToastStore((s) => s.addToast);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAdminUsers({
        page,
        limit: 15,
        search: search || undefined,
        role: roleFilter || undefined,
        is_active: activeFilter === 'active' ? true : activeFilter === 'inactive' ? false : undefined,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      addToast('error', apiErr(e));
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, activeFilter, addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      let creditLimit: number | undefined;
      if (createForm.role === 'agent' && createForm.credit_limit.trim()) {
        const n = parseFloat(createForm.credit_limit);
        if (!Number.isNaN(n)) creditLimit = n;
      }
      await createAdminUser({
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        role: createForm.role,
        city: createForm.city || null,
        company_name: createForm.role === 'agent' ? createForm.company_name || null : undefined,
        credit_limit: creditLimit,
      });
      addToast('success', 'User created');
      setShowCreate(false);
      setCreateForm(emptyCreate);
      void load();
    } catch (err) {
      addToast('error', apiErr(err));
    }
  }

  function openEdit(u: AdminUserRow) {
    setEditRow(u);
    setEditForm({
      name: u.name,
      email: u.email,
      role: u.role,
      city: u.city ?? '',
      newPassword: '',
      newPasswordConfirm: '',
    });
  }

  async function onEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editRow) return;
    const np = editForm.newPassword.trim();
    const nc = editForm.newPasswordConfirm.trim();
    if (np || nc) {
      if (np.length < 6) {
        addToast('error', 'New password must be at least 6 characters');
        return;
      }
      if (np !== nc) {
        addToast('error', 'New password and confirmation do not match');
        return;
      }
    }
    try {
      const payload: AdminUpdateUserPayload = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        city: editForm.city || null,
      };
      if (np) {
        payload.new_password = np;
      }
      await updateAdminUser(editRow.id, payload);
      addToast('success', 'User updated');
      setEditRow(null);
      void load();
    } catch (err) {
      addToast('error', apiErr(err));
    }
  }

  async function onDeactivate(u: AdminUserRow) {
    if (!window.confirm(`Deactivate ${u.name}? They will not be able to sign in.`)) return;
    try {
      await deactivateAdminUser(u.id);
      addToast('success', 'User deactivated');
      void load();
    } catch (err) {
      addToast('error', apiErr(err));
    }
  }

  async function onActivate(u: AdminUserRow) {
    try {
      await activateAdminUser(u.id);
      addToast('success', 'User activated');
      void load();
    } catch (err) {
      addToast('error', apiErr(err));
    }
  }

  async function onResetPassword(u: AdminUserRow) {
    if (!window.confirm(`Send a new temporary password to ${u.email}?`)) return;
    try {
      const res = await resetAdminUserPassword(u.id);
      addToast('success', res.message);
      if (res.temporary_password) {
        window.prompt('Copy temporary password (email not sent):', res.temporary_password);
      }
      void load();
    } catch (err) {
      addToast('error', apiErr(err));
    }
  }

  const pages = Math.max(1, Math.ceil(total / 15));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-48">
            <label className="text-xs text-gray-500 dark:text-gray-400">Search</label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or email" />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Role</label>
            <select
              className="block w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              value={roleFilter}
              onChange={(e) => {
                setPage(1);
                setRoleFilter(e.target.value);
              }}
            >
              <option value="">All</option>
              <option value="agent">Agent</option>
              <option value="sales">Sales</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Status</label>
            <select
              className="block w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              value={activeFilter}
              onChange={(e) => {
                setPage(1);
                setActiveFilter(e.target.value);
              }}
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Apply
          </Button>
        </div>
        <Button type="button" onClick={() => setShowCreate(true)}>
          <Plus size={16} className="inline mr-1" />
          New user
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16 text-teal-600">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/80 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{u.name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{u.email}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{u.city ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          u.is_active
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-500 dark:text-red-400'
                        }
                      >
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      <button
                        type="button"
                        className="p-1.5 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Edit"
                        onClick={() => openEdit(u)}
                      >
                        <Pencil size={16} />
                      </button>
                      {u.is_active ? (
                        <button
                          type="button"
                          className="p-1.5 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Deactivate"
                          onClick={() => void onDeactivate(u)}
                        >
                          <UserX size={16} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="p-1.5 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Activate"
                          onClick={() => void onActivate(u)}
                        >
                          <UserCheck size={16} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="p-1.5 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Reset password"
                        onClick={() => void onResetPassword(u)}
                      >
                        <KeyRound size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500">
          <span>
            Page {page} of {pages} ({total} users)
          </span>
          <div className="space-x-2">
            <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={onCreateSubmit}
            className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-gray-200 dark:border-gray-700"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create user</h2>
            <Input
              required
              placeholder="Full name"
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              required
              type="email"
              placeholder="Email"
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              required
              type="password"
              placeholder="Temporary password"
              value={createForm.password}
              onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
            />
            <div>
              <label className="text-xs text-gray-500">Role</label>
              <select
                className="mt-1 block w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                value={createForm.role}
                onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value as UserRole }))}
              >
                <option value="agent">Agent</option>
                <option value="sales">Sales</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Input
              placeholder="City (optional)"
              value={createForm.city}
              onChange={(e) => setCreateForm((f) => ({ ...f, city: e.target.value }))}
            />
            {createForm.role === 'agent' && (
              <>
                <Input
                  placeholder="Company name (optional)"
                  value={createForm.company_name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, company_name: e.target.value }))}
                />
                <Input
                  placeholder="Credit limit (optional)"
                  value={createForm.credit_limit}
                  onChange={(e) => setCreateForm((f) => ({ ...f, credit_limit: e.target.value }))}
                />
              </>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </div>
          </form>
        </div>
      )}

      {editRow && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={onEditSubmit}
            className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-gray-200 dark:border-gray-700"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit user</h2>
            <Input
              required
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              required
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
            />
            <div>
              <label className="text-xs text-gray-500">Role</label>
              <select
                className="mt-1 block w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                value={editForm.role}
                onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as UserRole }))}
              >
                <option value="agent">Agent</option>
                <option value="sales">Sales</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Input
              placeholder="City"
              value={editForm.city}
              onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-2">
              Login password — leave blank to keep the current password. Use &quot;Reset password&quot; in the table to
              generate a temporary password and email.
            </p>
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="New password (optional, min 6 characters)"
              value={editForm.newPassword}
              onChange={(e) => setEditForm((f) => ({ ...f, newPassword: e.target.value }))}
            />
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="Confirm new password"
              value={editForm.newPasswordConfirm}
              onChange={(e) => setEditForm((f) => ({ ...f, newPasswordConfirm: e.target.value }))}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditRow(null)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
