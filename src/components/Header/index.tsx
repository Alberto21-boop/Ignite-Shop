import { HeaderContainer } from "./styles";
import logo from "../../assets/logo.svg";
import Image from "next/image";
import Link from "next/link";
import { Cart } from "../Cart";

export function Header() {
  return (
    <HeaderContainer>
      <Link href="/">
        <Image src={logo} alt="" />
      </Link>

      <Cart />
    </HeaderContainer>
  );
}
