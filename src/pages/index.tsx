import { HomeContainer, Product } from "@componet/styles/pages/home";
import Image from "next/image";

import { useKeenSlider } from 'keen-slider/react'

import 'keen-slider/keen-slider.min.css';
import { stripe } from "@componet/lib/stripe";
import { GetStaticProps } from "next";
import { Stripe } from 'stripe';

interface HomeProps {
  products: {
    id: string;
    name: string;
    imageUrl: string;
    price: number;
  }[]
}

export default function Home({ products }: HomeProps) {
  const [sliderRef] = useKeenSlider({
    slides: {
      perView: 3,
      spacing: 48,
    }
  });

  return (
    <HomeContainer ref={sliderRef} className="keen-slider">
      {products.map(products => {
        return (
          <Product key={products.id} className="keen-slider__slide">
            <Image src={products.imageUrl} width={520} height={480} alt="Camisa 1" />

            <footer>
              <strong>{products.name}</strong>
              <span>{products.price}</span>
            </footer>
          </Product>
        )
      })}
    </HomeContainer>
  )
}

// é neste trecho de código que estamos fazendo a requisição da API
// ou seja é aqui que bate na API lá na pasta lib

export const getStaticProps: GetStaticProps = async () => {
  // devemos trocar o getServerSideProps por getStaticProps
  const response = await stripe.products.list({
    expand: ['data.default_price']
  })

  const products = response.data.map(products => {
    const price = products.default_price as Stripe.Price
    return {
      id: products.id,
      name: products.name,
      imageUrl: products.images[0],
      price: price.unit_amount,
    }
  });

  return {
    props: {
      products
    },
    revalidate: 60 * 60 * 2,
  }
}
