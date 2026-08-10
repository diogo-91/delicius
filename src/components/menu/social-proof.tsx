export type Review = {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
};

/**
 * Nao existe tabela de avaliacoes/reviews no banco hoje. Em vez de inventar
 * nota, numero de clientes ou depoimentos, este componente fica desligado ate
 * existir uma fonte real de dados. Quando essa fonte existir, basta trocar
 * SOCIAL_PROOF_ENABLED para true e passar `reviews` reais via props.
 */
const SOCIAL_PROOF_ENABLED = false;

export function SocialProof({ reviews }: { reviews?: Review[] }) {
  if (!SOCIAL_PROOF_ENABLED || !reviews || reviews.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-line2 bg-white p-5">
      <h2 className="font-display text-xl font-semibold text-ink2">Quem prova, recomenda ❤️</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {reviews.map((review) => (
          <div key={review.id} className="rounded-xl bg-paper p-4">
            <p className="text-sm font-semibold text-ink2">{review.authorName}</p>
            <p className="mt-2 text-sm leading-5 text-muted2">{review.comment}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
