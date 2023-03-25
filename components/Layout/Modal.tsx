import { ReactNode } from "react";
import { FiX } from "react-icons/fi";

interface Props {
  children: ReactNode;
  onClose?: () => void;
}
export default function Modal({ children, onClose }: Props) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-20">
      <div className="flex h-full w-96 rounded-2xl">
          {onClose &&
            <FiX
              className="absolute right-5 top-5 h-5 w-5"
              onClick={onClose}
            />}
          <div className="w-full">
          {children}
          </div>
      </div>
    </div>
  );
}