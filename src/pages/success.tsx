import { ImageContainer } from "@componet/styles/pages/productus";
import { SuccessContainer } from "@componet/styles/pages/success";
import Link from "next/link";

export default function Success() {
  return (
    <SuccessContainer>
      <h1>Compra Efetuada !</h1>

      <ImageContainer></ImageContainer>

      <p>
        Uhuul <strong>Diego Fernandes</strong>, sua{" "}
        <strong>compra de 3 camisetas</strong> já está a caminho da sua casa.
      </p>

      <Link href="/">Voltar ao catalogo</Link>
    </SuccessContainer>
  );
}
