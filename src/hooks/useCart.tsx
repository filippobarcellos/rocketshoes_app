import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      const productExistInCart = cart.find(
        (product) => product.id === productId
      );

      if (!productExistInCart) {
        const { data } = await api.get(`/products/${productId}`);
        if (stock.amount > 0) {
          const product = { ...data, amount: 1 };
          const newCart = [...cart, product];
          setCart(newCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        } else {
          toast.error('Não temos mais estoque do produto que você deseja.');
        }
      }

      if (productExistInCart) {
        const amount = productExistInCart.amount + 1;

        updateProductAmount({ productId, amount });
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.find((product) => product.id === productId);

      if (!productExists) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const newCart = cart.filter((product) => product.id !== productId);
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const productExists = cart.find((product) => product.id === productId);

      if (!productExists || amount < 1) {
        return toast.error('Erro na alteração de quantidade do produto');
      }

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);
      const amountInStock = stock.amount;

      if (amount > amountInStock) {
        return toast.error('Quantidade solicitada fora de estoque');
      }

      const newCart = cart.map((product) =>
        product.id === productId ? { ...product, amount } : product
      );

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
