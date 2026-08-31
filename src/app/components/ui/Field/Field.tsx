import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { useId } from 'react';
import { cx } from '../../../lib/cx';
import './field.css';

type FieldProps = {
  children: (id: string) => ReactNode;
  error?: string;
  hint?: string;
  label: string;
  required?: boolean;
};

export function Field({ children, error, hint, label, required }: FieldProps) {
  const id = useId();

  return (
    <div className={cx('field', error && 'field--error')}>
      <label className="field__label" htmlFor={id}>
        {label}
        {required && (
          <span aria-hidden="true" className="field__required">
            *
          </span>
        )}
      </label>
      {children(id)}
      {error ? (
        <p className="field__message field__message--error" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="field__message">{hint}</p>
      )}
    </div>
  );
}

export function Input({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx('control', className)} {...rest} />;
}

export function Textarea({
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cx('control', 'control--textarea', className)}
      {...rest}
    />
  );
}

export function Select({
  children,
  className,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx('control', 'control--select', className)} {...rest}>
      {children}
    </select>
  );
}
