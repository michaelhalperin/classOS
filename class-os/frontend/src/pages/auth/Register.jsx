import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { registerUser } from "../../api/auth.js";
import AppLogoMark from "../../components/branding/AppLogoMark.jsx";
import {
  TEACHER_CLASSES_ROUTE,
  STUDENT_CLASSES_ROUTE,
} from "../../utils/classScopePaths.js";

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ defaultValues: { role: "student" } });

  const password = watch("password");

  const mutation = useMutation({
    mutationFn: registerUser,
    onSuccess: (data) => {
      login(data.token, data.user);
      if (data.user.role === "teacher") {
        navigate(TEACHER_CLASSES_ROUTE);
      } else {
        navigate(STUDENT_CLASSES_ROUTE);
      }
    },
  });

  const onSubmit = (data) => {
    mutation.mutate({
      name: data.name.trim(),
      email: data.email.trim(),
      password: data.password,
      role: data.role,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <AppLogoMark height={64} className="mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Class OS
          </h1>
          <p className="mt-2 text-gray-600">Create an account</p>
        </div>

        <div className="card shadow-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">Full name</label>
              <input
                {...register("name", { required: "Name is required" })}
                type="text"
                className="input"
                placeholder="Alex Smith"
                autoComplete="name"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="label">Email</label>
              <input
                {...register("email", { required: "Email is required" })}
                type="email"
                className="input"
                placeholder="you@class.com"
                autoComplete="email"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="label">Password</label>
              <input
                {...register("password", {
                  required: "Password is required",
                  minLength: { value: 6, message: "At least 6 characters" },
                })}
                type="password"
                className="input"
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div>
              <label className="label">Confirm password</label>
              <input
                {...register("confirmPassword", {
                  validate: (v) => v === password || "Passwords do not match",
                })}
                type="password"
                className="input"
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <div>
              <label className="label">I am a</label>
              <select
                {...register("role", { required: true })}
                className="input"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>

            {mutation.isError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {mutation.error?.response?.data?.message ||
                  "Registration failed. Please try again."}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full py-2.5"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
