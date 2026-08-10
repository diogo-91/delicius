import { Star } from "lucide-react";
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
 */
export const placeholderReviews: Review[] = [
  { id: "review_1", authorName: "Juliana M.", rating: 5, comment: "O bolo Alpino é surreal! Melhor que já provei." },
  { id: "review_2", authorName: "Carlos A.", rating: 5, comment: "Tudo sempre fresquinho e muito delicioso!" },
  { id: "review_3", authorName: "Fernanda L.", rating: 5, comment: "Atendimento incrível e produtos maravilhosos!" }
];

export const placeholderRating = { average: 4.9, reviewerCount: 1200 };

function StarRow({ rating, className }: { rating: number; className?: string }) {
  return (
    <div className={`flex items-center gap-0.5 ${className ?? ""}`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} className={`h-4 w-4 ${index < rating ? "fill-gold text-gold" : "text-line2"}`} />
      ))}
    </div>
  );
}

export function SocialProof({ reviews, products }: { reviews: Review[]; products: Product[] }) {
  if (reviews.length === 0) return null;
  const decorativePhotos = products.filter((product) => product.active).slice(0, reviews.length);

  return (
    <section className="grid gap-5 rounded-2xl border border-line2 bg-white p-5 md:grid-cols-[220px_1fr] md:items-center md:p-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink2 md:text-2xl">Quem prova, recomenda ❤️</h2>
        <p className="mt-3 text-3xl font-bold text-ink2">{placeholderRating.average.toFixed(1).replace(".", ",")} de 5</p>
        <StarRow rating={5} className="mt-1" />
        <p className="mt-1 text-sm text-muted2">+{Math.floor(placeholderRating.reviewerCount / 100) * 100} clientes atendidos</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {reviews.map((review, index) => (
          <div key={review.id} className="overflow-hidden rounded-xl border border-line2 bg-paper">
            <div className="p-4">
              <p className="text-sm font-semibold text-ink2">{review.authorName}</p>
              <StarRow rating={review.rating} className="mt-1" />
              <p className="mt-2 text-sm leading-5 text-muted2">{review.comment}</p>
            </div>
            {decorativePhotos[index] && (
              <img src={decorativePhotos[index].imageUrl} alt="" aria-hidden="true" className="h-24 w-full object-cover" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
