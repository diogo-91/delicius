"use client";

import { useEffect, useState } from "react";
import { getCustomers } from "@/lib/data/mock-store";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function CustomersPage() {
  const [customers, setCustomers] = useState(getCustomers());

  useEffect(() => {
    setCustomers(getCustomers());
  }, []);

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-[#111827] lg:text-[32px]">Clientes</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Histórico comercial e recorrência por restaurante.</p>
      </div>

      <section className="flex flex-col overflow-hidden rounded-card border border-[#E5E7EB] bg-white shadow-card lg:min-h-0 lg:flex-1">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[#E5E7EB]/50 px-6 py-4">
          <p className="text-xs font-medium text-[#6B7280]">{customers.length} cliente(s) cadastrado(s)</p>
        </div>
        {customers.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#6B7280]">Nenhum cliente cadastrado ainda.</div>
        ) : (
          <div className="scrollbar-clean overflow-auto lg:min-h-0 lg:flex-1">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="sticky top-0 bg-slate-50/95 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] backdrop-blur">
                <tr className="border-b border-[#E5E7EB]/50">
                  <th className="px-6 py-3 font-semibold">Nome</th>
                  <th className="px-3 py-3 font-semibold">Telefone</th>
                  <th className="px-3 py-3 font-semibold">Endereço</th>
                  <th className="px-3 py-3 font-semibold text-center">Pedidos</th>
                  <th className="px-3 py-3 font-semibold">Total gasto</th>
                  <th className="px-3 py-3 font-semibold">Último pedido</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-t border-[#E5E7EB]/40 text-sm text-[#6B7280] transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-3.5 font-medium text-[#111827]">{customer.name}</td>
                    <td className="px-3 py-3.5">{customer.phone}</td>
                    <td className="px-3 py-3.5 max-w-xs truncate">{customer.address ?? "—"}</td>
                    <td className="px-3 py-3.5 text-center font-medium text-[#111827]">{customer.orderCount}</td>
                    <td className="px-3 py-3.5 font-semibold text-[#111827]">{formatCurrency(customer.totalSpent)}</td>
                    <td className="px-3 py-3.5 text-xs">{customer.lastOrderAt ? formatDateTime(customer.lastOrderAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
