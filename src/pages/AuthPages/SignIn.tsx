import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Entrar | Matisse"
        description="Acesse sua conta Matisse"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
