import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";

export default function Slips() {
  return (
    <div>
      <PageMeta
        title="Boletos | Matisse - Modelo de Painel de Administração React.js"
        description="Esta é a página de Boletos para Matisse - Modelo de Painel de Administração React.js Tailwind CSS"
      />
      <PageBreadcrumb pageTitle="Boletos" />
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <div className="mx-auto w-full max-w-[630px] text-center">
          <h3 className="mb-4 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">
            Título do Cartão Aqui
          </h3>

          <p className="text-sm text-gray-500 dark:text-gray-400 sm:text-base">
            Comece a colocar conteúdo em grades ou painéis, você também pode usar diferentes combinações de grades. Por favor, confira o painel e outras páginas
          </p>
        </div>
      </div>
    </div>
  );
}
