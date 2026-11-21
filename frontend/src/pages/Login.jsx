import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { errorMessage } from '../services/api';
import { Button, Field, Card } from '../components/ui';
import { roleHome } from '../utils/format';

export default function Login() {
  const { user, login } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const [formError, setFormError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues: { email: '', password: '' } });
  if (user) return <Navigate to={roleHome(user.role)} replace />;

  const submit = async (v) => {
    setFormError('');
    try {
      const u = await login(v);
      toast.success(`Welcome back, ${u.name.split(' ')[0]}!`);
      nav(loc.state?.from || roleHome(u.role), { replace: true });
    } catch (e) { setFormError(errorMessage(e)); }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14">
      <h1 className="text-center text-2xl font-bold text-slate-900">Welcome back</h1>
      <p className="mt-1 text-center text-sm text-slate-500">Log in to your HireFlow account</p>
      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
          {formError && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
          <Field label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' } })} />
          <Field label="Password" type="password" autoComplete="current-password" error={errors.password?.message} {...register('password', { required: 'Password is required' })} />
          <Button type="submit" loading={isSubmitting} className="w-full">Log in</Button>
        </form>
      </Card>
      <p className="mt-4 text-center text-sm text-slate-500">New here? <Link to="/register" className="font-medium text-brand-600">Create an account</Link> · <Link to="/register/recruiter" className="font-medium text-brand-600">Hire talent</Link></p>
    </div>
  );
}
