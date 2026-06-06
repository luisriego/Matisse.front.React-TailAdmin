import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import ResendConfirmationForm from "../../components/auth/ResendConfirmationForm";

export default function ResendConfirmation() {
  return (
    <>
      <PageMeta
        title="Reenviar confirmação | Matisse"
        description="Reenvie o e-mail de ativação da sua conta Matisse"
      />
      <AuthLayout>
        <ResendConfirmationForm />
      </AuthLayout>
    </>
  );
}
