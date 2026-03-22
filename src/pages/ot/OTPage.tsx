import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import OTSchedulePanel from "@/components/ot/OTSchedulePanel";
import OTCaseWorkspace from "@/components/ot/OTCaseWorkspace";
import OTInfoPanel from "@/components/ot/OTInfoPanel";
import BookOTModal from "@/components/ot/BookOTModal";

export interface OTRoom {
  id: string;
  name: string;
  type: string;
}

export interface OTSchedule {
  id: string;
  hospital_id: string;
  ot_room_id: string;
  patient_id: string;
  admission_id: string | null;
  surgeon_id: string;
  anaesthetist_id: string | null;
  scrub_nurse_id: string | null;
  surgery_name: string;
  surgery_category: string;
  scheduled_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  estimated_duration_minutes: number;
  status: string;
  anaesthesia_type: string;
  booking_notes: string | null;
  cancellation_reason: string | null;
  post_op_diagnosis: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  implants_consumables: any;
  created_at: string;
  patient?: { full_name: string; uhid: string; blood_group: string | null; allergies: string | null; chronic_conditions: string[] | null; gender: string | null; dob: string | null };
  surgeon?: { full_name: string };
  anaesthetist?: { full_name: string };
}

const OTPage: React.FC = () => {
  const { toast } = useToast();
  const [rooms, setRooms] = useState<OTRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [schedules, setSchedules] = useState<OTSchedule[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [bookModalTime, setBookModalTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    const { data } = await supabase
      .from("ot_rooms")
      .select("id, name, type")
      .eq("is_active", true)
      .order("name");
    if (data && data.length > 0) {
      setRooms(data);
      if (!selectedRoomId) setSelectedRoomId(data[0].id);
    } else {
      // Auto-create default rooms
      const hid = (await supabase.rpc("get_user_hospital_id")) as any;
      const hospitalId = hid?.data;
      if (hospitalId) {
        const defaults = [
          { hospital_id: hospitalId, name: "OT-1 (Major)", type: "major" },
          { hospital_id: hospitalId, name: "OT-2 (Minor)", type: "minor" },
          { hospital_id: hospitalId, name: "OT-3 (Emergency)", type: "emergency" },
        ];
        const { data: created } = await supabase.from("ot_rooms").insert(defaults).select("id, name, type");
        if (created) {
          setRooms(created);
          setSelectedRoomId(created[0].id);
        }
      }
    }
  }, [selectedRoomId]);

  const fetchSchedules = useCallback(async () => {
    if (!selectedRoomId) return;
    setLoading(true);
    const { data } = await supabase
      .from("ot_schedules")
      .select("*, patient:patients(full_name, uhid, blood_group, allergies, chronic_conditions, gender, dob), surgeon:users!ot_schedules_surgeon_id_fkey(full_name), anaesthetist:users!ot_schedules_anaesthetist_id_fkey(full_name)")
      .eq("ot_room_id", selectedRoomId)
      .eq("scheduled_date", selectedDate)
      .order("scheduled_start_time");
    setSchedules((data as any) || []);
    setLoading(false);
  }, [selectedRoomId, selectedDate]);

  useEffect(() => { fetchRooms(); }, []);
  useEffect(() => { if (selectedRoomId) fetchSchedules(); }, [selectedRoomId, selectedDate, fetchSchedules]);

  const selectedSchedule = schedules.find((s) => s.id === selectedScheduleId) || null;

  const handleDateChange = (dir: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const handleBookSlot = (time?: string) => {
    setBookModalTime(time || null);
    setBookModalOpen(true);
  };

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      <OTSchedulePanel
        rooms={rooms}
        selectedRoomId={selectedRoomId}
        onSelectRoom={setSelectedRoomId}
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
        onSetToday={() => setSelectedDate(new Date().toISOString().split("T")[0])}
        schedules={schedules}
        selectedScheduleId={selectedScheduleId}
        onSelectSchedule={setSelectedScheduleId}
        onBookSlot={handleBookSlot}
        loading={loading}
      />
      <OTCaseWorkspace
        schedule={selectedSchedule}
        onRefresh={fetchSchedules}
      />
      <OTInfoPanel
        schedules={schedules}
        selectedDate={selectedDate}
        onSelectSchedule={setSelectedScheduleId}
      />
      {bookModalOpen && (
        <BookOTModal
          rooms={rooms}
          selectedRoomId={selectedRoomId}
          selectedDate={selectedDate}
          prefillTime={bookModalTime}
          onClose={() => setBookModalOpen(false)}
          onBooked={() => { setBookModalOpen(false); fetchSchedules(); }}
        />
      )}
    </div>
  );
};

export default OTPage;
