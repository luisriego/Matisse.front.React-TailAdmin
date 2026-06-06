import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeftIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { resendConfirmationEmail } from "../../utils/confirmationResendApi";

type ResendConfirmationFormProps = {
  /** Oculta cabeçalho e link «voltar» (ex.: após cadastro no mesmo layout). */
  embedded?: boolean;
  initialEmail?: string;
};

export default function ResendConfirmationForm({
  embedded = false,
  initialEmail = "",
}: ResendConfirmationFormProps) {
  const [searchParams] = useSearchParams();
  const emailFromQuery = searchParams.get("email") ?? "";
  const [email, setEmail] = useState(initialEmail || emailFromQuery);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fromQuery = searchParams.get("email");
    if (fromQuery) setEmail(fromQuery);
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setInfo("");

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Indique o seu e-mail.");
      return;
    }

    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  const content = (
    <div className={embedded ? "" : "flex flex-col justify-center flex-1 w-full max-w-md mx-auto"}>
      {!embedded && (
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            Reenviar confirmação
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Não recebeu o e-mail de ativação? Informe o seu e-mail e enviaremos
            um novo link se a conta ainda estiver pendente.
          </p>
        </div>
      )}
      {embedded && (
        <div className="mb-4">
          <h2 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
            Verifique o seu e-mail
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enviámos um link de confirmação. Se não chegou, pode pedir outro
            abaixo.
          </p>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="space-y-5">
          <div>
            <Label>
              E-mail <span className="text-error-500">*</span>
            </Label>
            <Input
              type="email"
              placeholder="Digite seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          {info && (
            <div className="p-3 text-sm text-green-800 rounded-lg bg-green-50 dark:bg-green-900/20 dark:text-green-300">
              {info}
            </div>
          )}
          {error && (
            <div className="text-sm text-center text-error-500">{error}</div>
          )}
          <Button className="w-full" size="sm" disabled={isLoading}>
            {isLoading ? "A enviar…" : "Reenviar e-mail de confirmação"}
          </Button>
        </div>
      </form>
      <p className="mt-5 text-sm text-center text-gray-700 dark:text-gray-400 sm:text-start">
        <Link
          to="/signin"
          className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
        >
          Voltar a entrar
        </Link>
      </p>
    </div>
  );

  if (embedded) return content;

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar">
      <div className="w-full max-w-md mx-auto mb-5 sm:pt-10">
        <Link
          to="/signin"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5" />
          Voltar ao entrar
        </Link>
      </div>
      {content}
    </div>
  );
}
