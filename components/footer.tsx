import { CoffeeIcon, Heart } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t">
      <div className="flex flex-col items-center justify-center gap-2 py-6">
        <CoffeeIcon className="h-5 w-5 text-neutral-500" />

        <p className="flex items-center gap-1 text-xs text-neutral-500">
          La Commune · hecho con amor
          <Heart className="h-3 w-3 fill-current text-neutral-400" />
        </p>
      </div>
    </footer>
  );
};
