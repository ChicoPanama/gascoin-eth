import { redirect } from 'next/navigation';
import { verifyAdminSession } from '../actions/admin-auth';

export default async function AdminPage() {
  const session = await verifyAdminSession();
  if (!session.valid) redirect('/admin/login');
  redirect('/admin/submissions');
}
