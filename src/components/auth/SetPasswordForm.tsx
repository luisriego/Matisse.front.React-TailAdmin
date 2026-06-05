import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { setUserPasswordWithToken } from "../../utils/userPasswordApi";

const MIN_PASSWORD_LEN = 6;

export default function SetPasswordForm() {
  const { userId, token } = useParams<{ userId: string; token: string }>();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const paramsMissing = !userId?.trim() || !token?.trim();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (paramsMissing) {
      setError("Link inválido. Solicite um novo convite ao síndico.");
      return;
    }

    if (password.length < MIN_PASSWORD_LEN) {
      setError(`A senha deve ter pelo menos ${MIN_PASSWORD_LEN} caracteres.`);
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setIsLoading(true);
    try {
      await setUserPasswordWithToken(userId!, token!, password);
      navigate("/signin?message=password_set", { replace: true });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Não foi possível definir a senha.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (paramsMissing) {
    return (
      <div className="flex flex-col flex-1 w-full max-w-md mx-auto justify-center">
        <div className="p-4 text-sm text-center text-red-800 rounded-lg bg-red-50 dark:bg-red-900/20 dark:text-red-300">
          Link inválido. Verifique o endereço do e-mail ou contacte o síndico.
        </div>
        <p className="mt-4 text-sm text-center">
          <Link
            to="/signin"
            className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
          >
            Ir para entrar
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-10 mx-auto">
        <Link
          to="/signin"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5" />
          Voltar ao entrar
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Defina sua senha
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Escolha uma senha para aceder à sua unidade no Matisse.
            </p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <Label>
                  Nova senha <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                  >
                    {showPassword ? (
                      <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                    )}
                  </span>
                </div>
              </div>
              <div>
                <Label>
                  Confirmar senha <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repita a senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <span
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                  >
                    {showConfirm ? (
                      <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                    )}
                  </span>
                </div>
              </div>
              {error && (
                <div className="text-sm text-center text-error-500">{error}</div>
              )}
              <div>
                <Button className="w-full" size="sm" disabled={isLoading}>
                  {isLoading ? "A guardar…" : "Definir senha"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
