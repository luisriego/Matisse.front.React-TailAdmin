import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeftIcon } from "../../icons";
import Button from "../ui/button/Button";
import { resendConfirmationEmail } from "../../utils/confirmationResendApi";
import { getPendingConfirmationEmail } from "../../utils/pendingConfirmationEmail";

export default function ResendConfirmationForm() {
  const registeredEmail = getPendingConfirmationEmail();
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleResend = async () => {
    if (!registeredEmail) return;
    setError("");
    setInfo("");
    setIsLoading(true);
    try {
      const message = await resendConfirmationEmail(registeredEmail);
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

  const noContext = !registeredEmail;

  const content = (
    <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
      <div className="mb-5 sm:mb-8">
        <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
          {noContext ? "Confirmação pendente" : "Verifique o seu e-mail"}
        </h1>
        {noContext ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            O reenvio do link de ativação só está disponível logo após o
            cadastro, para o e-mail que acabou de registar. Se já se registou
            noutro dispositivo ou limpou a sessão, faça um novo cadastro ou
            contacte o síndico.
          </p>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enviámos um link de confirmação para o e-mail abaixo. Se não
            chegou, pode pedir um novo envio — apenas para esta conta.
          </p>
        )}
      </div>

      {noContext ? (
        <div className="space-y-4">
          <Link
            to="/signup"
            className="flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white hover:bg-brand-600"
          >
            Ir para cadastro
          </Link>
          <p className="text-sm text-center text-gray-700 dark:text-gray-400">
            <Link
              to="/signin"
              className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
            >
              Voltar a entrar
            </Link>
          </p>
        </div>
      ) : (
        <>
          <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              E-mail registado
            </p>
            <p className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
              {registeredEmail}
            </p>
          </div>
          {info && (
            <div className="mb-4 p-3 text-sm text-green-800 rounded-lg bg-green-50 dark:bg-green-900/20 dark:text-green-300">
              {info}
            </div>
          )}
          {error && (
            <div className="mb-4 text-sm text-center text-error-500">
              {error}
            </div>
          )}
          <Button
            className="w-full"
            size="sm"
            disabled={isLoading}
            onClick={() => void handleResend()}
          >
            {isLoading ? "A enviar…" : "Reenviar e-mail de confirmação"}
          </Button>
          <p className="mt-5 text-sm text-center text-gray-700 dark:text-gray-400 sm:text-start">
            <Link
              to="/signin"
              className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
            >
              Voltar a entrar
            </Link>
          </p>
        </>
      )}
    </div>
  );

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
