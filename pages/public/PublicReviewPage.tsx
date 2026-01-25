import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { dataService } from '../../services/dataService';
import { Business } from '../../types';
import StarRating from '../../components/StarRating';
import { ArrowRight, X } from 'lucide-react';

const PublicReviewPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const source = new URLSearchParams(location.search).get('src') || '';
  const [business, setBusiness] = useState<Business | null>(null);
  const [rating, setRating] = useState(0);
  const [isRouting, setIsRouting] = useState(false);

  useEffect(() => {
    if (slug) {
      const b = dataService.getBusinessBySlug(slug);
      if (b) {
        setBusiness(b);
        // Record a scan/view for analytics (per-source attribution)
        dataService.recordScan(b.id, source || undefined);
      }
    }
  }, [slug]);

  if (!business) return <div className="p-10 text-center">Business not found.</div>;

  const exitTo = () => {
    if (!business.exitRedirectUrl) return;
    window.location.href = business.exitRedirectUrl;
  };

  const handleRating = (val: number) => {
    setRating(val);
    if (val < business.thresholdRating) {
      const qp = new URLSearchParams();
      qp.set('rating', String(val));
      if (source) qp.set('src', source);
      setTimeout(() => navigate(`/r/${slug}/feedback?${qp.toString()}`), 600);
    }
  };

  const handleGoToGoogle = () => {
    setIsRouting(true);
    setTimeout(() => {
      // Record redirect event before leaving
      dataService.recordRedirect(business.id, rating, source || undefined);
      window.open(business.googleReviewUrl, '_blank');
      const qp = new URLSearchParams();
      qp.set('rating', String(rating));
      if (source) qp.set('src', source);
      navigate(`/r/${slug}/thanks?${qp.toString()}`);
    }, 1200);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: business.theme.customerBackground || '#ffffff' }}>
      <div className="w-full max-w-md bg-white rounded-2xl md:shadow-lg flex flex-col relative">
        {!!business.exitRedirectUrl && (
          <button
            type="button"
            onClick={exitTo}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-50 text-gray-400 hover:text-gray-700"
            aria-label="Exit"
          >
            <X size={18} />
          </button>
        )}

        <div className="p-8 flex flex-col items-center text-center space-y-6">
          {business.theme.logoUrl ? (
            <img src={business.theme.logoUrl} alt={business.name} className="h-16 w-auto object-contain" />
          ) : (
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-xl font-bold text-gray-400">
              {business.name.charAt(0)}
            </div>
          )}

          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{business.name}</h1>
            <p className="text-sm text-gray-500 mt-1">Share your experience with us</p>
          </div>

          {!isRouting && rating < business.thresholdRating ? (
            <div className="w-full py-8 border-y border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-6">How would you rate us?</p>
              <StarRating rating={rating} onRatingChange={handleRating} />
            </div>
          ) : rating >= business.thresholdRating && !isRouting ? (
            <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="py-6 border-y border-gray-100">
                <StarRating rating={rating} interactive={false} />
                <p className="mt-4 text-gray-600">You selected {rating} stars. Thank you!</p>
              </div>

              <div className="space-y-4">
                <p className="text-gray-700">
                  We appreciate your support. Could you please share your review on Google to help us reach more customers?
                </p>
                <button
                  onClick={handleGoToGoogle}
                  className="w-full py-3 px-6 rounded-full font-semibold text-white transition-all flex items-center justify-center gap-2"
                  style={{ backgroundColor: business.theme.accentColor }}
                >
                  Post to Google
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          ) : isRouting ? (
            <div className="flex flex-col items-center py-12 space-y-4">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-[color:var(--rf-accent)] rounded-full animate-spin"></div>
              <p className="text-lg font-medium text-gray-700">Opening Google Reviews...</p>
              <p className="text-sm text-gray-500">You'll be redirected in a moment.</p>
            </div>
          ) : null}
        </div>

        <div className="mt-auto p-4 text-center border-t border-gray-50">
          <p className="text-[10px] text-gray-300 uppercase tracking-widest">Powered by Sinux</p>
        </div>
      </div>
    </div>
  );
};

export default PublicReviewPage;
