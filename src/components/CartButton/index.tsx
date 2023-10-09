import { Handbag } from "phosphor-react";
import { CartButtonContainer } from "./styles";
import { forwardRef, HTMLAttributes } from "react";

type CartButtonProps = HTMLAttributes<HTMLButtonElement> & {
  color?: "gray" | "green";
  size?: "medium" | "large";
  disabled?: boolean;
};

export const CartButton = forwardRef<HTMLButtonElement, CartButtonProps>(
  ({ color, size, ...rest }, forwardedRef) => {
    return (
      <CartButtonContainer
        color={color}
        size={size}
        {...rest}
        ref={forwardedRef}
      >
        <Handbag weight="bold" />
      </CartButtonContainer>
    );
  }
);

// import { Handbag } from "phosphor-react";
// import { CartButtonContainer } from "./styles";
// import { ComponentProps } from "react";

// type CartButtonProps = ComponentProps<typeof CartButtonContainer>;

// export function CartButton({ ...rest }: CartButtonProps) {
//   return (
//     <CartButtonContainer {...rest}>
//       <Handbag weight="bold" />
//     </CartButtonContainer>
//   );
// }
