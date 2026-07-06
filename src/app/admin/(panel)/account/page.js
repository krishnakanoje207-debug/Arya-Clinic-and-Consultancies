import ChangePasswordForm from "@/components/admin/ChangePasswordForm";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  return (
    <div className="space-y-6 max-w-md">
      <h1 className="font-display text-2xl text-sage-deep font-semibold">
        Account
      </h1>
      <ChangePasswordForm />
    </div>
  );
}
