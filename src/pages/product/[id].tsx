import { stripe } from "@componet/lib/stripe";
import {
  ImageContainer,
  ProductContainer,
  ProductDetails,
} from "@componet/styles/pages/productus";
import Image from "next/image";
import Stripe from "stripe";
import { GetStaticProps } from "next";
import { GetStaticPaths } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useCart } from "@componet/hooks/useCart";
import { IProduct } from "@componet/context/CartContext";

interface ProductProps {
  product: IProduct;
}

export default function Product({ product }: ProductProps) {
  // const [isCreatingCheckoutSession, setIsCreatingCheckoutSession] =
  //   useState(false);

  const { isFallback } = useRouter();

  const { addToCart, checkIfItemAlreadyExists } = useCart();

  if (isFallback) {
    return <p>Loading ... aguenta ai ...</p>;
  }

  const itemAlreadyInCart = checkIfItemAlreadyExists(product.id);

  // async function handleBuyProduct() {
  //   try {
  //     setIsCreatingCheckoutSession(true);

  //     const response = await axios.post("/api/checkout", {
  //       priceId: product.defaultPriceId,
  //     });

  //     const { checkoutUrl } = response.data;

  //     window.location.href = checkoutUrl;
  //   } catch (err) {
  //     setIsCreatingCheckoutSession(false);
  //     // console.log(err);
  //     // conectar alguma ferramenta como Datadog / Sentry
  //     alert("Falha ao redirecionar ao checkout!");
  //   }
  // }

  return (
    <>
      <Head>
        <title>{product.name} | Ignite Shop</title>
      </Head>

      <ProductContainer>
        <ImageContainer>
          <Image src={product.imageUrl} width={520} height={480} alt="" />
        </ImageContainer>

        <ProductDetails>
          <h1>{product.name}</h1>
          <span>{product.price}</span>

          <p>{product.description}</p>

          <button
            disabled={itemAlreadyInCart}
            onClick={() => addToCart(product)}
          >
            {itemAlreadyInCart
              ? "Produto já está no carrinho"
              : "Colocar na sacola"}
          </button>
        </ProductDetails>
      </ProductContainer>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [{ params: { id: "prod_OcNR2reGZAnNjm" } }],
    fallback: true,
  };
};

// como não temos problemas com relação a armazenamento nos cookes podemos nos
// utilizar do SSG

export const getStaticProps: GetStaticProps<any, { id: string }> = async ({
  params,
}) => {
  if (!params) {
    return {
      notFound: true,
    };
  }

  const productId = params.id;

  const product = await stripe.products.retrieve(productId, {
    expand: ["default_price"],
  });

  const price = product.default_price as Stripe.Price;

  return {
    props: {
      product: {
        id: product.id,
        name: product.name,
        imageUrl: product.images[0],
        price: new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format((price.unit_amount as number) / 100),
        numberPrice: (price.unit_amount as number) / 100,
        description: product.description,
        defaultPriceId: price.id,
      },
    },
    revalidate: 60 * 60 * 1, // o tempo que queremos salvar esta pagina em cash
    // neste caso ficara em uma hora
  };
};
