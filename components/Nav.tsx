import Link from 'next/link';
import { AuthNavButton } from './AuthNavButton';
export function Nav(){
  return <div className="nav">
    <Link href="/">Home</Link><Link href="/submit">Submit</Link><Link href="/community">Community</Link>
    <Link href="/dashboard">Treasury</Link><Link href="/admin">Admin</Link>
    <span style={{ marginLeft: 'auto' }}>
      <AuthNavButton />
    </span>
  </div>
}
