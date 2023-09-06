import { globalStyles } from '@componet/styles/global'
import type { AppProps } from 'next/app'
import logo from '../assets/logo.svg'
import { Container, Header } from '@componet/styles/pages/app';
import Image from 'next/image';


globalStyles();

export default function App({ Component, pageProps }: AppProps) {

  return (
    <Container>
      <Header>
        <Image src={logo} alt="" />
      </Header>
      <Component {...pageProps} />
    </Container>
  );
}
