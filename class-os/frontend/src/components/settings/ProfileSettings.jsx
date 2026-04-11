import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  deleteAccount,
  getCurrentUser,
  updateCurrentUser,
} from "../../api/auth.js";
import { useAuth } from "../../context/AuthContext.jsx";

function LogoutConfirmDialog({ open, onCancel, onConfirm }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
        aria-describedby="logout-confirm-desc"
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="logout-confirm-title"
          className="text-lg font-semibold text-gray-900"
        >
          Log out?
        </h3>
        <p id="logout-confirm-desc" className="mt-2 text-sm text-gray-600">
          You&apos;ll need to sign in again to use Class OS in this tab.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn-secondary w-full sm:w-auto"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary w-full sm:w-auto"
            onClick={onConfirm}
          >
            Log out
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function AccountSessionBanner({ profile }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const name = profile?.name ?? user?.name;
  const email = profile?.email ?? user?.email;
  const role = profile?.role ?? user?.role;
  const initial = (name || email || "?").trim().charAt(0).toUpperCase() || "?";

  const closeLogoutDialog = useCallback(() => setLogoutOpen(false), []);
  const confirmLogout = useCallback(() => {
    setLogoutOpen(false);
    logout();
    navigate("/login");
  }, [logout, navigate]);

  return (
    <>
      <div className="flex w-full flex-col gap-4 rounded-2xl border border-gray-200/90 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-6 md:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-50 text-base font-bold text-brand-800"
            aria-hidden
          >
            {initial}
          </div>
          <div className="min-w-0 pt-0.5">
            <p className="truncate text-lg font-semibold text-gray-900">
              {name || "Account"}
            </p>
            {email ? (
              <p className="truncate text-sm text-gray-500">{email}</p>
            ) : null}
            {role ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-700">
                  {role}
                </span>
              </div>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setLogoutOpen(true)}
          className="btn-secondary shrink-0 self-stretch py-2.5 text-sm sm:self-center sm:px-5"
        >
          Log out
        </button>
      </div>
      <LogoutConfirmDialog
        open={logoutOpen}
        onCancel={closeLogoutDialog}
        onConfirm={confirmLogout}
      />
    </>
  );
}

function AccountDangerZone({ role }) {
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { logout } = useAuth();

  const deleteMut = useMutation({
    mutationFn: () => deleteAccount(password),
    onSuccess: () => {
      setPassword("");
      logout();
      navigate("/login");
    },
  });

  const blurb =
    role === "teacher"
      ? "Permanently deletes your teacher account and every class you own—including lessons, assignments, quizzes, and related student work. Students keep their accounts but lose access to those classes."
      : "Permanently deletes your student account, removes you from all classes, and deletes your submissions, quiz attempts, notes, and lesson progress stored on our servers.";

  const handleDeleteClick = () => {
    if (!password.trim()) {
      window.alert("Enter your current password first.");
      return;
    }
    const ok = window.confirm(
      role === "teacher"
        ? "Delete your account and all classes you teach? This cannot be undone."
        : "Delete your student account and all of your data on Class OS? This cannot be undone.",
    );
    if (!ok) return;
    deleteMut.mutate();
  };

  return (
    <section
      className="rounded-2xl border border-red-200 bg-red-50/50 p-5 md:p-6"
      aria-labelledby="danger-zone-heading"
    >
      <h2
        id="danger-zone-heading"
        className="text-base font-semibold text-red-950 md:text-lg"
      >
        Danger zone
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-red-900/85">{blurb}</p>
      <div className="mt-5 max-w-md space-y-3">
        <div>
          <label
            htmlFor="delete-account-password"
            className="label text-gray-900"
          >
            Confirm with your password
          </label>
          <input
            id="delete-account-password"
            type="password"
            className="input border-red-200/80 bg-white focus:border-red-400 focus:ring-red-200"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="Current password"
          />
        </div>
        <button
          type="button"
          className="btn-danger w-full sm:w-auto"
          disabled={deleteMut.isPending}
          onClick={handleDeleteClick}
        >
          {deleteMut.isPending ? "Deleting…" : "Delete my account"}
        </button>
        {deleteMut.isError ? (
          <p className="text-sm text-red-700" role="alert">
            {deleteMut.error?.response?.data?.message ||
              "Could not delete account."}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export default function ProfileSettings({ description, aside = null }) {
  const { updateUser } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["me"],
    queryFn: getCurrentUser,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      email: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const newPwd = watch("newPassword");

  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name ?? "",
        email: profile.email ?? "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  }, [profile, reset]);

  const mutation = useMutation({
    mutationFn: updateCurrentUser,
    onSuccess: (updated) => {
      updateUser(updated);
      queryClient.setQueryData(["me"], updated);
      reset({
        name: updated.name,
        email: updated.email,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
  });

  const onSubmit = (values) => {
    mutation.reset();
    const payload = {
      name: values.name?.trim(),
      email: values.email?.trim(),
    };
    if (values.newPassword) {
      payload.currentPassword = values.currentPassword;
      payload.newPassword = values.newPassword;
    }
    mutation.mutate(payload);
  };

  if (isError) {
    const msg =
      error?.response?.data?.message ||
      error?.message ||
      "Could not load your profile.";
    return (
      <div className="w-full">
        <AccountSessionBanner profile={null} />
        <div className="rounded-2xl border border-red-200 bg-red-50/80 px-5 py-4 text-red-800 md:px-6">
          <p className="text-sm">{msg}</p>
          <button
            type="button"
            className="btn-secondary mt-4"
            onClick={() => refetch()}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (isLoading && !profile) {
    const skeletonMain = (
      <>
        <div className="flex w-full animate-pulse flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 sm:flex-row sm:justify-between md:p-6">
          <div className="flex flex-1 gap-4">
            <div className="h-12 w-12 shrink-0 rounded-full bg-gray-100" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-5 w-40 rounded bg-gray-100" />
              <div className="h-4 w-56 rounded bg-gray-100" />
            </div>
          </div>
          <div className="h-10 w-24 shrink-0 rounded-lg bg-gray-100" />
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 animate-pulse">
          <div className="mb-4 h-6 w-1/3 rounded bg-gray-100" />
          <div className="mb-3 h-10 rounded bg-gray-100" />
          <div className="h-10 rounded bg-gray-100" />
        </div>
      </>
    );

    return (
      <div className="w-full">
        {aside ? (
          <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
            <div className="space-y-6 lg:col-span-8">{skeletonMain}</div>
            <div className="lg:col-span-4">{aside}</div>
          </div>
        ) : (
          <div className="space-y-6">{skeletonMain}</div>
        )}
      </div>
    );
  }

  const mainColumn = (
    <>
      <AccountSessionBanner profile={profile} />
      {description ? (
        <p className="text-sm leading-relaxed text-gray-600 md:text-[0.9375rem]">
          {description}
        </p>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div
          className={`grid grid-cols-1 gap-6 md:gap-6 lg:items-start lg:gap-8 ${
            aside ? "" : "lg:grid-cols-2"
          }`}
        >
          <div className="min-h-0 w-full space-y-4 rounded-2xl border border-gray-200/90 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-base font-semibold text-gray-900 md:text-lg">
              Profile
            </h2>
            <div>
              <label className="label">Display name</label>
              <input
                {...register("name", { required: "Name is required" })}
                type="text"
                className="input"
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
                autoComplete="email"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>
          </div>

          <div className="min-h-0 w-full space-y-4 rounded-2xl border border-gray-200/90 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-base font-semibold text-gray-900 md:text-lg">
              Security
            </h2>
            <p className="text-sm text-gray-500">
              Leave blank to keep your current password.
            </p>
            <div>
              <label className="label">Current password</label>
              <input
                {...register("currentPassword", {
                  validate: (v) =>
                    !watch("newPassword") ||
                    (v && v.length > 0) ||
                    "Required to change password",
                })}
                type="password"
                className="input"
                autoComplete="current-password"
              />
              {errors.currentPassword && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>
            <div>
              <label className="label">New password</label>
              <input
                {...register("newPassword", {
                  minLength: { value: 6, message: "At least 6 characters" },
                })}
                type="password"
                className="input"
                autoComplete="new-password"
              />
              {errors.newPassword && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.newPassword.message}
                </p>
              )}
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input
                {...register("confirmPassword", {
                  validate: (v) =>
                    !newPwd || v === newPwd || "Passwords do not match",
                })}
                type="password"
                className="input"
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {mutation.isError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 w-full">
            {mutation.error?.response?.data?.message ||
              "Could not save changes."}
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
          <button
            type="submit"
            className="btn-primary w-full sm:w-auto"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>

      <AccountDangerZone role={profile.role} />
    </>
  );

  return (
    <div className="w-full">
      {aside ? (
        <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
          <div className="min-w-0 space-y-6 lg:col-span-8">{mainColumn}</div>
          <aside className="min-w-0 lg:col-span-4">{aside}</aside>
        </div>
      ) : (
        <div className="space-y-6">{mainColumn}</div>
      )}
    </div>
  );
}
