/* ==========================================================
   CARDÁPIO — Fumaça & Pão Hamburgueria
   ----------------------------------------------------------
   Tudo o que aparece no cardápio sai deste arquivo.

   Campos de cada item:
     id         identificador único, sem espaços nem acentos
     categoria  id de uma das CATEGORIAS abaixo
     nome       nome exibido
     descricao  texto curto (ingredientes, porção)
     preco      preço em reais, com ponto: 32.90
     precoDe    (opcional) preço "de", aparece riscado
     emoji      emoji grande do card (aparece se a foto não carregar ou se não houver foto)
     detalhe    (opcional) emoji pequeno no canto do card
     imagem     (opcional) foto do item: um endereço da internet ou um arquivo
                do projeto, ex.: "img/classico.jpg". As fotos de exemplo vêm
                do Unsplash (uso gratuito): troque pelas fotos dos seus lanches.
     tags       etiquetas: "mais pedido", "novo", "vegetariano", "picante"...
     extras     (opcional) ids dos adicionais pagos aceitos pelo item
   ========================================================== */

const CATEGORIAS = [
  {
    id: "burgers",
    nome: "Burgers",
    descricao: "Blend bovino moído na casa todo dia e selado na brasa. Pão brioche assado aqui.",
    dicaObs: "Ex.: sem cebola, carne bem passada",
  },
  {
    id: "combos",
    nome: "Combos",
    descricao: "Burger, batata e bebida com preço camarada.",
    dicaObs: "Ex.: refri sabor guaraná, burger sem picles",
  },
  {
    id: "acompanhamentos",
    nome: "Acompanhamentos",
    descricao: "Para dividir na mesa (ou não).",
    dicaObs: "Ex.: molho à parte",
  },
  {
    id: "bebidas",
    nome: "Bebidas",
    descricao: "Bem geladas, do jeito que tem que ser.",
    dicaObs: "Ex.: sabor guaraná, sem gelo",
  },
  {
    id: "sobremesas",
    nome: "Sobremesas",
    descricao: "Para fechar com chave de ouro.",
    dicaObs: "Ex.: calda à parte",
  },
];

/* Adicionais pagos. Para liberar um adicional em um item,
   coloque o id dele na lista "extras" do item. */
const EXTRAS = [
  { id: "bacon", nome: "Bacon extra", preco: 5.0 },
  { id: "cheddar", nome: "Cheddar cremoso", preco: 4.0 },
  { id: "ovo", nome: "Ovo na chapa", preco: 3.0 },
];

const CARDAPIO = [
  /* ---------- Burgers ---------- */
  {
    id: "fumaca-classico",
    categoria: "burgers",
    nome: "Fumaça Clássico",
    descricao:
      "Blend de 160 g na brasa, queijo prato derretido, alface, tomate, cebola roxa e maionese da casa no pão brioche.",
    preco: 32.9,
    emoji: "🍔",
    imagem: "https://images.unsplash.com/photo-1508736793122-f516e3ba5569?auto=format&fit=crop&w=800&h=600&q=80",
    tags: ["mais pedido"],
    extras: ["bacon", "cheddar", "ovo"],
  },
  {
    id: "smash-duplo",
    categoria: "burgers",
    nome: "Smash Duplo",
    descricao:
      "Dois smash de 90 g com crostinha caramelizada, cheddar em dobro, picles e molho especial no pão de batata.",
    preco: 36.9,
    emoji: "🍔",
    imagem: "https://images.unsplash.com/photo-1607013251379-e6eecfffe234?auto=format&fit=crop&w=800&h=600&q=80",
    detalhe: "🧀",
    tags: ["mais pedido"],
    extras: ["bacon", "cheddar", "ovo"],
  },
  {
    id: "bacon-lovers",
    categoria: "burgers",
    nome: "Bacon Lovers",
    descricao:
      "Blend de 180 g, cheddar, bacon crocante em dobro, cebola caramelizada e barbecue defumado da casa.",
    preco: 39.9,
    emoji: "🍔",
    imagem: "https://images.unsplash.com/photo-1598182198871-d3f4ab4fd181?auto=format&fit=crop&w=800&h=600&q=80",
    detalhe: "🥓",
    tags: [],
    extras: ["bacon", "cheddar", "ovo"],
  },
  {
    id: "brasa-picante",
    categoria: "burgers",
    nome: "Brasa Picante",
    descricao:
      "Blend de 160 g, queijo pepper jack, jalapeño, cebola crispy e maionese de chipotle. Para quem gosta de ardência.",
    preco: 37.9,
    emoji: "🍔",
    imagem: "https://images.unsplash.com/photo-1585238341710-4d3ff484184d?auto=format&fit=crop&w=800&h=600&q=80",
    detalhe: "🌶️",
    tags: ["picante"],
    extras: ["bacon", "cheddar", "ovo"],
  },
  {
    id: "trufado-da-casa",
    categoria: "burgers",
    nome: "Trufado da Casa",
    descricao:
      "Blend de costela de 180 g, queijo brie, rúcula, cogumelos salteados na manteiga e maionese trufada.",
    preco: 44.9,
    emoji: "🍔",
    imagem: "https://images.unsplash.com/photo-1683882330182-eb8f64d7231c?auto=format&fit=crop&w=800&h=600&q=80",
    detalhe: "🍄",
    tags: ["novo"],
    extras: ["bacon", "cheddar", "ovo"],
  },
  {
    id: "verde-brasa",
    categoria: "burgers",
    nome: "Verde Brasa",
    descricao:
      "Hambúrguer de grão-de-bico e cogumelos, queijo coalho grelhado, tomate confitado, rúcula e maionese de ervas.",
    preco: 34.9,
    emoji: "🍔",
    imagem: "https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=800&h=600&q=80",
    detalhe: "🌱",
    tags: ["vegetariano"],
    extras: ["cheddar", "ovo"], // sem bacon: o lanche é vegetariano
  },

  /* ---------- Combos ---------- */
  {
    id: "combo-classico",
    categoria: "combos",
    nome: "Combo Clássico",
    descricao:
      "Fumaça Clássico + batata frita da casa + refrigerante lata. Diga o sabor do refri na observação.",
    preco: 46.9,
    precoDe: 56.3,
    emoji: "🍔",
    imagem: "https://images.unsplash.com/photo-1763689389824-dd2cea2e5772?auto=format&fit=crop&w=800&h=600&q=80",
    detalhe: "🍟",
    tags: ["mais pedido"],
    extras: ["bacon", "cheddar", "ovo"],
  },
  {
    id: "combo-smash",
    categoria: "combos",
    nome: "Combo Smash",
    descricao:
      "Smash Duplo + batata frita da casa + refrigerante lata. O queridinho da casa, agora completo.",
    preco: 49.9,
    precoDe: 60.3,
    emoji: "🍔",
    imagem: "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&w=800&h=600&q=80",
    detalhe: "🥤",
    tags: [],
    extras: ["bacon", "cheddar", "ovo"],
  },
  {
    id: "combo-a-dois",
    categoria: "combos",
    nome: "Combo a Dois",
    descricao:
      "Dois Fumaça Clássico + batata cheddar & bacon + dois refrigerantes lata. Feito para dividir no sofá.",
    preco: 89.9,
    precoDe: 105.7,
    emoji: "🍔",
    imagem: "https://images.unsplash.com/photo-1571805618149-3a772570ebcd?auto=format&fit=crop&w=800&h=600&q=80",
    detalhe: "🍟",
    tags: ["serve 2"],
  },

  /* ---------- Acompanhamentos ---------- */
  {
    id: "batata-da-casa",
    categoria: "acompanhamentos",
    nome: "Batata Frita da Casa",
    descricao:
      "Batata palito sequinha, temperada com sal de alecrim. Acompanha maionese da casa. Porção de 300 g.",
    preco: 16.9,
    emoji: "🍟",
    imagem: "https://images.unsplash.com/photo-1598679253544-2c97992403ea?auto=format&fit=crop&w=800&h=600&q=80",
    tags: ["vegetariano"],
  },
  {
    id: "batata-cheddar-bacon",
    categoria: "acompanhamentos",
    nome: "Batata Cheddar & Bacon",
    descricao: "Batata palito coberta com cheddar cremoso e farofa de bacon crocante. Porção de 350 g.",
    preco: 26.9,
    emoji: "🍟",
    imagem: "https://images.unsplash.com/photo-1700835880456-2e5519fa54d6?auto=format&fit=crop&w=800&h=600&q=80",
    detalhe: "🥓",
    tags: ["mais pedido"],
  },
  {
    id: "onion-rings",
    categoria: "acompanhamentos",
    nome: "Onion Rings",
    descricao:
      "Anéis de cebola empanados na cerveja, crocantes por fora e macios por dentro. Com barbecue. 10 unidades.",
    preco: 22.9,
    emoji: "🧅",
    imagem: "https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&fit=crop&w=800&h=600&q=80",
    tags: ["vegetariano"],
  },
  {
    id: "nuggets-da-casa",
    categoria: "acompanhamentos",
    nome: "Nuggets da Casa",
    descricao:
      "Peito de frango empanado na farinha panko, feito aqui. Com molho de mostarda e mel. 10 unidades.",
    preco: 24.9,
    emoji: "🍗",
    imagem: "https://images.unsplash.com/photo-1696265498747-efc4c0dd7b98?auto=format&fit=crop&w=800&h=600&q=80",
    tags: ["novo"],
  },

  /* ---------- Bebidas ---------- */
  {
    id: "refrigerante-lata",
    categoria: "bebidas",
    nome: "Refrigerante Lata",
    descricao: "Cola, cola zero, guaraná ou laranja. Lata de 350 ml, bem gelada. Diga o sabor na observação.",
    preco: 6.5,
    emoji: "🥤",
    imagem: "https://images.unsplash.com/photo-1581636625402-29b2a704ef13?auto=format&fit=crop&w=800&h=600&q=80",
    tags: [],
  },
  {
    id: "limonada-suica",
    categoria: "bebidas",
    nome: "Limonada Suíça",
    descricao: "Limão batido com leite condensado e gelo. Cremosa e refrescante. Copo de 500 ml.",
    preco: 12.9,
    emoji: "🍋",
    imagem: "https://images.unsplash.com/photo-1695490454828-f8df9109da43?auto=format&fit=crop&w=800&h=600&q=80",
    tags: [],
  },
  {
    id: "cerveja-ipa",
    categoria: "bebidas",
    nome: "Cerveja Artesanal IPA",
    descricao: "IPA de cervejaria local, amarga na medida e com aroma cítrico. Lata de 473 ml.",
    preco: 18.9,
    emoji: "🍺",
    imagem: "https://images.unsplash.com/photo-1725148029785-397acd3c1be3?auto=format&fit=crop&w=800&h=600&q=80",
    tags: ["+18"],
  },

  /* ---------- Sobremesas ---------- */
  {
    id: "brownie-com-sorvete",
    categoria: "sobremesas",
    nome: "Brownie com Sorvete",
    descricao:
      "Brownie de chocolate meio amargo, quentinho, com uma bola de sorvete de creme e calda de chocolate.",
    preco: 19.9,
    emoji: "🍫",
    imagem: "https://images.unsplash.com/photo-1654796605330-8a1248a2cb07?auto=format&fit=crop&w=800&h=600&q=80",
    detalhe: "🍨",
    tags: [],
  },
  {
    id: "milkshake-doce-de-leite",
    categoria: "sobremesas",
    nome: "Milkshake de Doce de Leite",
    descricao: "Sorvete de creme batido com doce de leite e finalizado com chantilly. Copo de 400 ml.",
    preco: 21.9,
    emoji: "🥤",
    imagem: "https://images.unsplash.com/photo-1546470427-0d4db154ceb7?auto=format&fit=crop&w=800&h=600&q=80",
    detalhe: "🍦",
    tags: ["novo"],
  },
];
