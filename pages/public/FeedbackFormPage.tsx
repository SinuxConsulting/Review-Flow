import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { dataService } from '../../services/dataService';
import { Business, LowRatingQuestion } from '../../types';
import StarRating from '../../components/StarRating';
import { Camera, Send, X } from 'lucide-react';

const FeedbackFormPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const rating = parseInt(searchParams.get('rating') || '0');
  const source = (searchParams.get('src') || '').trim();

  const [business, setBusiness] = useState<Business | null>(null);
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (slug) {
      const b = dataService.getBusinessBySlug(slug);
      if (b) setBusiness(b);
    }
  }, [slug]);

  const questions = useMemo(() => (business?.lowRatingQuestions || []) as LowRatingQuestion[], [business?.id]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && photos.length < 3) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos([...photos, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
  };

  const exitTo = () => {
    if (!business?.exitRedirectUrl) return navigate(`/r/${slug}`);
    window.location.href = business.exitRedirectUrl;
  };

  const setSingle = (qid: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const toggleMultiple = (qid: string, value: string) => {
    setAnswers((prev) => {
      const current = (prev[qid] as string[]) || [];
      const exists = current.includes(value);
      const next = exists ? current.filter(v => v !== value) : [...current, value];
      return { ...prev, [qid]: next };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment || !business) return;

    setIsSubmitting(true);
    dataService.addFeedback({
      source,
      businessId: business.id,
      rating,
      comment,
      name,
      email,
      photos,
      answers
    });

    setTimeout(() => {
      const qp = new URLSearchParams();
      qp.set('rating', String(rating));
      if (source) qp.set('src', source);
      navigate(`/r/${slug}/thanks?${qp.toString()}`);
    }, 800);
  };

  if (!business) return null;

    return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: business.theme.customerBackground || '#ffffff' }}>
      <div className="w-full max-w-md bg-white rounded-2xl md:shadow-lg relative">
        <button
          type="button"
          onClick={exitTo}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-50 text-gray-400 hover:text-gray-700"
          aria-label="Exit"
        >
          <X size={18} />
        </button>

        <div className="p-6 md:p-8 space-y-5">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-gray-900">{business.name}</h1>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">G</div>
              <div>
                <div className="font-medium text-gray-700">Guest</div>
                <div className="text-xs text-gray-400">Posting privately to {business.name}.</div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <StarRating rating={rating} interactive={false} size={28} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <textarea
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-opacity-50 min-h-[140px] resize-none"
                style={{ '--tw-ring-color': business.theme.accentColor } as any}
                placeholder="Share details of your own experience at this place"
              />
            </div>

            <div>
              <button
                type="button"
                className="w-full py-3 rounded-xl border border-gray-200 text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition"
                onClick={() => document.getElementById('rf-photo-input')?.click()}
              >
                <Camera size={16} />
                Add photos
              </button>
              <input id="rf-photo-input" type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              {photos.length > 0 && (
                <div className="mt-3 flex gap-2">
                  {photos.map((p, i) => (
                    <div key={i} className="w-16 h-16 rounded-lg border overflow-hidden">
                      <img src={p} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {questions.length > 0 && (
              <div className="space-y-4">
                {questions.map((q) => (
                  <div key={q.id} className="space-y-2">
                    <p className="text-sm font-semibold text-gray-800">{q.prompt}</p>

                    {q.type === 'single' ? (
                      <div className="flex flex-wrap gap-2">
                        {q.options.map((opt, idx) => {
                          const selected = answers[q.id] === opt;
                          return (
                            <button
                              type="button"
                              key={idx}
                              onClick={() => setSingle(q.id, opt)}
                              className={`px-3 py-1.5 rounded-full text-sm border transition ${
                                selected ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {q.options.map((opt, idx) => {
                          const selected = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]).includes(opt) : false;
                          return (
                            <button
                              type="button"
                              key={idx}
                              onClick={() => toggleMultiple(q.id, opt)}
                              className={`px-3 py-1.5 rounded-full text-sm border transition ${
                                selected ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">Contact Information</p>
                <span className="text-xs text-red-500 font-medium">* Required</span>
              </div>
              <p className="text-xs text-gray-500">
                To maintain the integrity of our feedback and prevent fake reviews, please verify your details.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-opacity-50"
                  style={{ '--tw-ring-color': business.theme.accentColor } as any}
                  placeholder="Name"
                />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-opacity-50"
                  style={{ '--tw-ring-color': business.theme.accentColor } as any}
                  placeholder="Email"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={exitTo}
                className="px-5 py-2.5 rounded-full border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-full text-sm font-semibold text-white shadow-sm disabled:opacity-50 transition-all flex items-center gap-2"
                style={{ backgroundColor: business.theme.accentColor }}
              >
                {isSubmitting ? 'Posting...' : 'Post'}
                {!isSubmitting && <Send size={16} />}
              </button>
            </div>
          </form>

          <div className="pt-2 text-center text-[11px] text-gray-400">
            Developed by <span style={{ color: business.theme.accentColor }} className="font-medium">Sinux Consulting</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackFormPage;
