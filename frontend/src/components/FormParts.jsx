import { Field, Button } from './ui';
import { TYPE_LABELS } from '../utils/format';
import { useForm } from 'react-hook-form';

export function JobForm({ defaultValues, onSubmit, submitLabel, busy }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { title: '', location: '', employmentType: 'FULL_TIME', salaryRange: '', description: '', requirements: '', ...defaultValues },
  });
  const req = (m, extra = {}) => ({ required: m, ...extra });
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Job title" placeholder="e.g. Senior React Developer" error={errors.title?.message} {...register('title', req('Title is required', { minLength: { value: 3, message: 'At least 3 characters' } }))} />
        <Field label="Location" placeholder="e.g. Remote, Berlin" error={errors.location?.message} {...register('location', req('Location is required'))} />
        <Field label="Employment type" as="select" error={errors.employmentType?.message} {...register('employmentType')}>
          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Field>
        <Field label="Salary range (optional)" placeholder="e.g. $90k–$120k" {...register('salaryRange')} />
      </div>
      <Field label="Description" as="textarea" rows={6} placeholder="What will this person do?" error={errors.description?.message} {...register('description', req('Description is required', { minLength: { value: 20, message: 'At least 20 characters' } }))} />
      <Field label="Requirements" as="textarea" rows={5} placeholder="Skills, experience, qualifications" error={errors.requirements?.message} {...register('requirements', req('Requirements are required', { minLength: { value: 10, message: 'At least 10 characters' } }))} />
      <Button type="submit" loading={busy}>{submitLabel}</Button>
    </form>
  );
}
