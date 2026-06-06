import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { clearSetupUnitBypass } from "../../utils/jwtResidentialUnit";
import {
  SetupStatusFetchError,
  applyBusinessSetupCompleteFromStatus,
  clearLocalBusinessSetupComplete,
  fetchSetupStatus,
} from "../../utils/setupApi";
import { resendConfirmationEmail } from "../../utils/confirmationResendApi";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const fromSignup = (
      location.state as { pendingConfirmationEmail?: string } | null
    )?.pendingConfirmationEmail?.trim();
    if (fromSignup) {
      setEmail(fromSignup);
      setInfo(
        "Conta criada. Verifique o e-mail de confirmação ou use «Reenviar confirmação» abaixo.",
      );
      navigate("/signin", { replace: true, state: null });
      return;
    }

    if (searchParams.get("error") === "activation_failed") {
      setError("Link de ativação inválido ou expirado.");
      setInfo("");
      const next = new URLSearchParams(searchParams);
      next.delete("error");
      setSearchParams(next, { replace: true });
      return;
    }
    if (searchParams.get("message") === "password_set") {
      setInfo("Senha definida. Faça login.");
      setError("");
      const next = new URLSearchParams(searchParams);
      next.delete("message");
      setSearchParams(next, { replace: true });
    }
  }, [location.state, navigate, searchParams, setSearchParams]);

  const handleResendConfirmation = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Indique o e-mail acima.");
      return;
    }
    setError("");
    setInfo("");
    setIsResending(true);
    try {
      const message = await resendConfirmationEmail(trimmed);
      setInfo(message);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível reenviar o e-mail.",
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/v1/login_check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao entrar");
      }

      const data = await response.json();
      clearSetupUnitBypass();
      clearLocalBusinessSetupComplete();
      localStorage.setItem("token", data.token);

      try {
        const status = await fetchSetupStatus(data.token);
        applyBusinessSetupCompleteFromStatus(status);
      } catch (e: unknown) {
        if (
          e instanceof SetupStatusFetchError &&
          e.statusCode === 401
        ) {
          localStorage.removeItem("token");
          setError("Sessão inválida ao verificar o estado inicial.");
          return;
        }
      }
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Falha ao entrar";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const busy = isLoading || isResending;

  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-10 mx-auto">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5" />
          Voltar ao painel
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Entrar
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Digite seu e-mail e senha para entrar!
            </p>
          </div>
          <div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <Label>
                    E-mail <span className="text-error-500">*</span>{" "}
                  </Label>
                  <Input
                    type="email"
                    placeholder="info@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>
                    Senha <span className="text-error-500">*</span>{" "}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Digite sua senha"
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
                {info && (
                  <div className="p-3 text-sm text-center text-green-800 rounded-lg bg-green-50 dark:bg-green-900/20 dark:text-green-300">
                    {info}
                  </div>
                )}
                {error && (
                  <div className="text-sm text-center text-error-500">
                    {error}
                  </div>
                )}
                <div>
                  <Button className="w-full" size="sm" disabled={busy}>
                    {isLoading ? "Entrando..." : "Entrar"}
                  </Button>
                </div>
              </div>
            </form>

            <p className="mt-5 text-sm text-center text-gray-600 dark:text-gray-400 sm:text-start">
              Conta ainda não ativada?{" "}
              <button
                type="button"
                onClick={() => void handleResendConfirmation()}
                disabled={busy}
                className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 disabled:opacity-50"
              >
                {isResending
                  ? "A reenviar confirmação…"
                  : "Reenviar confirmação"}
              </button>
              <span className="block mt-1 text-gray-500">
                Reenvia o e-mail de ativação para o endereço indicado acima.
              </span>
            </p>

            <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                Não tem uma conta?{" "}
                <Link
                  to="/signup"
                  className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  Cadastre-se
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
