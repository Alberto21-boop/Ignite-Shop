import { stripe } from "@componet/lib/stripe";
import { ImageContainer, ProductContainer, ProductDetails } from "@componet/styles/pages/productus";
import Image from "next/image";
import Stripe from "stripe";
import { GetStaticProps } from 'next';
import { GetStaticPaths } from 'next';
import { useRouter } from "next/router";

interface ProductProps {
  product: {
    id: string;
    name: string;
    imageUrl: string;
    price: string;
    description: string;
  }
}

export default function Product({ product }: ProductProps) {
  const { isFallback } = useRouter()

  if (isFallback) {
    return <p>Loading ...</p>
  }

  return (
    <ProductContainer>
      <ImageContainer>
        <Image src={product.imageUrl} width={520} height={480} alt='' />
      </ImageContainer>

      <ProductDetails>
        <h1>{product.name}</h1>
        <span>R$ {product.price}</span>

        <p>
          {product.description}
        </p>

        <button>
          Comprar Agora
        </button>
      </ProductDetails>
    </ProductContainer>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [
      { params: { id: 'prod_OcNR2reGZAnNjm' } }
    ],
    fallBack: 'blocking',
  }
}

// como não temos problemas com relação a armazenamento nos cookes podemos nos 
// utilizar do SSG

export const getStaticProps: GetStaticProps<any, { id: string }> = async ({ params }) => {
  if (!params) {
    return {
      notFound: true,
    };
  }

  const productId = params.id;

  const product = await stripe.products.retrieve(productId, {
    expand: ['default_price']
  })

  const price = product.default_price as Stripe.Price


  return {
    props: {
      product: {
        id: product.id,
        name: product.name,
        imageUrl: product.images[0],
        price: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(price.unit_amount as number / 100),
        description: product.description,
      }
    },
    revalidate: 60 * 60 * 1, // o tempo que queremos salvar esta pagina em cash
    // neste caso ficara em uma hora
  }
}