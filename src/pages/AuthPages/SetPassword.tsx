import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SetPasswordForm from "../../components/auth/SetPasswordForm";

export default function SetPassword() {
  return (
    <>
      <PageMeta
        title="Definir senha | Matisse"
        description="Defina a senha da sua conta Matisse"
      />
      <AuthLayout>
        <SetPasswordForm />
      </AuthLayout>
    </>
  );
}
