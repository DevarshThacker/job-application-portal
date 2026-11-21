import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { errorMessage } from '../services/api';
import { Button, Field, Card } from '../components/ui';
import { roleHome } from '../utils/format';

export default function Register({ role = 'CANDIDATE' }) {
  const isRec = role === 'RECRUITER';
  const { user, register: signup } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [formError, setFormError] = useState('');
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({ defaultValues: { name: '', email: '', password: '', confirm: '', companyName: '' } });
  if (user) return <Navigate to={roleHome(user.role)} replace />;

  const submit = async (v) => {
    setFormError('');
    try {
      const u = await signup({ name: v.name, email: v.email, password: v.password, role, ...(isRec ? { companyName: v.companyName } : {}) });
      toast.success('Account created. Welcome to HireFlow!');
      nav(roleHome(u.role), { replace: true });
    } catch (e) { setFormError(errorMessage(e)); }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12">
      <h1 className="text-center text-2xl font-bold text-slate-900">{isRec ? 'Create a recruiter account' : 'Create your candidate account'}</h1>
      <p className="mt-1 text-center text-sm text-slate-500">{isRec ? 'Post jobs and manage applicants' : 'Apply to jobs and track your progress'}</p>
      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
          {formError && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
          <Field label="Full name" autoComplete="name" error={errors.name?.message} {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'At least 2 characters' } })} />
          {isRec && <Field label="Company name" error={errors.companyName?.message} {...register('companyName', { required: 'Company name is required' })} />}
          <Field label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' } })} />
          <Field label="Password" type="password" autoComplete="new-password" hint="At least 8 characters with a letter and a number" error={errors.password?.message}
            {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'At least 8 characters' }, validate: (v) => (/[A-Za-z]/.test(v) && /\d/.test(v)) || 'Must contain a letter and a number' })} />
          <Field label="Confirm password" type="password" autoComplete="new-password" error={errors.confirm?.message}
            {...register('confirm', { required: 'Please confirm your password', validate: (v) => v === watch('password') || 'Passwords do not match' })} />
          <Button type="submit" loading={isSubmitting} className="w-full">Create account</Button>
        </form>
      </Card>
      <p className="mt-4 text-center text-sm text-slate-500">Already registered? <Link to="/login" className="font-medium text-brand-600">Log in</Link></p>
      <p className="mt-1 text-center text-sm text-slate-500">{isRec ? <Link to="/register" className="font-medium text-brand-600">Looking for a job? Register as a candidate</Link> : <Link to="/register/recruiter" className="font-medium text-brand-600">Hiring? Register as a recruiter</Link>}</p>
    </div>
  );
}
