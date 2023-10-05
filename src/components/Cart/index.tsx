import * as Dialog from "@radix-ui/react-dialog";
import { X } from "phosphor-react";
import { CartButton } from "../CartButton";
import {
  CartClose,
  CartContent,
  CartFinalization,
  CartProduct,
  CartProductDetails,
  CartProductImage,
  FinalizationDetails,
} from "./styles";
import Image from "next/image";
import tshirt from "../../assets/tshirt.png";
import { useCart } from "@componet/hooks/useCart";

export function Cart() {
  const { cartItems, removeCartItem } = useCart();
  const cartQuantity = cartItems.length;

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <CartButton />
      </Dialog.Trigger>

      <Dialog.Portal>
        <CartContent>
          <CartClose>
            <X size={24} weight="bold" />
          </CartClose>
          <h2>Sacola de compras</h2>

          <section>
            {cartQuantity <= 0 && (
              <p>Parece que seu carrinho esta vazio : ( </p>
            )}

            {cartItems.map((cartItem) => (
              <CartProduct key={cartItem.id}>
                <CartProductImage>
                  <Image
                    width={100}
                    height={93}
                    alt=""
                    src={cartItem.imageUrl}
                  />
                </CartProductImage>
                <CartProductDetails>
                  <p>{cartItem.name}</p>
                  <strong>{cartItem.price}</strong>
                  <button onClick={() => removeCartItem(cartItem.id)}>
                    Remover
                  </button>
                </CartProductDetails>
              </CartProduct>
            ))}
          </section>

          <CartFinalization>
            <FinalizationDetails>
              <div>
                <span>Quantidade</span>
                <p>
                  {cartQuantity} {cartQuantity > 1 ? "itens" : "item"}
                </p>
              </div>
              <div>
                <span>Valor Total</span>
                <p>R$ 100,00</p>
              </div>
            </FinalizationDetails>
            <button>Finalizar Compra</button>
          </CartFinalization>
        </CartContent>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
