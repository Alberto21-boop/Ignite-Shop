import { globalStyles } from "@componet/styles/global";
import type { AppProps } from "next/app";
import { Header } from "@componet/components/Header";
import { Container } from "@componet/components/Header/styles";
import { CartContextProvider } from "@componet/context/CartContext";

globalStyles();

export default function App({ Component, pageProps }: AppProps) {
  return (
    <CartContextProvider>
      <Container>
        <Header />
        <Component {...pageProps} />
      </Container>
    </CartContextProvider>
  );
}
