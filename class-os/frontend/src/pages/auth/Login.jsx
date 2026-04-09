import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { loginUser } from '../../api/auth.js';
import AppLogoMark from '../../components/branding/AppLogoMark.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm();

  const mutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      login(data.token, data.user);
      if (data.user.role === 'teacher') {
        navigate('/teacher/classes');
      } else {
        navigate('/student/curriculum');
      }
    },
  });

  const onSubmit = (data) => mutation.mutate(data);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <AppLogoMark height={64} className="mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Class OS</h1>
          <p className="mt-2 text-gray-600">Sign in to your account</p>
        </div>

        <div className="card shadow-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">Email</label>
              <input
                {...register('email', { required: 'Email is required' })}
                type="email"
                className="input"
                placeholder="you@class.com"
                autoComplete="email"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <input
                {...register('password', { required: 'Password is required' })}
                type="password"
                className="input"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            {mutation.isError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {mutation.error?.response?.data?.message || 'Login failed. Please try again.'}
              </div>
            )}

            <button type="submit" className="btn-primary w-full py-2.5" disabled={mutation.isPending}>
              {mutation.isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            No account?{' '}
            <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700">
              Sign up
            </Link>
          </p>

          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center mb-2 font-medium">Demo accounts</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
              <div className="bg-gray-50 rounded-md p-2">
                <p className="font-medium text-gray-700">Teacher</p>
                <p>teacher@class.com</p>
                <p>password123</p>
              </div>
              <div className="bg-gray-50 rounded-md p-2">
                <p className="font-medium text-gray-700">Student</p>
                <p>student1@class.com</p>
                <p>password123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
