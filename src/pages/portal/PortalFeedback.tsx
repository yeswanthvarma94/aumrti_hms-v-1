import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";
import type { PortalSession } from "./PortalLogin";

const PortalFeedback: React.FC<{ session: PortalSession }> = ({ session }) => {
  const [overall, setOverall] = useState(0);
  const [doctor, setDoctor] = useState(0);
  const [nursing, setNursing] = useState(0);
  const [facility, setFacility] = useState(0);
  const [comments, setComments] = useState("");
  const [recommend, setRecommend] = useState<boolean | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (overall === 0) return;
    setLoading(true);

    await supabase.from("patient_feedback").insert({
      hospital_id: session.hospitalId,
      patient_id: session.patientId,
      overall_rating: overall,
      doctor_rating: doctor || null,
      nursing_rating: nursing || null,
      facility_rating: facility || null,
      comments: comments.trim() || null,
      would_recommend: recommend,
    } as any);

    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="px-4 py-16 text-center">
        <div className="text-5xl mb-4">🙏</div>
        <h2 className="text-lg font-bold" style={{ color: "#0F172A" }}>Thank You!</h2>
        <p className="text-sm mt-2" style={{ color: "#64748B" }}>
          Your feedback helps us improve our services.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <h2 className="text-base font-bold mb-1" style={{ color: "#0F172A" }}>Share Your Feedback</h2>
      <p className="text-xs mb-4" style={{ color: "#64748B" }}>
        Help us improve by rating your experience
      </p>

      <div className="space-y-4">
        <RatingRow label="Overall Experience *" value={overall} onChange={setOverall} />
        <RatingRow label="Doctor" value={doctor} onChange={setDoctor} />
        <RatingRow label="Nursing Staff" value={nursing} onChange={setNursing} />
        <RatingRow label="Facilities" value={facility} onChange={setFacility} />

        {/* Would recommend */}
        <div className="bg-white rounded-xl p-3.5" style={{ border: "1px solid #E2E8F0" }}>
          <p className="text-xs font-bold mb-2" style={{ color: "#0F172A" }}>Would you recommend us?</p>
          <div className="flex gap-2">
            {[true, false].map((val) => (
              <button
                key={String(val)}
                onClick={() => setRecommend(val)}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  border: `1.5px solid ${recommend === val ? "#0E7B7B" : "#E2E8F0"}`,
                  background: recommend === val ? "#EEF9F9" : "#FFFFFF",
                  color: recommend === val ? "#0E7B7B" : "#64748B",
                }}
              >
                {val ? "👍 Yes" : "👎 No"}
              </button>
            ))}
          </div>
        </div>

        {/* Comments */}
        <div className="bg-white rounded-xl p-3.5" style={{ border: "1px solid #E2E8F0" }}>
          <p className="text-xs font-bold mb-2" style={{ color: "#0F172A" }}>Comments (optional)</p>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Tell us more about your experience..."
            rows={3}
            className="w-full text-sm px-3 py-2 rounded-lg outline-none resize-none"
            style={{ border: "1.5px solid #E2E8F0", color: "#0F172A" }}
            maxLength={500}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || overall === 0}
          className="w-full font-bold text-[15px] text-white rounded-xl disabled:opacity-40 active:scale-[0.97] transition-transform"
          style={{ height: 48, background: "#0E7B7B" }}
        >
          {loading ? "Submitting..." : "Submit Feedback"}
        </button>
      </div>
    </div>
  );
};

const RatingRow: React.FC<{ label: string; value: number; onChange: (v: number) => void }> = ({ label, value, onChange }) => (
  <div className="bg-white rounded-xl p-3.5" style={{ border: "1px solid #E2E8F0" }}>
    <p className="text-xs font-bold mb-2" style={{ color: "#0F172A" }}>{label}</p>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onChange(n)} className="p-0.5">
          <Star
            size={28}
            fill={n <= value ? "#F59E0B" : "none"}
            color={n <= value ? "#F59E0B" : "#CBD5E1"}
          />
        </button>
      ))}
    </div>
  </div>
);

export default PortalFeedback;
