import { HeartPulse } from 'lucide-react';
import LoginForm from './login-form';

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-900 text-white">
            <HeartPulse size={26} />
          </div>
          <h1 className="mt-5 text-2xl font-semibold text-slate-900">CarePlus Administration</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to manage CarePlus Medical Centre.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
