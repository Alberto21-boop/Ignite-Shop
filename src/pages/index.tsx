import {
  HomeContainer,
  Product,
  SliderContainer,
} from "@componet/styles/pages/home";
import Image from "next/image";
import Head from "next/head";
import { stripe } from "@componet/lib/stripe";
import { GetStaticProps } from "next";
import { Stripe } from "stripe";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { CartButton } from "@componet/components/CartButton";
import { useCart } from "@componet/hooks/useCart";
import { IProduct } from "@componet/context/CartContext";
import { MouseEvent } from "react";

interface HomeProps {
  products: IProduct[];
}

export default function Home({ products }: HomeProps) {
  const [emblaRef] = useEmblaCarousel({
    align: "start",
    skipSnaps: false,
    dragFree: true,
  });

  const { addToCart } = useCart();

  function handleAddToCart(
    e: MouseEvent<HTMLButtonElement>,
    product: IProduct
  ) {
    e.preventDefault();
    addToCart(product);
  }

  return (
    <>
      <Head>
        <title>Home | Ignite Shop</title>
      </Head>

      <div style={{ overflow: "hidden", width: "100%" }}>
        <HomeContainer>
          <div className="embla" ref={emblaRef}>
            <SliderContainer className="emblar__container container">
              {products.map((products) => {
                return (
                  <Link
                    href={`/product/${products.id}`}
                    key={products.id}
                    legacyBehavior={true}
                    //{prefetch={false}} não me pergunte o porque, mas se eu coloco o prefetch da ruin no link
                  >
                    <Product className="emblar__slide">
                      <Image
                        src={products.imageUrl}
                        width={520}
                        height={480}
                        alt="Camisa 1"
                      />

                      <footer>
                        <div>
                          <strong>{products.name}</strong>
                          <span>{products.price}</span>
                        </div>
                        <CartButton
                          color="green"
                          size="large"
                          onClick={(e) => handleAddToCart(e, products)}
                        />
                      </footer>
                    </Product>
                  </Link>
                );
              })}
            </SliderContainer>
          </div>
        </HomeContainer>
      </div>
    </>
  );
}

// é neste trecho de código que estamos fazendo a requisição da API
// ou seja é aqui que bate na API lá na pasta lib

export const getStaticProps: GetStaticProps = async () => {
  // devemos trocar o getServerSideProps por getStaticProps
  const response = await stripe.products.list({
    expand: ["data.default_price"],
  });

  const products = response.data.map((products) => {
    const price = products.default_price as Stripe.Price;
    return {
      id: products.id,
      name: products.name,
      imageUrl: products.images[0],
      price: new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format((price.unit_amount as number) / 100),
    };
  });

  return {
    props: {
      products,
    },
    revalidate: 60 * 60 * 2,
  };
};
