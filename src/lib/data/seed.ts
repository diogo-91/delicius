import type { Category, Coupon, Customer, Order, Product, Restaurant } from "@/types/domain";

export const restaurant: Restaurant = {
  id: "rest_001",
  name: "DELICIOUS GOURMET BOLOS E SALGADOS",
  slug: "delicious-gourmet-bolos-e-salgados",
  logoUrl: "https://staginganotaai.s3.us-west-2.amazonaws.com/produtos/67f91d0803bf3b0019f3ef8f1754600955397blob",
  coverUrl: "https://client-assets.anota.ai/menu-header/4d081712-4a2a-4d9c-b1a2-8ba8ab0c80a0",
  address: "R. Aparecida, 1341 - Santa Rosalia, Sorocaba - SP",
  openingHours: "Dom: 09h as 11h30 | Ter a Sex: 09h30 as 17h30 | Sab: 09h as 17h",
  weeklySchedule: [
    { day: 0, label: "Domingo", enabled: true, open: "09:00", close: "11:30" },
    { day: 1, label: "Segunda-feira", enabled: false, open: "09:30", close: "17:30" },
    { day: 2, label: "Terça-feira", enabled: true, open: "09:30", close: "17:30" },
    { day: 3, label: "Quarta-feira", enabled: true, open: "09:30", close: "17:30" },
    { day: 4, label: "Quinta-feira", enabled: true, open: "09:30", close: "17:30" },
    { day: 5, label: "Sexta-feira", enabled: true, open: "09:30", close: "17:30" },
    { day: 6, label: "Sábado", enabled: true, open: "09:00", close: "17:00" }
  ],
  deliveryFee: 7,
  averagePrepTime: 45,
  isOpen: true,
  whatsapp: "5544999990000"
};

export const categories: Category[] = [
  { id: "cat_promocao", restaurantId: restaurant.id, name: "Promoção do dia", sortOrder: 1, active: true },
  { id: "cat_doces", restaurantId: restaurant.id, name: "Doces", sortOrder: 2, active: true },
  { id: "cat_tortas", restaurantId: restaurant.id, name: "Tortas", sortOrder: 3, active: true },
  { id: "cat_salgados", restaurantId: restaurant.id, name: "Salgados", sortOrder: 4, active: true },
  { id: "cat_docinhos", restaurantId: restaurant.id, name: "Docinhos por cento", sortOrder: 5, active: true },
  { id: "cat_festa", restaurantId: restaurant.id, name: "Velas e descartaveis", sortOrder: 6, active: true },
  { id: "cat_bebidas", restaurantId: restaurant.id, name: "Bebidas", sortOrder: 7, active: true }
];

export const products: Product[] = [
  {
    id: "prod_promo_combo_doces",
    restaurantId: restaurant.id,
    categoryId: "cat_promocao",
    name: "Combo Doces Gourmet",
    description: "Bolo de pote brigadeiro, tortinha de limao e brigadeiro individual em preco especial.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/-1756499053087blob",
    price: 29.9,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_promo_tortinhas",
    restaurantId: restaurant.id,
    categoryId: "cat_promocao",
    name: "Trio de Tortinhas",
    description: "Morango, limao e Ferrero Rocher em uma selecao especial do dia.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/202309051334_9iCx_blob",
    price: 27.9,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_promo_brigadeiros",
    restaurantId: restaurant.id,
    categoryId: "cat_promocao",
    name: "Caixinha Promocional de Brigadeiros",
    description: "12 brigadeiros cremosos para adoçar o dia ou presentear.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/202504031725_V1V5_iblob",
    price: 19.9,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_dupla_tortinhas",
    restaurantId: restaurant.id,
    categoryId: "cat_promocao",
    name: "Dupla mais pedida!",
    description: "Mini tortinha de morango e mini tortinha de limao em combo promocional.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/-1754600488749blob",
    price: 18.9,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_dupla_prestigio_coca",
    restaurantId: restaurant.id,
    categoryId: "cat_promocao",
    name: "Dupla queridinha!",
    description: "Bolo de pote Prestigio com Coca-Cola mini 200 ml.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/-1754600590327blob",
    price: 19.9,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_fritinhos_coca",
    restaurantId: restaurant.id,
    categoryId: "cat_promocao",
    name: "Fritinhos Na Hora 50 unid + Coca-Cola 1,5 L",
    description: "Combo com mini salgados fritos e Coca-Cola para compartilhar.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/-1757686172342blob",
    price: 45.9,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_kit_misto",
    restaurantId: restaurant.id,
    categoryId: "cat_promocao",
    name: "Kit salgados misto + Coca 350 ml + brigadeiro",
    description: "Kit com salgados variados, refrigerante lata e brigadeiro individual.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/-1773243531530blob",
    price: 22.9,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_12_brigadeiros",
    restaurantId: restaurant.id,
    categoryId: "cat_doces",
    name: "12 unidades de brigadeiro cremoso",
    description: "Brigadeiros cremosos no granulado macio, em caixinha para presentear.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/202504031725_V1V5_iblob",
    price: 21.5,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_25_brigadeiros",
    restaurantId: restaurant.id,
    categoryId: "cat_doces",
    name: "25 Unidades de Brigadeiros",
    description: "Brigadeiros tamanho festa com textura cremosa e cobertura de granulado.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/202504031713_SAU4_iblob",
    price: 39.9,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_bolo_ameixa_nozes",
    restaurantId: restaurant.id,
    categoryId: "cat_doces",
    name: "Bolo de Pote Ameixa e nozes",
    description: "Bolo de pote com doce de leite, ameixa e nozes.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/-1756498286033blob",
    price: 17.9,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_bolo_brigadeiro",
    restaurantId: restaurant.id,
    categoryId: "cat_doces",
    name: "Bolo de pote Brigadeiro",
    description: "Bolo de pote com recheio de brigadeiro de leite condensado.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/-1756499053087blob",
    price: 16.9,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_bolo_casadinho",
    restaurantId: restaurant.id,
    categoryId: "cat_doces",
    name: "Bolo de Pote Casadinho",
    description: "Bolo de chocolate com brigadeiro branco e brigadeiro preto.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/-1756498218770blob",
    price: 16.9,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_bolo_ninho_nutella",
    restaurantId: restaurant.id,
    categoryId: "cat_doces",
    name: "Bolo de Pote Ninho com Nutella",
    description: "Bolo no pote com recheio de Ninho e creme de avela.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/-1747404412566blob",
    price: 17.9,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_bolo_prestigio",
    restaurantId: restaurant.id,
    categoryId: "cat_doces",
    name: "Bolo de Pote Prestigio",
    description: "Bolo de chocolate com cocada cremosa, brigadeiro e coco.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/-1759955994373blob",
    price: 16.9,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_torta_limao",
    restaurantId: restaurant.id,
    categoryId: "cat_tortas",
    name: "Tortinha de Limão",
    description: "Base crocante com creme de limao e finalizacao delicada.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/-1745609436344blob",
    price: 9.9,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_torta_morango",
    restaurantId: restaurant.id,
    categoryId: "cat_tortas",
    name: "Tortinha de Morango",
    description: "Massa crocante, creme suave e morangos com geleia de brilho.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/202309051334_9iCx_blob",
    price: 10.9,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_torta_ferrero",
    restaurantId: restaurant.id,
    categoryId: "cat_tortas",
    name: "Tortinha Ferrero Rocher",
    description: "Tortinha com chocolate, creme de avela e castanhas.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/202309051339_C11m_blob",
    price: 11.9,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_torta_holandesa",
    restaurantId: restaurant.id,
    categoryId: "cat_tortas",
    name: "Tortinha Holandesa",
    description: "Creme especial com base crocante, ganache e bolacha.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/202504051024_8S46_iblob",
    price: 14.9,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_kit_frito_12",
    restaurantId: restaurant.id,
    categoryId: "cat_salgados",
    name: "Kit Frito 12 Unidades",
    description: "Salgados fritos variados com refrigerante lata a escolha.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/202309161417_UVcu_blob",
    price: 17.4,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_100_salgados",
    restaurantId: restaurant.id,
    categoryId: "cat_salgados",
    name: "100 Mini Salgados Frito Tradicionais",
    description: "Mini salgados para festas e eventos, fritos e prontos para servir.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/-1745683686304blob",
    price: 80,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_50_salgados",
    restaurantId: restaurant.id,
    categoryId: "cat_salgados",
    name: "50 Mini Salgados Frito Tradicionais",
    description: "Porcao com 50 mini salgados tradicionais para compartilhar.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/-1745684091755blob",
    price: 40,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_25_salgados",
    restaurantId: restaurant.id,
    categoryId: "cat_salgados",
    name: "Mini Salgados Fritos Tradicionais 25 unid.",
    description: "Mini salgados crocantes em porcao menor para qualquer ocasiao.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/-1756318441779blob",
    price: 22.9,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_roleta_salgados",
    restaurantId: restaurant.id,
    categoryId: "cat_salgados",
    name: "Roleta de salgados",
    description: "Roleta com 25 salgados crocantes e recheados, fritos na hora.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/-1758377591414blob",
    price: 29.9,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_100_docinhos",
    restaurantId: restaurant.id,
    categoryId: "cat_docinhos",
    name: "100 Docinhos",
    description: "Brigadeiro, beijinho, ninho e bicho de pe para festas.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/-1760102540755blob",
    price: 140,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_50_docinhos",
    restaurantId: restaurant.id,
    categoryId: "cat_docinhos",
    name: "50 Docinhos",
    description: "Caixa com brigadeiros e beijinhos tradicionais.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/-1759500990668blob",
    price: 70,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_25_docinhos",
    restaurantId: restaurant.id,
    categoryId: "cat_docinhos",
    name: "25 unid. de brigadeiros tradicional",
    description: "Brigadeiros tamanho festa com granulado macio.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/-1771164093944blob",
    price: 39.9,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_vela_luxo_rosa",
    restaurantId: restaurant.id,
    categoryId: "cat_festa",
    name: "Vela Luxo Rosa 0 - 9",
    description: "Vela numerica luxo rosa para comemoracoes.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/-1745584526758blob",
    price: 7.5,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_garfinho",
    restaurantId: restaurant.id,
    categoryId: "cat_festa",
    name: "Garfinho com 50 unidades",
    description: "Pacote de garfinhos descartaveis com 50 unidades.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/-1745801052988blob",
    price: 6.5,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_sprite",
    restaurantId: restaurant.id,
    categoryId: "cat_bebidas",
    name: "Sprite Lata 350ml",
    description: "Refrigerante de limao gelado em lata.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/-1745609551706blob",
    price: 6.5,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_monster",
    restaurantId: restaurant.id,
    categoryId: "cat_bebidas",
    name: "Monster Energy 473ml",
    description: "Energetico Monster lata 473ml.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/-1745588835250blob",
    price: 12,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_coca_350",
    restaurantId: restaurant.id,
    categoryId: "cat_bebidas",
    name: "Coca cola 350ml",
    description: "Coca-Cola Original lata 350ml.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/-1745600919610blob",
    price: 6.5,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  },
  {
    id: "prod_coca_2l",
    restaurantId: restaurant.id,
    categoryId: "cat_bebidas",
    name: "Coca cola Original 2L",
    description: "Refrigerante Coca-Cola Original garrafa 2L.",
    imageUrl: "https://client-assets.anota.ai/produtos/67f91d0803bf3b0019f3ef8f/-1745609864991blob",
    price: 15,
    active: true,
    requiresNote: false,
    variations: [],
    addons: []
  }
];

export const customers: Customer[] = [
  {
    id: "cust_maria",
    restaurantId: restaurant.id,
    name: "Maria Silva",
    phone: "(44) 99991-2020",
    address: "Rua das Flores, 45",
    totalSpent: 87.7,
    lastOrderAt: new Date().toISOString(),
    orderCount: 2
  }
];

export const coupons: Coupon[] = [
  {
    id: "coupon_del10",
    restaurantId: restaurant.id,
    code: "DEL10",
    description: "10% de desconto no pedido",
    type: "percent",
    value: 10,
    active: true,
    usageLimit: 100,
    usedCount: 0,
    minimumOrderValue: 20,
    createdAt: new Date().toISOString()
  },
  {
    id: "coupon_doce5",
    restaurantId: restaurant.id,
    code: "DOCE5",
    description: "R$ 5,00 de desconto",
    type: "fixed",
    value: 5,
    active: true,
    usageLimit: 80,
    usedCount: 0,
    minimumOrderValue: 15,
    createdAt: new Date().toISOString()
  },
  {
    id: "coupon_fretegratis",
    restaurantId: restaurant.id,
    code: "FRETEGRATIS",
    description: "Remove a taxa de entrega",
    type: "delivery",
    value: 0,
    active: true,
    usageLimit: 50,
    usedCount: 0,
    minimumOrderValue: 30,
    createdAt: new Date().toISOString()
  }
];

export const orders: Order[] = [
  {
    id: "ord_001",
    restaurantId: restaurant.id,
    code: "#1024",
    customer: customers[0],
    type: "delivery",
    paymentMethod: "pix",
    status: "preparing",
    items: [
      {
        id: "item_001",
        productId: "prod_dupla_tortinhas",
        productName: "Dupla mais pedida!",
        unitPrice: 18.9,
        quantity: 1,
        addons: [],
        total: 18.9
      },
      {
        id: "item_002",
        productId: "prod_kit_frito_12",
        productName: "Kit Frito 12 Unidades",
        unitPrice: 17.4,
        quantity: 1,
        addons: [],
        total: 17.4
      }
    ],
    subtotal: 36.3,
    discount: 0,
    deliveryFee: restaurant.deliveryFee,
    total: 43.3,
    createdAt: new Date().toISOString(),
    history: [
      { id: "hist_001", status: "new", createdAt: new Date().toISOString(), note: "Pedido recebido" },
      { id: "hist_002", status: "preparing", createdAt: new Date().toISOString(), note: "Cozinha iniciou preparo" }
    ]
  }
];
