import { globalStyles } from '@componet/styles/global'
import type { AppProps } from 'next/app'
import logo from '../assets/logo.svg'
import { Container, Header } from '@componet/styles/pages/app';

globalStyles();

export default function App({ Component, pageProps }: AppProps) {

  return (
    <Container>
      <Header>
        <img src={logo.src} alt="" />
      </Header>
      <Component {...pageProps} />
    </Container>
  );
}
