import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { profileApi, errorMessage } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { useToast } from '../context/ToastContext';
import { Button, Field, Card, Spinner, ErrorState } from './ui';

export default function ProfileForm({ role }) {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => profileApi.get(), []);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm();
  useEffect(() => {
    if (!data) return;
    const c = data.candidateProfile || {}; const r = data.recruiterProfile || {};
    reset({ name: data.name, phone: c.phone || '', location: c.location || '', skills: c.skills || '', education: c.education || '', bio: c.bio || '', companyName: r.companyName || '', companyDescription: r.companyDescription || '', website: r.website || '' });
  }, [data, reset]);

  if (loading && !data) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const submit = async (v) => {
    try { await profileApi.update(v); toast.success('Profile saved'); reload(); } catch (e) { toast.error(errorMessage(e)); }
  };
  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit(submit)} noValidate className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" error={errors.name?.message} {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'At least 2 characters' } })} />
          <Field label="Email" value={data.email} disabled readOnly onChange={() => {}} hint="Email cannot be changed" />
          {role === 'CANDIDATE' ? (
            <>
              <Field label="Phone" {...register('phone')} />
              <Field label="Location" {...register('location')} />
              <Field label="Skills" className="sm:col-span-2" hint="Comma-separated, e.g. React, Node.js, SQL" {...register('skills')} />
              <Field label="Education" className="sm:col-span-2" {...register('education')} />
              <Field label="About me" as="textarea" rows={4} className="sm:col-span-2" {...register('bio')} />
            </>
          ) : (
            <>
              <Field label="Company name" error={errors.companyName?.message} {...register('companyName', { required: 'Company name is required' })} />
              <Field label="Website" placeholder="https://" error={errors.website?.message} {...register('website', { pattern: { value: /^https?:\/\/\S+$/i, message: 'Must start with http:// or https://' } })} />
              <Field label="Company description" as="textarea" rows={4} className="sm:col-span-2" {...register('companyDescription')} />
            </>
          )}
        </div>
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>Save changes</Button>
      </form>
    </Card>
  );
}
