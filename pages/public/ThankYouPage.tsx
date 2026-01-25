import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, X } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { Business } from '../../types';

const ThankYouPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<Business | null>(null);
  const rating = parseInt(searchParams.get('rating') || '0');

  useEffect(() => {
    if (slug) {
      const b = dataService.getBusinessBySlug(slug);
      if (b) setBusiness(b);
    }
  }, [slug]);

  if (!business) return null;

  const exitTo = () => {
    if (business.exitRedirectUrl) {
      window.location.href = business.exitRedirectUrl;
    } else {
      navigate(`/r/${slug}`);
    }
  };

    return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: business.theme.customerBackground || '#ffffff' }}>
      <div className="w-full max-w-md bg-white rounded-2xl md:shadow-lg p-8 text-center relative">
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

        <div className="p-3 bg-green-50 rounded-full text-green-500 mx-auto w-fit mb-5">
          <CheckCircle2 size={44} />
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">Thank You</h1>
        <p className="text-gray-600 mb-6 text-sm">
          {rating >= business.thresholdRating
            ? 'We appreciate you sharing your experience on Google!'
            : 'Your feedback has been received and will be reviewed by our management team.'}
        </p>

        {rating >= business.thresholdRating && (
          <a
            href={business.googleReviewUrl}
            target="_blank"
            className="inline-block mb-4 text-sm font-medium hover:underline"
            style={{ color: business.theme.accentColor }}
          >
            Didn't open? Click here to go to Google
          </a>
        )}

        <div className="flex justify-center mt-2">
          <button
            type="button"
            onClick={exitTo}
            className="px-8 py-2.5 rounded-full font-semibold text-white"
            style={{ backgroundColor: business.theme.accentColor }}
          >
            Done
          </button>
        </div>

        <div className="pt-6 text-center text-[11px] text-gray-400">
          Developed by <span style={{ color: business.theme.accentColor }} className="font-medium">Sinux Consulting</span>
        </div>
      </div>
    </div>
  );
};

export default ThankYouPage;
