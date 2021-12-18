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
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      let product = await api.get<Product>(`products/${productId}`)
      let stock = await api.get<Stock>(`stock/${productId}`)

      if (stock.data?.amount > 0) {
        if (product.data) {
          if (!cart.find(product => product.id === productId)) {
            setCart(oldState => {
              let newState = [...oldState, { ...product.data }]
              localStorage.setItem('@RocketShoes:cart', JSON.stringify(newState))
              return newState
            })
          }

          updateProductAmount({ productId: productId, amount: 1 })
        }
      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      setCart(oldState => {
        let newState = [...oldState.filter(product => {
          if (product.id === productId) {
            updateProductAmount({ productId: productId, amount: product.amount })
            return false
          }
          return true
        })]
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newState))
        return newState
      })
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      let product = cart.find(product => product.id === productId)
      if (!product) return
      if (product.amount + amount <= 0) {
        return
      }

      let stock = await api.get<Stock>(`stock/${productId}`)

      if (amount <= stock.data.amount) {
        setCart(oldState => {
          let newState = oldState.map(product => {
            if (product.id === productId) {
              product.amount += amount;
            }
            return product
          })
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newState))
          return newState
        })
      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }
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
