
import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  size?: number;
  interactive?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({ rating, onRatingChange, size = 32, interactive = true }) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-2 justify-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => interactive && onRatingChange?.(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          className={`${interactive ? 'cursor-pointer transform hover:scale-110' : 'cursor-default'} transition-all`}
        >
          <Star
            size={size}
            className={`${
              (hover || rating) >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

export default StarRating;
