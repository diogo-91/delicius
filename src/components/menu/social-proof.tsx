import { Quote, Star } from "lucide-react";
import type { Product } from "@/types/domain";

export type Review = {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
};

/**
 * PLACEHOLDER ILUSTRATIVO: nao existe tabela de avaliacoes/reviews no banco
 * hoje. Estes depoimentos e a nota media sao conteudo de exemplo, aprovados
 * pelo cliente como placeholder visivel ate existirem avaliacoes reais.
 * Trocar `placeholderReviews`/`placeholderRating` por dados reais assim que
 * houver uma fonte (ex: tabela `reviews` + agregacao de nota media real).
 * Os avatares sao iniciais geradas (nao fotos de pessoas reais), para nao
 * atribuir a imagem de alguem real a um depoimento ficticio.
 */
export const placeholderReviews: Review[] = [
  { id: "review_1", authorName: "Juliana M.", rating: 5, comment: "O bolo Alpino é surreal! Melhor que já provei." },
  { id: "review_2", authorName: "Carlos A.", rating: 5, comment: "Tudo sempre fresquinho e muito delicioso!" },
  { id: "review_3", authorName: "Fernanda L.", rating: 5, comment: "Atendimento incrível e produtos maravilhosos!" }
];

export const placeholderRating = { average: 4.9, reviewerCount: 1200 };

const avatarPalette = ["from-[#D4A72C] to-[#B3261E]", "from-[#B3261E] to-[#3A1F16]", "from-[#3A1F16] to-[#D4A72C]"];

function StarRow({ rating, className }: { rating: number; className?: string }) {
  return (
    <div className={`flex items-center gap-0.5 ${className ?? ""}`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} className={`h-4 w-4 ${index < rating ? "fill-gold text-gold" : "text-line2"}`} />
      ))}
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function SocialProof({ reviews, products, excludeIds = [] }: { reviews: Review[]; products: Product[]; excludeIds?: string[] }) {
  if (reviews.length === 0) return null;
  const decorativePhotos = products.filter((product) => product.active && !excludeIds.includes(product.id)).slice(0, reviews.length);

  return (
    <section className="overflow-hidden rounded-2xl border border-line2 bg-white shadow-sm">
      <div className="grid gap-6 p-5 md:grid-cols-[220px_1fr] md:items-center md:p-8">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink2 md:text-2xl">Quem prova, recomenda ❤️</h2>
          <p className="mt-3 font-display text-4xl font-bold text-cta">{placeholderRating.average.toFixed(1).replace(".", ",")}</p>
          <StarRow rating={5} className="mt-1" />
          <p className="mt-1 text-sm text-muted2">+{Math.floor(placeholderRating.reviewerCount / 100) * 100} clientes atendidos</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {reviews.map((review, index) => (
            <div key={review.id} className="flex flex-col overflow-hidden rounded-2xl border border-line2 bg-paper shadow-sm transition hover:shadow-md">
              <div className="flex-1 p-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white ${avatarPalette[index % avatarPalette.length]}`}
                  >
                    {getInitials(review.authorName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink2">{review.authorName}</p>
                    <StarRow rating={review.rating} />
                  </div>
                </div>
                <Quote className="mt-3 h-4 w-4 text-gold/70" />
                <p className="mt-1 text-sm leading-5 text-muted2">{review.comment}</p>
              </div>
              {decorativePhotos[index] && (
                <img src={decorativePhotos[index].imageUrl} alt="" aria-hidden="true" className="h-24 w-full object-cover" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
