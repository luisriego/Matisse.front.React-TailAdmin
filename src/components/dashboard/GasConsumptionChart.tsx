import React, { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

interface GasRow {
  unit: string;
  consumption: number;
}

export default function GasConsumptionChart() {
  const [rows, setRows] = useState<GasRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [gasPrice, setGasPrice] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };

    void (async () => {
      try {
        const [unitsRes, priceRes] = await Promise.allSettled([
          fetch("/api/v1/resident-unit/actives", { headers }).then((r) => (r.ok ? r.json() : null)),
          fetch("/api/v1/gas/price", { headers }).then((r) => (r.ok ? r.json() : null)),
        ]);

        if (priceRes.status === "fulfilled" && priceRes.value) {
          const raw = priceRes.value;
          const p = raw.price_per_m3_in_cents ?? raw.pricePerM3InCents ?? raw.price ?? null;
          if (typeof p === "number") setGasPrice(p);
        }

        if (unitsRes.status === "fulfilled" && unitsRes.value) {
          const units: Array<{ id: string; unit: string }> = Array.isArray(unitsRes.value)
            ? unitsRes.value
            : unitsRes.value.residentUnits ?? unitsRes.value.units ?? [];

          const now = new Date();
          const currYear = now.getFullYear();
          const currMonth = now.getMonth() + 1;
          const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const prevYear = prevDate.getFullYear();
          const prevMonth = prevDate.getMonth() + 1;

          const results = await Promise.allSettled(
            units.map(async (u) => {
              const [prevRes, currRes] = await Promise.allSettled([
                fetch(`/api/v1/gas/resident-units/${u.id}/reading/${prevYear}/${prevMonth}`, { headers }).then((r) => r.ok ? r.json() : null),
                fetch(`/api/v1/gas/resident-units/${u.id}/reading/${currYear}/${currMonth}`, { headers }).then((r) => r.ok ? r.json() : null),
              ]);
              const prev = prevRes.status === "fulfilled" ? prevRes.value : null;
              const curr = currRes.status === "fulfilled" ? currRes.value : null;
              const prevReading = typeof prev?.reading === "number" ? prev.reading : (typeof prev === "number" ? prev : null);
              const currReading = typeof curr?.reading === "number" ? curr.reading : (typeof curr === "number" ? curr : null);
              const consumption = prevReading !== null && currReading !== null ? currReading - prevReading : 0;
              return { unit: u.unit, consumption: consumption > 0 ? consumption : 0 };
            }),
          );

          const gasRows: GasRow[] = results
            .filter((r): r is PromiseFulfilledResult<GasRow> => r.status === "fulfilled")
            .map((r) => r.value)
            .sort((a, b) => b.consumption - a.consumption);

          setRows(gasRows);
        }
      } catch {
        /* silently degrade */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="h-[320px] animate-pulse rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]" />
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-sm text-gray-500 dark:text-gray-400">Sem dados de gás disponíveis</p>
      </div>
    );
  }

  const categories = rows.map((r) => r.unit);
  const data = rows.map((r) => Math.round(r.consumption * 1000) / 1000);

  const options: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      fontFamily: "inherit",
    },
    plotOptions: {
      bar: { horizontal: true, borderRadius: 4, barHeight: "60%" },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val.toLocaleString("pt-BR")} m³`,
      style: { fontSize: "11px" },
    },
    xaxis: {
      categories,
      title: { text: "Consumo (m³)" },
    },
    colors: ["#3b82f6"],
    tooltip: {
      y: {
        formatter: (val: number) => {
          let label = `${val.toLocaleString("pt-BR")} m³`;
          if (gasPrice) {
            const cost = Math.round(val * gasPrice) / 100;
            label += ` ≈ R$ ${cost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
          }
          return label;
        },
      },
    },
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
        Consumo de gás por unidade (mês atual)
      </h3>
      <Chart options={options} series={[{ name: "Consumo", data }]} type="bar" height={Math.max(200, rows.length * 50)} />
    </div>
  );
}
