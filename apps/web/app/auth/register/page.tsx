import { Suspense } from 'react';
import RegisterForm from './register-form';

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse">
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
