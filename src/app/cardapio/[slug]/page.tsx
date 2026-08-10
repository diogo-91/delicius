import type { Metadata } from "next";
import { PublicMenu } from "@/components/menu/public-menu";

export const metadata: Metadata = {
  title: "Delicious Gourmet | Bolos, Doces e Salgados em Sorocaba",
  description: "Confeitaria artesanal em Sorocaba. Peça bolos, doces e salgados direto pelo cardápio digital da Delicious Gourmet.",
  openGraph: {
    title: "Delicious Gourmet | Bolos, Doces e Salgados em Sorocaba",
    description: "Confeitaria artesanal em Sorocaba. Peça bolos, doces e salgados direto pelo cardápio digital da Delicious Gourmet.",
    images: ["/banner.png"]
  }
};

export default function PublicMenuPage() {
  return <PublicMenu />;
}
